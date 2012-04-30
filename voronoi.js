goog.require("goog.structs");
goog.require("goog.structs.Map");
goog.require("goog.structs.PriorityQueue");
goog.require("goog.structs.AvlTree");

var SITE = 1;
var ARC  = 2;

Voronoi = function(points) {
    var point = points;
    var pt, ev;
    // Sweep line events
    var pq = new goog.structs.PriorityQueue();
    // A pq event is of two types: SITE or ARC
    // Events have an event coordinate x, either a point (for a SITE) or an arc (for an ARC),
    // a type, and a valid.
    //     SITE object: x,y
    //     ARC object: x,y are the coordinates of the point
    //                d is the index into beach of the arc
    //                next, prev have next and previous pointers
    //                edge is an index into the edge array of the upper edge of the arc

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

    // A list of edges {vertices:[v1,v2],points:[p1,p2]};
    var edges = [];

    // Initialize event queue
    for (var i = 0; i < points.length; ++i) {
        var evt = {x:points[i].x,
                  y:points[i].y,
                  p:points[i],
                  type:SITE, valid:true};
        pq.enqueue(points[i].x, evt);
    }
    // Current sweep line location
    var currx = pq.isEmpty()?0:pq.peek().x;
    // Clear debug screen
    $("#beach").get(0).value = "";
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
            var evt = {x:x, arc:arc, v:ccenter, type:ARC, valid:true};
            qmap.set(arc.key, evt);
            pq.enqueue(evt.x, evt);
        },
        isValidArcEvent:function(arc) {
            var ccenter = circumcenter(arc.p, arc.prev.p, arc.next.p);
            if (!ccenter) return false;
            var cradius = circumradius(arc.p, arc.prev.p, arc.next.p);
            var ul = tangentCircle(arc.p, arc.next.p, currx);
            var ll = tangentCircle(arc.prev.p, arc.p, currx);
            if (Math.abs(ul.x - ll.x) < EPS && Math.abs(ul.y - ll.y) < EPS) {
                return true;
            }
            return false;
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
                do {
                    ev = pq.dequeue();
                } while (!pq.isEmpty() && !ev.valid);
                if (pq.isEmpty()) return false;
                currx = ev.x;
                pt = ev.p;
                if (ev.type == SITE) {
                    if (beach.getCount() == 0) {
                        beach.add({p:pt, d:0, next:null, prev:null, edge:-1});
                        return true;
                    }
                    // Search beach for arc with same y-coord
                    var intersect = that.locateBeach(pt.x, pt.y);
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
                    var index = edges.length;
                    var lowarc = 
                        {p:intersect.p, d:prevd, prev:intersect.prev, edge:index};
                    var uparc = 
                        {p:intersect.p, d:nextd, next:intersect.next, edge:intersect.edge};
                    var newarc = {p:pt, d:d, next:uparc, prev:lowarc, edge:index};
                    edges.push({vertices:[], points:[pt, intersect.p], uparc:newarc});
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
                        return true;
                    }
                    // Record edge information
                    var point = circumcenter(ev.arc.p, ev.arc.prev.p, ev.arc.next.p);
                    edges[ev.arc.prev.edge].vertices.push(point);
                    edges[ev.arc.edge].vertices.push(point);
                    // Update edges
                    var index = edges.length;
                    edges.push({vertices:[point], points:[ev.arc.prev.p, ev.arc.next.p]});
                    ev.arc.prev.edge = index;

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
        moveline:function(x) {
            if (ev && x < ev.x) return false;
            while (!pq.isEmpty() && x > pq.peek().x) that.step();
            currx = x;
            return true;
        },
        getline:function() {
            return currx;
        },
        debug:function(draw) {
            var bbox = draw.bounds();
            // Highlight points on beach
            $("#beach").get(0).value = "";
            $("#evtq").get(0).value = "";
            if (beach.getCount()) {
                for (var c = beach.getMinimum(); c; c = c.next) {
                    draw.drawPoint(c.p, "#ffff00");
                    $("#beach").get(0).value += c.d + ": " + "(" + c.p.x + "," + c.p.y + ")\n";
                }
            }
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
            /*
            for (var i = 0; i < point.length; ++i) {
                var c = point[i];
                var dx = currx - bbox[0];
                var dx2 = c.x - bbox[0];
                var yy = Math.sqrt(dx*dx - dx2*dx2);
                var ul = {x:bbox[0], y:c.y+yy};
                var ll = {x:bbox[0], y:c.y-yy};
                draw.drawArc(c, currx, ul, ll, "#ffff00");
            }*/
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
            draw.drawArc(curr.p, currx, ul, ll);
        },
        halfstep:function() {
            if (pq.isEmpty()) return false;
            currx = (currx + pq.peek().x)/2;
            return true;
        },
        draw:function(draw) {
            draw.update();
            draw.drawVerticalLine(currx);
            that.drawBeach(draw);
            if (beach.getCount() < 2) return;
            // Keep track of which edges have been drawn
            var drawn = [];
            for (var i = 0; i < edges.length; ++i) drawn[i] = false;
            // First draw the edges from the beach line (Topmost arc has no edge)
            for (var curr = beach.getMinimum(); curr.next; curr = curr.next) {
                var ul = tangentCircle(curr.p, curr.next.p, currx);
                if (edges[curr.edge].vertices.length) {
                    draw.drawEdge({p1:ul, p2:edges[curr.edge].vertices[0]}, "#000000");
                }
                else if (!drawn[curr.edge] && edges[curr.edge].uparc) {
                    var ll = tangentCircle(edges[curr.edge].uparc.p, edges[curr.edge].uparc.next.p, currx);
                    draw.drawEdge({p1:ul, p2:ll}, "#000000");
                }
                drawn[curr.edge] = true;
            }
            // Draw remaining edges
            for (var i = 0; i < edges.length; ++i) {
                if (drawn[i]) continue;
                if (edges[i].vertices.length == 2) {
                    // Draw edge with both endpoints
                    draw.drawEdge({p1:edges[i].vertices[0], p2:edges[i].vertices[1]}, "#000000");
                }
                else if (edges[i].vertices.length == 1) {
                    // Draw unbounded edge
                    var mid = {x:(edges[i].points[0].x+edges[i].points[1].x)/2, 
                               y:(edges[i].points[0].y+edges[i].points[1].y)/2};

                    //var bound = intersection(mid, edges[i].vertices[0], bbox1, bbox2);
                    //draw.drawEdge({p1:edges[i].vertices[0], p2:mid}, "#ff0000");
                }
                else {
                    // Error: Should have drawn this on the beach
                    console.log("Error: Loose edge");
                }
            }
        }
    };
    return that;
}
