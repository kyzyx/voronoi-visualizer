// Google closure library data structures
// Standard hash map with O(1) operations, priority queue with O(log n) operations,
// AVL tree as a BBST with O(log n) operations.
goog.require("goog.structs");
goog.require("goog.structs.Map");
goog.require("goog.structs.PriorityQueue");
goog.require("goog.structs.AvlTree");

// Constants for event types
var SITE = 1;
var ARC  = 2;

Voronoi = function(points) {
    var point = points;
    var pt, ev;

    // Sweep line event queue
    var pq = new goog.structs.PriorityQueue();

    // An event is of two types: SITE or ARC
    // Events have an event coordinate x, either a point (for a SITE)
    // or an arc (for an ARC), a type, and whether or not it is valid.
    //     SITE object: x,y
    //     ARC object: p is the coordinates (x,y) of the point
    //                d is the index into beach of the arc
    //                next, prev have next and previous pointers
    //                edge indexes into the edge array for the upper edge of the arc
    //                key is a static key that is used for the qmap hash table

    // A sorted structure containing the beach line
    // The indices are managed manually due to the difficulty in computing the
    // nearest parabolic arc
    // Thus we use this as a linked-list-sorted-array hybrid structure with
    // real-valued indices
    var beach = new goog.structs.AvlTree(function(a,b){
        return a.d - b.d;
    });

    // A map of arcs to events, for easy event invalidation
    var qmap = new goog.structs.Map;

    // A list of edges {vertices:[v1,v2],points:[p1,p2]};
    // Vertices are the endpoints of the edge; points are the diagram points that
    // this edge bisects
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
        // Calculates the static key for arc
        arcKey:function(arc) {
            var tmp = {i:arc.p, n:arc.next?arc.next.p:arc.next, p:arc.prev?arc.prev.p:arc.prev};
            // Closure hash map uses the toString function to get the key, so
            // calculate as a json string on the coordinates of the three arc centers
            tmp.toString = function(){return JSON.stringify(tmp)};
            return tmp;
        },
        // Adds the arc event to the appropriate lists
        addEvent:function(arc) {
            if (!arc.prev || !arc.next) return;
            // If the site is in front of both of its neighbors, then it can't
            // be "hidden", i.e. this is an expanding arc
            if (arc.p.x > arc.prev.p.x && arc.p.x > arc.next.p.x) return;
            var ccenter = circumcenter(arc.p, arc.prev.p, arc.next.p);
            // If sites are collinear, then the edges cannot intersect
            if (!ccenter) return;
            var cradius = circumradius(arc.p, arc.prev.p, arc.next.p);
            var x = ccenter.x + cradius;
            // If this event has passed, it is invalid
            if (x < currx) return;
            // Otherwise, add the event to the queue
            var evt = {x:x, arc:arc, v:ccenter, type:ARC, valid:true};
            qmap.set(arc.key, evt);
            pq.enqueue(evt.x, evt);
        },
        // Determines whether this arc event actually consists of
        // three parabolic arcs intersecting at the same point.
        // There's probably a calculation that can determine this before adding
        // the event to the queue, but
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
        searchBeach:function(x, y) {
            var curr = beach.root_;
            while (true) {
                // A "break point", i.e. an intersection of two arcs, is
                // equidistant from the two center points and the sweep line.
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

        // Main loop: Process a single event off of the event queue
        step:function() {
            if (!pq.isEmpty()) {
                // Get a valid event
                var nextev;
                do {
                    nextev = pq.dequeue();
                } while (!pq.isEmpty() && !nextev.valid);
                if (pq.isEmpty()) return false;

                ev = nextev;
                currx = ev.x;
                pt = ev.p;

                if (ev.type == SITE) {
                    // Initial point
                    if (beach.getCount() == 0) {
                        beach.add({p:pt, d:0, next:null, prev:null, edge:-1});
                        return true;
                    }
                    // Search beach for arc with same y-coord
                    var intersect = that.searchBeach(pt.x, pt.y);
                    var d = intersect.d;

                    // Remove intersected arc
                    beach.remove(intersect);

                    // Insert two new subarcs plus the newly constructed arc
                    //      Get adjacent arcs
                    var next = intersect.next;
                    var prev = intersect.prev;
                    //      Calculate indices into AVL tree
                    var nextd, prevd;
                    if (next)      nextd = (d + next.d)/2;
                    else if (prev) nextd = prev.d + 2*(d-prev.d);
                    else           nextd = 4096;
                    if (prev)      prevd = (d + prev.d)/2;
                    else if (next) prevd = next.d - 2*(next.d-d);
                    else           prevd = -4096;
                    var index = edges.length;
                    //      Create arc objects
                    var lowarc = 
                        {p:intersect.p, d:prevd, prev:intersect.prev, edge:index};
                    var uparc = 
                        {p:intersect.p, d:nextd, next:intersect.next, edge:intersect.edge};
                    var newarc = {p:pt, d:d, next:uparc, prev:lowarc, edge:index};
                    lowarc.next = newarc;
                    uparc.prev = newarc;
                    if (intersect.prev) intersect.prev.next = lowarc;
                    if (intersect.next) intersect.next.prev = uparc;
                    newarc.key = that.arcKey(newarc);
                    lowarc.key = that.arcKey(lowarc);
                    uparc.key = that.arcKey(uparc);
                    edges.push({vertices:[], points:[pt, intersect.p], uparc:newarc});
                    beach.add(newarc);
                    beach.add(lowarc);
                    beach.add(uparc);

                    // Invalidate ARC event containing old arc
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
        // Step through entire queue
        compute:function() {
            while (!pq.isEmpty()) {
                that.step();
            }
        },
        // Advance sweep line to draw unbounded edges
        finish:function(draw) {
            var bbox = draw.bounds();
            var inc = bbox[2] - bbox[0];
            while (that.draw(draw)) {
                that.moveline(currx + inc);
            }
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
        },
        arcInView:function(bbox, p, x) {
            var corners = [{x:bbox[2], y:bbox[1]},{x:bbox[2], y:bbox[3]}];
            //console.log(corners);
            //console.log(p.x + "," + p.y +  " " + x);
            for (var i = 0; i < corners.length; ++i) {
                //console.log(dist2(corners[i], p) + " " +  ((corners[i].x - x)*(corners[i].x - x)));
                if (dist2(corners[i], p) > (corners[i].x - x)*(corners[i].x - x)) {
                    return true;
                }
            }
            return false;
        },
        drawBeach:function(draw){
            var bbox = draw.bounds();
            if (beach.getCount() == 0) return true;
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
                return that.arcInView(bbox, c.p, currx);
            }
            var beachExists = false;
            var curr = beach.getMinimum();
            var ul = tangentCircle(curr.p, curr.next.p, currx);
            var dx = currx - bbox[0];
            var dx2 = curr.p.x - bbox[0];
            var yy = Math.sqrt(dx*dx - dx2*dx2);
            var ll = {x:bbox[0], y:curr.p.y-yy};
            draw.drawArc(curr.p, currx, ul, ll);
            beachExists = beachExists || that.arcInView(bbox, curr.p, currx);
            for (curr = curr.next; curr.next; curr = curr.next) {
                ul = tangentCircle(curr.p, curr.next.p, currx);
                ll = tangentCircle(curr.prev.p, curr.p, currx);
                draw.drawArc(curr.p, currx, ul, ll);
                beachExists = beachExists || that.arcInView(bbox, curr.p, currx);
            }
            dx = currx - bbox[0];
            dx2 = curr.p.x - bbox[0];
            yy = Math.sqrt(dx*dx - dx2*dx2);
            ul = {x:bbox[0], y:curr.p.y+yy};
            ll = tangentCircle(curr.prev.p, curr.p, currx);
            draw.drawArc(curr.p, currx, ul, ll);
            beachExists = beachExists || that.arcInView(bbox, curr.p, currx);
            return beachExists;
        },
        draw:function(draw) {
            draw.drawVerticalLine(currx);
            var ret = that.drawBeach(draw);
            if (beach.getCount() < 2) return ret;
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
                else {
                    // Error: Should have drawn this on the beach
                    console.log("Error: Loose edge");
                }
            }
            return ret;
        }
    };
    return that;
}
