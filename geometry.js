function intersection(p1,p2,p3,p4) {
    // Determine line equations
    // |A1 B1| |x|   |C1|
    // |A2 B2| |y| = |C2|
    var A1, B1, C1, A2, B2, C2;
    A1 = p1.y - p2.y;
    B1 = p2.x - p1.x;
    C1 = A1*p1.x + B1*p1.y;
    A2 = p3.y - p4.y;
    B2 = p4.x - p3.x;
    C2 = A2*p3.x + B2*p3.y;
    // Solve for intersection
    if (A1*B2 == B1*A2) {
        console.log("Error computing intersection! Parallel lines!");
        return null;
    }

    // Inverse of matrix:
    // | B2 -B1|
    // |-A2  A1|/D
    var D = A1*B2 - B1*A2;
    var x = (B2*C1 - B1*C2)/D;
    var y = (A1*C2 - A2*C1)/D;
    return {x:x,y:y};
}
// Calculates the circumcenter of the triangle with vertices p1, p2, p3
// Calculates the intersection of perpendicular bisectors
function circumcenter(p1, p2, p3) {
    var m1 = {x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
    var m2 = {x:(p3.x+p2.x)/2, y:(p3.y+p2.y)/2};
    var pv1 = {x:(p1.y-p2.y),y:(p2.x-p1.x)};
    var pv2 = {x:(p3.y-p2.y),y:(p2.x-p3.x)};
    var a = {x:m1.x+pv1.x,y:m1.y+pv1.y};
    var b = {x:m2.x+pv2.x,y:m2.y+pv2.y};
    return intersection(m1,a,m2,b);
}

// Calculates the circumradius of the triangle with vertices p1, p2, p3
// Formula from Wikipedia (http://en.wikipedia.org/wiki/Circumscribed_circle)
function circumradius(p1, p2, p3) {
    var l1 = Math.sqrt((p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y))
    var l2 = Math.sqrt((p1.x-p3.x)*(p1.x-p3.x) + (p1.y-p3.y)*(p1.y-p3.y))
    var l3 = Math.sqrt((p3.x-p2.x)*(p3.x-p2.x) + (p3.y-p2.y)*(p3.y-p2.y))

    return l1*l2*l3/Math.sqrt((l1+l2+l3)*(-l1+l2+l3)*(l1-l2+l3)*(l1+l2-l3));
}
