goog.require("goog.structs.PriorityQueue");
goog.require("goog.structs.AvlTree");

var SITE = 1;
var ARC  = 2;

function addEvent(pq, map, arc) {
    if (!arc.prev || !arc.next) return;
    var ccenter = circumcenter(arc.p, arc.prev.p, arc.next.p);
    var cradius = circumradius(arc.p, arc.prev.p, arc.next.p);
    var x = ccenter.x + cradius;
    var ev = {x:x, y:y, arc:arc, v:ccenter, type:ARC, valid:true};
    map.set(arc, ev);
    pq.enqueue(ev.x, ev);
}

// Perform a binary search by walking down the AVL tree
// We have to dig into private variables here to get to the tree structure!
function locateBeach(x, y, beach) {
    var curr = beach.root_;
    while (true) {
        var p = {x:curr.value.x,y:curr.value.y};
        var pn = {x:curr.value.next.x,y:curr.value.next.y};
        var pp = {x:curr.value.prev.x,y:curr.value.prev.y};
        // "break point", i.e. intersection of two arcs, is
        // equidistant from the two points and the sweep line.
        // Therefore, we just calculate the center of a circle
        // passing through the two points and tangent to the line
        var ul = tangentCircle(p, pn, x).y;
        var ll = tangentCircle(p, pp, x).y;
        if (y < ll) {
            curr = curr.left;
        }
        else if (y > ul) {
            curr = curr.right;
        }
        else {
            return curr.value;
        }
    }
}

function computeVoronoi(points) {
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
    var qmap = new goog.structs.Map();

    // A map of pairs of vertices to edge endpoints
    var edgemap = new goog.structs.Map();
    // A list of edges ({p1,p2});
    var edges = [];

    for (var i = 0; i < points.length; ++i) {
        var ev = {x:points[i].x, y:points[i].y, p:points[i],  type:SITE, valid:true};
        pq.enqueue(points[i].x, ev);
    }
    while (!pq.isEmpty()) {
        var ev = pq.dequeue();
        if (!ev.valid) continue;
        var pt = ev.p;
        if (ev.type == SITE) {
            if (beach.isEmpty()) {
                beach.add({p:pt, d:0, next:null, prev:null});
                continue;
            }
            // TODO: Search beach for arc with same y-coord
            var intersect = locateBeach(pt.y, beach);
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
            lowarc.next = newarc;
            uparc.prev = newarc;
            beach.add(newarc);
            beach.add(lowarc);
            beach.add(uparc);
            // Invalidate 3 ARC events with old arc
            if (prev) qmap.get(prev).valid = false;
            qmap.get(intersect).valid = false;
            if (next) qmap.get(next).valid = false;

            // Add two new ARC events
            addEvent(pq, qmap, lowarc);
            addEvent(pq, qmap, uparc);
        }
        else if (ev.type == ARC) {
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
            addEvent(pq, ev.arc.prev);
            addEvent(pq, ev.arc.next);
        }
    }
    // Add bbox edges
    goog.structs.forEach(edgemap, function(v,k,c) {
        // Midpoint of p1,p2
        var m = {x:(k.p1.x+k.p2.x)/2, y:(k.p1.y+k.p2.y)/2};
        // Calculate facing bounding box edges and save the closest
        var closest = Number.POSITIVE_INFINITY;
        var closestp;
        if (m.x < v.x) {
            closestp = intersection(v, m, bbox[0], bbox[1]);
            closest = dist2(closestp, v);
        }
        else if (m.x > v.x) {
            closestp = intersection(v, m, bbox[2], bbox[3]);
            closest = dist2(closestp,v);
        }
        if (m.y < v.y) {
            var p = intersection(v, m, bbox[0], bbox[2]);
            var d = dist2(p, v);
            if (d < closest) {
                closest = d;
                closestp = p;
            }
        }
        else if (m.y > v.y){
            var p = intersection(v, m, bbox[1], bbox[3]);
            var d = dist2(p, v);
            if (d < closest) {
                closest = d;
                closestp = p;
            }
        }
        edges.push({p1:v,p2:closestp});
    });
    return edges;
}
