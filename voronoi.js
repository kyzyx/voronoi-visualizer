goog.require("goog.structs");
goog.require("goog.structs.Map");
goog.require("goog.structs.PriorityQueue");
goog.require("goog.structs.AvlTree");

var SITE = 1;
var ARC  = 2;

Voronoi = function(points) {
    var currarc;
    var pt;
    // Sweep line events
    var pq = new goog.structs.PriorityQueue();
    // A pq event is of two types: SITE or ARC
    // Events have an event coordinate x, either a point (for a SITE) or an arc (for an ARC),
    // a type, and a valid.
    //     SITE object: x,y
    //     ARC object: x,y are the coordinates of the point
    //                d is the index into beach of the arc
    //                next, prev have next and previous pointers

    // A sorted structure containing the beach line
    // The indices are managed manually due to the difficulty in computing the
    // nearest parabolic arc
    // Thus we use this as a linked-list-sorted-array hybrid structure
    var beach = new goog.structs.AvlTree(function(a,b){
        return a.d - b.d;
    });
    // A map of arcs to events, for easy invalidation
    var qmap = new goog.structs.Map;

    // A map of pairs of vertices to edge endpoints
    var edgemap = new goog.structs.Map;
    // A list of edges ({p1,p2});
    var edges = [];
    var unboundededges = [];
    var point = points;

    // Initialize event queue
    for (var i = 0; i < points.length; ++i) {
        var ev = {x:points[i].x,
                  y:points[i].y,
                  p:points[i],
                  type:SITE, valid:true};
        pq.enqueue(points[i].x, ev);
    }
    // Current sweep line location
    var currx = pq.isEmpty()?0:pq.peek().x;
    // Clear debug screen
    $("#beach").get(0).value = "";
    $("#beach2").get(0).value = "";
    $("#evtq").get(0).value = "";

    var that = {
        arcKey:function(arc) {
            var tmp = {i:arc.p, n:arc.next?arc.next.p:arc.next, p:arc.prev?arc.prev.p:arc.prev};
            tmp.toString = function(){return JSON.stringify(tmp)};
            return tmp;
        },
        addEvent:function(arc) {
            if (!arc.prev || !arc.next) return;
            // If the site is in front of both of its neighbors, then it can't
            // be hidden.
            if (arc.p.x > arc.prev.p.x && arc.p.x > arc.next.p.x) return;
            var ccenter = circumcenter(arc.p, arc.prev.p, arc.next.p);
            // If sites are collinear, then the edges cannot intersect
            if (!ccenter) return;
            var cradius = circumradius(arc.p, arc.prev.p, arc.next.p);
            var x = ccenter.x + cradius;
            // If this event has passed, it is invalid
            if (x < currx) return;
            var ev = {x:x, arc:arc, v:ccenter, type:ARC, valid:true};
            qmap.set(arc.key, ev);
            pq.enqueue(ev.x, ev);
        },
        isValidArcEvent:function(arc) {
            var ccenter = circumcenter(arc.p, arc.prev.p, arc.next.p);
            if (!ccenter) return false;
            var cradius = circumradius(arc.p, arc.prev.p, arc.next.p);
            var ul = tangentCircle(arc.p, arc.next.p, currx);
            var ll = tangentCircle(arc.prev.p, arc.p, currx);
            if (dist2(ul, ccenter) > cradius*cradius || dist2(ll, ccenter) > cradius*cradius) return false;
            return true;
        },

        // Perform a binary search by walking down the AVL tree
        // We have to dig into private variables here to get to the tree structure!
        locateBeach:function(x, y) {
            var curr = beach.root_;
            while (true) {
                // "break point", i.e. intersection of two arcs, is
                // equidistant from the two points and the sweep line.
                // Therefore, we just calculate the center of a circle
                // passing through the two points and tangent to the line
                var ul = Number.POSITIVE_INFINITY;
                var ll = Number.NEGATIVE_INFINITY;
                if (curr.value.next) {
                    ul = tangentCircle(curr.value.p, curr.value.next.p, x).y;
                }
                if (curr.value.prev) {
                    ll = tangentCircle(curr.value.prev.p, curr.value.p, x).y;
                }
                if (y < ll && curr.left) {
                    curr = curr.left;
                }
                else if (y > ul && curr.right) {
                    curr = curr.right;
                }
                else {
                    return curr.value;
                }
            }
        },
        compute:function() {
            while (!pq.isEmpty()) {
                that.step();
            }
        },
        step:function() {
            if (!pq.isEmpty()) {
                var ev;
                do {
                    ev = pq.dequeue();
                } while (!pq.isEmpty() && !ev.valid);
                if (pq.isEmpty()) return false;
                currx = ev.x;
                console.log("EVENT: " + currx);
                pt = ev.p;
                if (ev.type == SITE) {
                    if (beach.getCount() == 0) {
                        beach.add({p:pt, d:0, next:null, prev:null});
                        return true;
                    }
                    // Search beach for arc with same y-coord
                    var intersect = that.locateBeach(pt.x, pt.y);
                    currarc = intersect;
                    var d = intersect.d;

                    var nextd, prevd;
                    var next = intersect.next;
                    var prev = intersect.prev;
                    if (next)      nextd = (d + next.d)/2;
                    else if (prev) nextd = prev.d + 2*(d-prev.d);
                    else           nextd = 4096;
                    if (prev)      prevd = (d + prev.d)/2;
                    else if (next) prevd = next.d - 2*(next.d-d);
                    else           prevd = -4096;

                    // Remove intersected arc
                    beach.remove(intersect);

                    // Insert two new subarcs plus the newly constructed arc
                    var lowarc = 
                        {p:intersect.p, d:prevd, prev:intersect.prev};
                    var uparc = 
                        {p:intersect.p, d:nextd, next:intersect.next};
                    var newarc = {p:pt, d:d, next:uparc, prev:lowarc}
                    lowarc.next = newarc;
                    uparc.prev = newarc;
                    if (intersect.prev) intersect.prev.next = lowarc;
                    if (intersect.next) intersect.next.prev = uparc;
                    newarc.key = that.arcKey(newarc);
                    lowarc.key = that.arcKey(lowarc);
                    uparc.key = that.arcKey(uparc);
                    beach.add(newarc);
                    beach.add(lowarc);
                    beach.add(uparc);

                    // Invalidate ARC event with old arc
                    var delev = qmap.get(intersect.key);
                    if (delev) delev.valid = false;

                    // Add two new ARC events
                    that.addEvent(uparc);
                    that.addEvent(lowarc);
                }
                else if (ev.type == ARC) {
                    if (!that.isValidArcEvent(ev.arc)) {
                        return that.step();
                    }
                    currarc = null;
                    // Record edge information
                    var vp1 = {x:ev.arc.next.x, y:ev.arc.next.y};
                    var vp2 = {x:ev.arc.prev.x, y:ev.arc.prev.y};
                    var vp3 = {x:ev.arc.x, y:ev.arc.y};
                    var e1 = {p1:vp1,p2:vp3};
                    var e2 = {p1:vp3,p2:vp3};
                    var e3 = {p1:vp1,p2:vp2};
                    var ep1 = edgemap.get(e1);
                    var ep2 = edgemap.get(e2);
                    var ep3 = edgemap.get(e3);
                    if (ep1) {
                        edges.push({p1:ev.v, p2:ep1});
                        edgemap.remove(e1);
                    }
                    else edgemap.set(e1, ev.v);
                    if (ep2) {
                        edges.push({p1:ev.v, p2:ep2});
                        edgemap.remove(e2);
                    }
                    else edgemap.set(e2, ev.v);
                    if (ep3) {
                        edges.push({p1:ev.v, p2:ep3});
                        edgemap.remove(e3);
                    }
                    else edgemap.set(e3, ev.v);
                    // Delete the arc that disappeared
                    beach.remove(ev.arc);
                    // Invalidate 3 ARC events with old arc, and add new events
                    if (ev.arc.prev) {
                        var delev = qmap.get(ev.arc.prev.key);
                        if (delev) delev.valid = false;
                        ev.arc.prev.next = ev.arc.next;
                        that.addEvent(ev.arc.prev);
                    }
                    if (ev.arc.next) {
                        var delev = qmap.get(ev.arc.next.key);
                        if (delev) delev.valid = false;
                        ev.arc.next.prev = ev.arc.prev;
                        that.addEvent(ev.arc.next);
                    }
                    var delev = qmap.get(ev.arc.key);
                    if (delev) delev.valid = false;
                }
                return true;
            }
            return false;
        },
        debug:function(draw) {
            var bbox = draw.bounds();
            // Highlight points on beach
            $("#beach").get(0).value = "";
            $("#beach2").get(0).value = "";
            $("#evtq").get(0).value = "";
            for (var c = beach.getMinimum(); c; c = c.next) {
                draw.drawPoint(c.p, "#ffff00");
                $("#beach").get(0).value += c.d + ": " + "(" + c.p.x + "," + c.p.y + ")\n";
            }
            beach.inOrderTraverse(function(c) {
                $("#beach2").get(0).value += c.d + ": " +  "(" + c.p.x + "," + c.p.y + ")\n";
            });
            var k = pq.getKeys();
            var v = pq.getValues();
            var kv = [];
            for (var i = 0; i < k.length; ++i) {
                kv[i] = {k:k[i], v:v[i]};
            }
            kv.sort(function(a,b) {return a.k - b.k});
            for (var i = 0; i < kv.length; ++i) {
                var s = "";
                if (!kv[i].v.valid) s += "--";
                s += kv[i].k + ":";
                if (kv[i].v.type == ARC) {
                    s += " Arc " + kv[i].v.arc.d + " ";
                    s += kv[i].v.arc.p.x + "," + kv[i].v.arc.p.y;
                }
                else {
                    s += " Point ";
                    s += kv[i].v.p.x + "," + kv[i].v.p.y;
                }
                $("#evtq").get(0).value += s + "\n";
            }
            for (var i = 0; i < point.length; ++i) {
                var c = point[i];
                var dx = currx - bbox[0];
                var dx2 = c.x - bbox[0];
                var yy = Math.sqrt(dx*dx - dx2*dx2);
                var ul = {x:bbox[0], y:c.y+yy};
                var ll = {x:bbox[0], y:c.y-yy};
                draw.drawArc(c, currx, ul, ll, "#ffff00");
            }
        },
        drawBeach:function(draw){
            var bbox = draw.bounds();
            if (beach.getCount() == 0) return;
            else if (beach.getCount() == 1) { 
                var c = beach.getMinimum();
                while (c.next && c.p.x == currx) {
                    c = c.next;
                }
                var dx = currx - bbox[0];
                var dx2 = c.p.x - bbox[0];
                var yy = Math.sqrt(dx*dx - dx2*dx2);
                var ul = {x:bbox[0], y:c.p.y+yy};
                var ll = {x:bbox[0], y:c.p.y-yy};
                draw.drawArc(c.p, currx, ul, ll);
                return;
            }
            var curr = beach.getMinimum();
            var ul = tangentCircle(curr.p, curr.next.p, currx);
            var dx = currx - bbox[0];
            var dx2 = curr.p.x - bbox[0];
            var yy = Math.sqrt(dx*dx - dx2*dx2);
            var ll = {x:bbox[0], y:curr.p.y-yy};
            if (ul.x > bbox[0] && ul.y > bbox[1])
                draw.drawArc(curr.p, currx, ul, ll);
            for (curr = curr.next; curr.next; curr = curr.next) {
                ul = tangentCircle(curr.p, curr.next.p, currx);
                ll = tangentCircle(curr.prev.p, curr.p, currx);
                draw.drawArc(curr.p, currx, ul, ll);
            }
            dx = currx - bbox[0];
            dx2 = curr.p.x - bbox[0];
            yy = Math.sqrt(dx*dx - dx2*dx2);
            ul = {x:bbox[0], y:curr.p.y+yy};
            ll = tangentCircle(curr.prev.p, curr.p, currx);
            if (ll.x > bbox[0] && ll.y < bbox[3])
                draw.drawArc(curr.p, currx, ul, ll);
        },
        halfstep:function() {
            if (pq.isEmpty()) return false;
            currx = (currx + pq.peek().x)/2;
            return true;
        },
        draw:function(draw) {
            // Add bbox edges
            /*unboundededges = [];
            goog.structs.forEach(edgemap, function(v,k,c) {
                // Midpoint of p1,p2
                var m = {x:(k.p1.x+k.p2.x)/2, y:(k.p1.y+k.p2.y)/2};
                // Calculate facing bounding box edges and save the closest
                var closest = Number.POSITIVE_INFINITY;
                var closestp;
                if (m.x < v.x) {
                    closestp = intersection(v, m, {x:bbox[0],y:bbox[1]}, {x:bbox[0],y:bbox[3]});
                    closest = dist2(closestp, v);
                }
                else if (m.x > v.x) {
                    closestp = intersection(v, m, {x:bbox[2],y:bbox[1]}, {x:bbox[2],y:bbox[3]});
                    closest = dist2(closestp,v);
                }
                if (m.y < v.y) {
                    var p = intersection(v, m, {x:bbox[0],y:bbox[1]}, {x:bbox[2],y:bbox[1]});
                    var d = dist2(p, v);
                    if (d < closest) {
                        closest = d;
                        closestp = p;
                    }
                }
                else if (m.y > v.y){
                    var p = intersection(v, m, {x:bbox[0],y:bbox[3]}, {x:bbox[2],y:bbox[3]});
                    var d = dist2(p, v);
                    if (d < closest) {
                        closest = d;
                        closestp = p;
                    }
                }
                unboundededges.push({p1:v,p2:closestp});
            });*/
            draw.update();
            draw.drawVerticalLine(currx);
            //draw.drawEdges(edges);
            //draw.drawEdges(unboundededges);
            that.drawBeach(draw);
        }
    };
    return that;
}
