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
    bounds = [0,0,1,1];

    var that = {
        addHandlers:function() {
            $(window).resize(that.resize);
            linepos = bounds[0];
            that.resize();
            that.canvasBounds();
            thecanvas.click(function(e) {
                var x = e.pageX - canvas.offsetLeft;
                var y = e.pageY - canvas.offsetTop;
                var tmp = that.fromScreen(x, y);
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
            bounds[0] -= 0.05*(bounds[2]-bounds[0]);
            bounds[1] -= 0.05*(bounds[3]-bounds[1]);
            bounds[2] += 0.05*(bounds[2]-bounds[0]);
            bounds[3] += 0.05*(bounds[3]-bounds[1]);
        },
        resize:function() {
            w = $(window).width()*0.8;
            h = $(window).height()*0.8;
            w = Math.min(w,h);
            h = w;
            thecanvas.width(w);
            thecanvas.height(h);
            canvas.width = w;
            canvas.height = h;
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
        update:function() {
            //that.canvasBounds();
            ctx.clearRect(0,0,w,h);
            // Draw points
            for (var i = 0; i < points.length; ++i) {
                var coords = that.toScreen(points[i]);
                ctx.fillStyle = "#000000";
                ctx.beginPath();
                ctx.arc(coords.x, coords.y, 5, 0, Math.PI*2, true);
                ctx.closePath();
                ctx.fill();
            }
            // Draw sweep line
            var l = that.toScreen(linepos, 0);
            ctx.strokeStyle = "#ff0000";
            ctx.beginPath();
            ctx.moveTo(l.x, 0);
            ctx.lineTo(l.x, h);
            ctx.closePath();
            ctx.stroke();
            // TODO: Draw voronoi lines
            // TODO: Draw beach lines
        }
    };
    return that;
}
