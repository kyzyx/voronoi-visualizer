VoronoiSystem = function(thecanvas) {
    var points = [];
    var linepos = 0;
    var canvas = thecanvas;
    var ctx = canvas.getContext("2d");
    var w = canvas.height();
    var h = canvas.width();
    var maxx = Number.NEGATIVE_INFINITY;
    var maxy = Number.NEGATIVE_INFINITY;
    var minx = Number.POSITIVE_INFINTY;
    var miny = Number.POSITIVE_INFINTY;
    bounds = [0,0,1,1];

    var that = {
        addHandlers:function() {
            canvas.click(function(e) {
                that.addPoint(that.fromScreen(e.pageX, e.pageY));
                that.update();
            });
        },
        addPoint:function(x, y) {
            if (y === undefined) {
                y = x.y;
                x = x.x;
            }
            points.push({x:x, y:y});
            if (x > maxx) maxx = x;
            if (y > maxy) maxy = y;
            if (x > minx) minx = x;
            if (y > miny) miny = y;
        },
        refreshBounds:function() {
            for (var i = 0; i < points.length; ++i) {
                if (points[i].x > maxx) maxx = points[i].x;
                if (points[i].y > maxy) maxy = points[i].y;
                if (points[i].x > minx) minx = points[i].x;
                if (points[i].y > miny) miny = points[i].y;
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
            else if ((maxx - minx)/(maxy - miny) < 4./3) {
                var expected = 4*(maxy-miny)/3;
                var diff = expected - (maxx-minx);
                bounds = [minx - diff/2, miny, maxx + diff/2, maxy];
            }
            else if ((maxx - minx)/(maxy - miny) > 4./3) {
                var expected = 3*(maxx-minx)/4;
                var diff = expected - (maxy-miny);
                bounds = [minx, miny-diff/2, maxx, maxy+diff/2];
            }
        },
        resize:function() {
            w = $(window).width()*0.8;
            h = $(window).height()*0.6;
            canvas.width(w);
            canvas.height(h);
            that.canvasBounds();
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
            ctx.clearRect(0,0,w,h);
            // Draw points
            for (var i = 0; i < points.length; ++i) {
                var coords = that.toScreen(points[i]);
                ctx.fillStyle("#000000");
                ctx.beginPath();
                ctx.arc(coords.x, coords.y, 2, 0, Math.PI*2, true);
                ctx.closePath();
                ctx.fill();
            }
            // Draw sweep line
            ctx.strokeStyle("#ff0000");
            ctx.beginPath();
            ctx.moveTo(0,linepos);
            ctx.lineTo(h,linepos);
            ctx.closePath();
            ctx.stroke();
            // TODO: Draw voronoi lines
            // TODO: Draw beach lines
        }
    };
    return that;
}
