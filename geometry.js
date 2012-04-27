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

function dist2(p1,p2) {
    return (p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y);
}
function dist(p1,p2) {
    return Math.sqrt(dist2(p1,p2));
}

// Calculates the circumradius of the triangle with vertices p1, p2, p3
// Formula from Wikipedia (http://en.wikipedia.org/wiki/Circumscribed_circle)
function circumradius(p1, p2, p3) {
    var l1 = dist(p1,p2);
    var l2 = dist(p1,p3);
    var l3 = dist(p3,p2);
    return l1*l2*l3/Math.sqrt((l1+l2+l3)*(-l1+l2+l3)*(l1-l2+l3)*(l1+l2-l3));
}

// Calculates the center of a circle tangent to a vertical line x = xl
// that goes through p1 and p2
function tangentCircle(p1, p2, xl, second) {
    if (second === undefined) second = false;
    // Calculate equation of perpendicular bisector
    var pp1 = {x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
    var pv = {x:(p1.y-p2.y),y:(p2.x-p1.x)};
    var pp2 = {x:pp1.x+pv.x,y:pp1.y+pv.y};
    var A = pp1.y - pp2.y;
    var B = pp2.x - pp1.x;
    var C = A*pp1.x + B*pp1.y;

    if (p1.x == xl) {
        return intersection(pp1, pp2, p1, {x:p1.x-100,y:p1.y});
    }
    if (p2.x == xl) {
        return intersection(pp1, pp2, p2, {x:p2.x-100,y:p2.y});
    }

    // Algebraically, the distance to the line is equal to the distance to p1.
    // (x-xl)^2 = (y-y1)^2 + (x-x1)^2
    // x = (y^2 - 2yy1 + y1^2 + x1^2 - xl^2)/(2*(x1-xl))
    // Plug into line equation and solve quadratic in y
    var d = 2*(p1.x - xl);
    var a = A/d;
    var b = B - A*(2*p1.y)/d;
    var c = A*(p1.y*p1.y + p1.x*p1.x - xl*xl)/d - C;
    var x,y;
    if (A == 0) {
       y = C/B;
       x = y*y - 2*y*p1.y + (p1.y*p1.y + p1.x*p1.x - xl*xl);
       x /= d;
    }
    else {
        y = Math.sqrt(b*b - 4*a*c) - b;
        y /= 2*a;
        x = (C - B*y)/A;
        var y1 = -Math.sqrt(b*b - 4*a*c) - b;
        y1 /= 2*a;
        var x1 = (C - B*y1)/A;
        if ((x1 > x && !second) || (x1 < x && second)) {
            y = y1;
            x = x1;
        }
    }
    return {x:x, y:y};
}
