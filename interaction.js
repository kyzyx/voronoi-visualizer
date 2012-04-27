VoronoiSystem = function(thecanvas) {
    var points = [];
    var linepos = 0;
    var canvas = thecanvas.get(0);
    var ctx = canvas.getContext("2d");
    var w = thecanvas.height();
    var h = thecanvas.width();
    var maxx = Number.NEGATIVE_INFINITY;
    var maxy = Number.NEGATIVE_INFINITY;
    var minx = Number.POSITIVE_INFINITY;
    var miny = Number.POSITIVE_INFINITY;
    var diagram = null;
    var bounds = [0,0,1,1];

    var that = {
        addHandlers:function() {
            $(window).resize(that.resize);
            linepos = bounds[0];
            that.resize();
            that.canvasBounds();
            thecanvas.click(function(e) {
                var x = e.pageX - canvas.offsetLeft;
                var y = e.pageY - canvas.offsetTop;
                that.addPoint(that.fromScreen(x, y));
                linepos = bounds[0];
                that.update();
            });
        },
        addPoint:function(x, y) {
            if (typeof(x) == 'object') {
                y = x.y;
                x = x.x;
            }
            points.push({x:x, y:y});
            if (x > maxx) maxx = x;
            if (y > maxy) maxy = y;
            if (x < minx) minx = x;
            if (y < miny) miny = y;
            diagram = null;
        },
        randomPoints:function(n) {
            points = [];
            maxx = Number.NEGATIVE_INFINITY;
            maxy = Number.NEGATIVE_INFINITY;
            minx = Number.POSITIVE_INFINITY;
            miny = Number.POSITIVE_INFINITY;
            diagram = null;
            for (var i = 0; i < n; ++i) {
                that.addPoint(Math.random(), Math.random());
            }
        },
        refreshBounds:function() {
            for (var i = 0; i < points.length; ++i) {
                if (points[i].x > maxx) maxx = points[i].x;
                if (points[i].y > maxy) maxy = points[i].y;
                if (points[i].x < minx) minx = points[i].x;
                if (points[i].y < miny) miny = points[i].y;
            }
        },
        canvasBounds:function() {
            if (maxx == minx) {
                bounds[0] = points[0].x-1;
                bounds[2] = points[0].x+1;
            }
            if (maxy == miny) {
                bounds[1] = points[0].y-1;
                bounds[3] = points[0].y+1;
            }
            else if ((maxx - minx)/(maxy - miny) < 1) {
                var expected = maxy-miny;
                var diff = expected - (maxx-minx);
                bounds = [minx - diff/2, miny, maxx + diff/2, maxy];
            }
            else if ((maxx - minx)/(maxy - miny) > 1) {
                var expected = maxx-minx;
                var diff = expected - (maxy-miny);
                bounds = [minx, miny-diff/2, maxx, maxy+diff/2];
            }
            else {
                bounds[0] = minx;
                bounds[1] = miny;
                bounds[2] = maxx;
                bounds[3] = maxy;
            }
            bounds[0] -= 0.05*(bounds[2]-bounds[0]);
            bounds[1] -= 0.05*(bounds[3]-bounds[1]);
            bounds[2] += 0.05*(bounds[2]-bounds[0]);
            bounds[3] += 0.05*(bounds[3]-bounds[1]);
        },
        resize:function() {
            w = $(window).width()*0.9;
            h = $(window).height()*0.9;
            w = Math.min(w,h);
            h = w;
            thecanvas.width(w);
            thecanvas.height(h);
            canvas.width = w;
            canvas.height = h;
            that.update();
        },
        toScreen:function(x,y){
            if (y === undefined) {
                y = x.y;
                x = x.x;
            }
            var xx = w*(x - bounds[0])/(bounds[2] - bounds[0]);
            var yy = h*(y - bounds[1])/(bounds[3] - bounds[1]);
            yy = h - yy;
            return {x:xx, y:yy};
        },
        fromScreen:function(x,y){
            if (y === undefined) {
                y = x.y;
                x = x.x;
            }
            var xx = bounds[0] + (bounds[2]-bounds[0])*(x/w);
            var yy = h - y;
            yy = bounds[1] + (bounds[3]-bounds[1])*(yy/h);
            return {x:xx, y:yy};
        },
        drawPoint:function(p) {
            var sp = that.toScreen(p);
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 3, 0, Math.PI*2, true);
            ctx.closePath();
            ctx.fill();
        },
        drawVerticalLine:function(x, color) {
            var l = that.toScreen(x, 0);
            ctx.strokeStyle = color?color:"#ff0000";
            ctx.beginPath();
            ctx.moveTo(l.x, 0);
            ctx.lineTo(l.x, h);
            ctx.closePath();
            ctx.stroke();
        },
        drawCircle:function(p, r, color) {
            var sp = that.toScreen(p);
            var o = that.toScreen({x:0, y:0}); var d = that.toScreen({x:r,y:0});
            var rr = Math.sqrt((o.x-d.x)*(o.x-d.x) + (o.y-d.y)*(o.y-d.y));
            ctx.strokeStyle = color?color:"#000000";
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, rr, 0, Math.PI*2, true);
            ctx.closePath();
            ctx.stroke();
        },
        update:function() {
            ctx.clearRect(0,0,w,h);
            // Draw points
            for (var i = 0; i < points.length; ++i) {
                that.drawPoint(points[i]);
            }
            // Draw sweep line
            //that.drawVerticalLine(linepos);
            // TODO: Draw voronoi lines
            // TODO: Draw beach lines
        },
        drawEdge:function(e) {
            var p1 = that.toScreen(e.p1);
            var p2 = that.toScreen(e.p2);
            ctx.strokeStyle = "#0000ff";
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.closePath();
            ctx.stroke();
        },
        drawEdges:function(edges) {
            for (var i = 0; i < edges.length; ++i) {
                that.drawEdge(edges[i]);
            }
        },
        // Ref: http://alecmce.com/as3/parabolas-and-quadratic-bezier-curves
        drawArc:function(focus, directrix, p1, p2, color) {
            sp1 = that.toScreen(p1);
            sp2 = that.toScreen(p2);

            ctx.strokeStyle = color?color:"#ff00ff";
            ctx.beginPath();
            if (p1.y == p2.y) {
                sf = that.toScreen(focus);
                ctx.moveTo(sp1.x, sp1.y);
                ctx.lineTo(sf.x, sf.y);
            }
            else {
                var q1 = {x:directrix,y:p1.y};
                var q2 = {x:directrix,y:p2.y};
                var m1 = {x:(q1.x+focus.x)/2,y:(q1.y+focus.y)/2};
                var m2 = {x:(q2.x+focus.x)/2,y:(q2.y+focus.y)/2};
                var control = intersection(p1,m1,p2,m2);
                var sc = that.toScreen(control);
                ctx.moveTo(sp1.x, sp1.y);
                ctx.quadraticCurveTo(sc.x, sc.y, sp2.x, sp2.y);
            }
            ctx.stroke();
        },
        voronoi:function() {
            diagram = new Voronoi(points,bounds);
        },
        step:function() {
            if (!diagram) diagram = new Voronoi(points,bounds);
            if(diagram.step()) diagram.draw(that);
        }
    };
    return that;
}
