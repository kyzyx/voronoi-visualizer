VoronoiSystem = function(thecanvas, theslider) {
    var points = [];
    var canvas = thecanvas.get(0);
    var slider = theslider.get(0);
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
            that.resize();
            thecanvas.click(function(e) {
                var x = e.pageX - canvas.offsetLeft - 11;
                var y = e.pageY - canvas.offsetTop - 11;
                that.addPoint(that.fromScreen(x, y));
                that.update();
            });
        },
        slide:function(x) {
            if (!diagram) that.voronoi();
            if (diagram.moveline(x)) {
                var ret = that.update();
                return ret;
            }
            else {
                diagram = new Voronoi(points);
                diagram.moveline(x);
                return that.update();
            }
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
                that.addPoint(Math.random()*100, Math.random()*100);
            }
            slider.value = 0;
        },
        bounds:function(b) {
            if (!b) return bounds;
            for (var i = 0; i < 4; ++i) bounds[i] = parseInt(b[i]);
            that.updateSlider();
            return bounds;
        },
        fitBounds:function() {
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
            bounds[0] -= 0.1*(bounds[2]-bounds[0]);
            bounds[1] -= 0.1*(bounds[3]-bounds[1]);
            bounds[2] += 0.1*(bounds[2]-bounds[0]);
            bounds[3] += 0.1*(bounds[3]-bounds[1]);
        },
        resize:function() {
            w = $(window).width()*0.85;
            h = $(window).height()*0.85;
            w = Math.min(w,h);
            h = w;
            thecanvas.width(w);
            thecanvas.height(h);
            theslider.width(w);
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
            var yy = h*(bounds[3] - y)/(bounds[3] - bounds[1]);
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
                that.drawPoint(points[i]);
            }

            // Draw Voronoi Diagram
            if (!diagram) return;
            var ret = diagram.draw(that);
            diagram.debug(that);

            // Update slider position
            that.updateSlider();
            return ret;
        },
        // DRAW FUNCTIONS
        drawPoint:function(p, color) {
            var sp = that.toScreen(p);
            ctx.fillStyle = color?color:"#000000";
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 2, 0, Math.PI*2, true);
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
        drawEdge:function(e, color) {
            var p1 = that.toScreen(e.p1);
            var p2 = that.toScreen(e.p2);
            if ((p1.x < 0 && p2.x < 0) || (p1.y < 0 && p2.y < 0)) {
                return;
            }
            // Keep edges mostly in bounds, since browsers render large negative
            // coordinates incorrectly
            if (p1.x < 0) {
                var f = p2.x/(p2.x-p1.x);
                p1.x = p1.x*f + p2.x*(1-f);
                p1.y = p1.y*f + p2.y*(1-f);
            }
            if (p1.y < 0) {
                var f = p2.y/(p2.y-p1.y);
                p1.x = p1.x*f + p2.x*(1-f);
                p1.y = p1.y*f + p2.y*(1-f);
            }
            if (p2.x < 0) {
                var f = p1.x/(p1.x-p2.x);
                p2.x = p2.x*f + p1.x*(1-f);
                p2.y = p2.y*f + p1.y*(1-f);
            }
            if (p2.y < 0) {
                var f = p1.y/(p1.y-p2.y);
                p2.x = p2.x*f + p1.x*(1-f);
                p2.y = p2.y*f + p1.y*(1-f);
            }
            ctx.strokeStyle = color?color:"#0000ff";
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
        drawArc:function(focus, directrix, pt1, pt2, color) {
            var p1 = {x:pt1.x, y:pt1.y};
            var p2 = {x:pt2.x, y:pt2.y};
            // Deal with degenerate arcs
            if (Math.abs(p1.y - p2.y) < EPS) {
                that.drawEdge({p1:p1, p2:focus}, color?color:"#ff00ff");
            }
            else {
                // Ref: http://alecmce.com/as3/parabolas-and-quadratic-bezier-curves
                // Keep edges mostly in bounds, since browsers render large negative
                // coordinates incorrectly
                if (p1.x <= bounds[0] && p2.x <= bounds[0]) {
                    if (p1.y > focus.y && p2.y > focus.y) {
                        return;
                    }
                    if (p1.y < focus.y && p2.y < focus.y) {
                        return;
                    }
                }
                if (p1.x <= bounds[0]) {
                    var dx = directrix - bounds[0];
                    var dx2 = focus.x - bounds[0];
                    var yy = Math.sqrt(dx*dx - dx2*dx2);
                    p1.x = bounds[0];
                    p1.y = focus.y + (p1.y>p2.y?yy:-yy);
                }
                if (p2.x <= bounds[0]-1) {
                    var dx = directrix - bounds[0]+1;
                    var dx2 = focus.x - bounds[0]+1;
                    var yy = Math.sqrt(dx*dx - dx2*dx2);
                    p2.x = bounds[0]-1;
                    p2.y = focus.y + (p2.y>p1.y?yy:-yy);
                }

                ctx.strokeStyle = color?color:"#ff00ff";
                ctx.beginPath();
                var q1 = {x:directrix,y:p1.y};
                var q2 = {x:directrix,y:p2.y};
                var m1 = {x:(q1.x+focus.x)/2,y:(q1.y+focus.y)/2};
                var m2 = {x:(q2.x+focus.x)/2,y:(q2.y+focus.y)/2};
                var control = intersection(p1,m1,p2,m2);
                // Edge case: if one of the points has the same y-coord as the focus
                // then perturb the points slightly and draw the arc
                if (!control) {
                    p1.y += EPS;
                    p2.y += EPS;
                    q1 = {x:directrix, y:p1.y};
                    q2 = {x:directrix, y:p2.y};
                    m1 = {x:(q1.x+focus.x)/2,y:(q1.y+focus.y)/2};
                    m2 = {x:(q2.x+focus.x)/2,y:(q2.y+focus.y)/2};
                    control = intersection(p1,m1,p2,m2);
                }
                var sp1 = that.toScreen(p1);
                var sp2 = that.toScreen(p2);
                var sc = that.toScreen(control);
                ctx.moveTo(sp1.x, sp1.y);
                ctx.quadraticCurveTo(sc.x, sc.y, sp2.x, sp2.y);
                ctx.stroke();
            }
        },
        // VORONOI INTERACTION FUNCTIONS
        updateSlider:function() {
            var x = diagram.getline();
            var val = theslider.slider("option","max")*(x - bounds[0])/(bounds[2]-bounds[0]);
            if (val < 0) val = 0;
            if (val > theslider.slider("option","max")) val = theslider.slider("option","max");
            theslider.slider("option","value", Math.round(val));
        },
        voronoi:function() {
            diagram = new Voronoi(points);
            theslider.slider("option","value", 0);
        },
        step:function() {
            if (!diagram) diagram = new Voronoi(points);
            if(diagram.step()) {
                that.update();
            }
            else {
                diagram.finish(that);
                that.update();
            }
        },
        complete:function() {
            if (!diagram) diagram = new Voronoi(points);
            diagram.compute();
            diagram.finish(that);
            that.update();
        },
        getline:function() {
            if (!diagram) that.voronoi();
            return diagram.getline();
        },
    };
    return that;
}
