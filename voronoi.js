goog.require("goog.structs");
goog.require("goog.structs.Map");
goog.require("goog.structs.PriorityQueue");
goog.require("goog.structs.AvlTree");

var SITE = 1;
var ARC  = 2;

Voronoi = function(points, bb) {
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
    // The bounding box of the points
    var bbox = bb;

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

    var that = {
        addEvent:function(arc) {
            if (!arc.prev || !arc.next) return;
            var ccenter = circumcenter(arc.p, arc.prev.p, arc.next.p);
            var cradius = circumradius(arc.p, arc.prev.p, arc.next.p);
            var x = ccenter.x + cradius;
            var ev = {x:x, arc:arc, v:ccenter, type:ARC, valid:true};
            qmap.set(arc, ev);
            pq.enqueue(ev.x, ev);
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
                    ll = tangentCircle(curr.value.p, curr.value.prev.p, x).y;
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
                } while (!ev.valid);
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
                    if (next) nextd = (d + next.d)/2;
                    else      nextd = 100;
                    var prev = intersect.prev;
                    if (prev) prevd = (d + prev.d)/2;
                    else      prevd = -100;

                    // Remove intersected arc
                    beach.remove(intersect);

                    // Insert two new subarcs plus the newly constructed arc
                    var lowarc = 
                        {p:intersect.p, d:prevd, prev:intersect.prev};
                    var uparc = 
                        {p:intersect.p, d:nextd, next:intersect.next};
                    var newarc = {p:pt, d:d, next:uparc, prev:lowarc}
                    console.log(lowarc);
                    console.log(newarc);
                    console.log(uparc);
                    lowarc.next = newarc;
                    uparc.prev = newarc;
                    beach.add(newarc);
                    beach.add(lowarc);
                    beach.add(uparc);
                    // Invalidate 3 ARC events with old arc
                    var delev;
                    if (prev) {
                        delev = qmap.get(prev);
                        if (delev) delev.valid = false;
                    }
                    delev = qmap.get(intersect);
                    if (delev) delev.valid = false;
                    if (next) {
                        delev = qmap.get(next);
                        if (delev) delev.valid = false;
                    }

                    // Add two new ARC events
                    that.addEvent(pq, qmap, lowarc);
                    that.addEvent(pq, qmap, uparc);
                }
                else if (ev.type == ARC) {
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
                    // Invalidate 3 ARC events with old arc
                    if (ev.arc.prev) qmap.get(ev.arc.prev).valid = false;
                    qmap.get(ev.arc).valid = false;
                    if (ev.arc.next) qmap.get(ev.arc.next).valid = false;
                    // Add two new ARC events
                    ev.arc.prev.next = ev.arc.next;
                    ev.arc.next.prev = ev.arc.prev;
                    that.addEvent(pq, qmap, ev.arc.prev);
                    that.addEvent(pq, qmap, ev.arc.next);
                }
                return true;
            }
            return false;
        },
        debug:function(draw) {
            // Highlight points on beach
            $("#beach").get(0).value = "";
            $("#evtq").get(0).value = "";
            for (var c = beach.getMinimum(); c; c = c.next) {
                draw.drawPoint(c.p, "#ffff00");
                $("#beach").get(0).value += c.d + ": " + "(" + c.p.x + "," + c.p.y + ")\n";
            }
            beach.inOrderTraverse(function(c) {
                $("#evtq").get(0).value += c.d + ": " +  "(" + c.p.x + "," + c.p.y + ")\n";
            });
            if (currarc) {
                var c = currarc;
                var dx = currx - bbox[0];
                var dx2 = c.p.x - bbox[0];
                var yy = Math.sqrt(dx*dx - dx2*dx2);
                var ul = {x:bbox[0], y:c.p.y+yy};
                var ll = {x:bbox[0], y:c.p.y-yy};
                draw.drawArc(c.p, currx, ul, ll, "#ffff00");
            }
        },
        drawBeach:function(draw){
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
            draw.drawArc(curr.p, currx, ul, ll);
            for (curr = curr.next; curr.next; curr = curr.next) {
                if (curr.next.p.x == curr.prev.p.x && 
                    curr.next.p.y == curr.prev.p.y) {
                    ul = tangentCircle(curr.p, curr.next.p, currx, false);
                    ll = tangentCircle(curr.p, curr.prev.p, currx, true);
                }
                else {
                    ul = tangentCircle(curr.p, curr.next.p, currx);
                    ll = tangentCircle(curr.p, curr.prev.p, currx);
                }
                draw.drawArc(curr.p, currx, ul, ll);
            }
            dx = currx - bbox[0];
            dx2 = curr.p.x - bbox[0];
            yy = Math.sqrt(dx*dx - dx2*dx2);
            ul = {x:bbox[0], y:curr.p.y+yy};
            ll = tangentCircle(curr.p, curr.prev.p, currx);
            draw.drawArc(curr.p, currx, ul, ll);
        },
        halfstep:function() {
            if (pq.isEmpty()) return false;
            currx = (currx + pq.peek().x)*2./3;
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
