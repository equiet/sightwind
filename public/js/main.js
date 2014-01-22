/*globals d3,topojson,Q,THREE*/
'use strict';



var now = Date.now(),
    timeDiff,
    lastTick = Date.now();

var options = {
    speedFactor: 0.03,
    lifeTime: 1000,
    lineWidth: 1,
    colorAlpha: 0.6,
    globalAlpha: 0.96,
    colorScale: [
        // Half-closed interval [start, end)
        {start: -Infinity, end: -7,  color: '77,66,230'},
        {start: -7, end: 0,      color: '137,121,234'},
        {start: 0, end: 7,        color: '160,85,212'},
        {start: 7, end: 14,          color: '219,71,188'},
        {start: 14, end: 21,         color: '239,40,141'},
        {start: 21, end: 28,        color: '247,40,109'},
        {start: 28, end: Infinity,        color: '255,52,65'},
    ],
    criterion: 'temp',
    minParticles: 500,
    maxParticles: 5000,
    minFPS: 20
};

var tempToColor = function(temp) {
    for (var i = 0; i < options.colorScale.length; i++) {
        if (temp < options.colorScale[i].end) {
            return options.colorScale[i].color;
        }
    }
};




function DataLoader() {

    this.frame = 0;
    this.level = -1;
    this.ready = false;
    this.data = [];

    this.WIDTH = 495;
    this.HEIGHT = 309;

    this.CORNERS = {
        topLeft: [-45.6597900390625, 55.27363204956055],
        topRight: [53.409786224365234, 55.27363204956055],
        bottomLeft: [-24.60595703125, 26.117345809936523],
        bottomRight: [32.1064453125, 26.117345809936523]
    };

    this.params = ['wind_u', 'wind_v', 'temp'];

}
DataLoader.prototype.setFrame = function(frame) {
    this.frame = frame;
    return this;
};
DataLoader.prototype.setLevel = function(level) {
    this.level = level;
    return this;
};
DataLoader.prototype.get = function(param, x, y) {
    return this.data[param][y * this.WIDTH + x];
};
DataLoader.prototype.load = function() {

    var tmpData = {},
        self = this;

    document.querySelector('.loading').classList.add('is-active');


    /**
     * Promise for all images
     */

    return Q.all(dataLoader.params.map(function(param) {

        var deferred = Q.defer(),
            loadCanvas = document.createElement('canvas'),
            loadCtx = loadCanvas.getContext('2d'),
            img = new Image();

        loadCanvas.width = self.WIDTH;
        loadCanvas.height = self.HEIGHT;

        img.onload = function() {

            loadCtx.drawImage(img, 0, 0);

            var imageData = loadCtx.getImageData(0,0, loadCanvas.width, loadCanvas.height);
            tmpData[param] = new Float32Array(imageData.data.buffer);

            img = null;

            deferred.resolve();

        };

        if (self.level == -1) {
            var standardName = param.replace('wind_u', 'wind10m_u')
                                    .replace('wind_v', 'wind10m_v')
                                    .replace('temp', 'temp2m');
            img.src = 'data/' + self.frame + '/' + standardName + '.png';
        } else {
            img.src = 'data/' + self.frame + '/' + param + '_' + this.level + '.png';
        }

        return deferred.promise;

    })).then(function() {

        console.log(tmpData);
        self.data = tmpData;
        self.ready = true;

        document.querySelector('.loading').classList.remove('is-active');

    });

};

var dataLoader = new DataLoader();






var currentParticles = options.minParticles;


var svg, projection, g, graticulePath;

svg = d3.select('#map').append('g');
g = svg.append('g');




// var projection = d3.geo.mercator()
//     .scale(width)
//     .center([47.5, 4])
//     .rotate([-grid_center.lon, 0])
//     .translate([width, height])
//     .precision(.1);







var elMain = document.querySelector('.main'),
    elContainer = document.querySelector('.container');

var canvas,
    ctx,
    buffer,
    bufferCtx,
    tempCanvas,
    tempCtx,
    heatCanvas,
    heatCtx,
    scaleGradient;







function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}





function Particle(x, y) {
    this.offset = Math.random() * options.lifeTime;
    this.reset(now);
}
Particle.prototype.reset = function () {
    this.x = Math.floor(Math.random() * canvas.width);
    this.y = Math.floor(Math.random() * canvas.height);
    this.refreshCoords();
    this.lifeTime = now + options.lifeTime - now % options.lifeTime + this.offset;
};
Particle.prototype.tick = function () {
    if (this.x > canvas.width || this.x < 0 ||
        this.y > canvas.height || this.y < 0 ||
        this.lifeTime < now) {
        this.reset();
        return;
    }
    this.refreshCoords();
};
Particle.prototype.refreshCoords = function () {
    this.dataCoordX = Math.floor(this.x / canvas.width * dataLoader.WIDTH);
    this.dataCoordY = Math.floor(this.y / canvas.height * dataLoader.HEIGHT);
};
Particle.prototype.nextPositionX = function () {
    this.x = this.x + dataLoader.get('wind_u', this.dataCoordX, this.dataCoordY) * timeDiff * options.speedFactor;
    return this.x;
};
Particle.prototype.nextPositionY = function () {
    this.y = this.y - dataLoader.get('wind_v', this.dataCoordX, this.dataCoordY) * timeDiff * options.speedFactor;
    return this.y;
};



var particles = [];



var fpsCounter = function() {
    var fps = 0;
    return function (newFps) {
            fps = (fps * 4 + newFps) / 5;
            return Math.floor(fps * 10) / 10;
    };
}();


function render() {

    requestAnimationFrame(render);

    if (!dataLoader.ready) {
        return;
    }

    now = Date.now();
    timeDiff = (Date.now() - lastTick) / 16; // timeDiff should be near 1 at 60fps
    lastTick = now;


    bufferCtx.globalAlpha = options.globalAlpha;

    for (var j = 0; j < currentParticles; j++) {
        if (particles[j] === undefined) {
            particles[j] = new Particle();
        }
       particles[j].tick();
    }

    // Fade old pixels
    bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
    bufferCtx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buffer, 0, 0);

    for (var i = 0; i < options.colorScale.length; i++) {

        ctx.beginPath();

            ctx.lineWidth = options.lineWidth;
            ctx.strokeStyle = 'rgba(' + options.colorScale[i].color + ',' + options.colorAlpha + ')';

            for (var j = 0; j < currentParticles; j++) {
                var criterion = dataLoader.get(options.criterion, particles[j].dataCoordX, particles[j].dataCoordY);
                if (options.colorScale[i].start <= criterion && criterion < options.colorScale[i].end) {
                    ctx.moveTo(particles[j].x, particles[j].y);
                    ctx.lineTo(particles[j].nextPositionX(), particles[j].nextPositionY());
                }
            }

        ctx.stroke();

    }



    /**
     * Draw scale
     */

    var scaleWidth = 200,
        scaleHeight = 15;
    scaleGradient = ctx.createLinearGradient(canvas.width - scaleWidth - 20, 0, canvas.width - 20, 0);
    for (i = 0; i < options.colorScale.length; i++) {
        scaleGradient.addColorStop(i / options.colorScale.length, 'rgb(' + options.colorScale[i].color + ')');
    }
    ctx.fillStyle = scaleGradient;
    ctx.fillRect(canvas.width - 220, canvas.height - 30, 200, 15);
    ctx.textAlign = 'center';
    for (i = 1; i < options.colorScale.length; i++) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(options.colorScale[i].start, canvas.width - scaleWidth - 20 + i / options.colorScale.length * scaleWidth, canvas.height - 19);
    }


    /**
     * FPS counter
     */
    var fps = fpsCounter(1000 / (timeDiff * 16));

    ctx.clearRect(0, elContainer.clientHeight - 15, 80, elContainer.clientHeight);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'start';
    ctx.fillText(fps, 0, elContainer.clientHeight);
    ctx.fillText(currentParticles, 30, elContainer.clientHeight);

    if (fps > options.minFPS) {
        currentParticles = Math.min(currentParticles + 100, options.maxParticles);
    } else {
        currentParticles = Math.max(currentParticles - 100, options.minParticles);
    }

}



d3.csv('data/frames.csv', function(err, frames) {

    if (err) {
        triggerError('Couldn\'t load data');
        return;
    }

    frames.forEach(function(frame) {
        frame.time = parseInt(frame.time, 10);
    });

    var interval;

    document.querySelector('.last-update').innerHTML = new Date(frames[0].time * 1000).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });

    NodeList.prototype.forEach = Array.prototype.forEach;

    // date.toDateString().slice(4, 10)


    // Timeline

    var timeline = d3.select('.footer_controls.is-frames').attr('width', 760).attr('height', 60);

    function showDay(time, start, end) {
        var g = timeline.append('g').attr('class', 'day');
        g.append('rect')
            .attr('class', 'day_line')
            .attr('x', start)
            .attr('y', 12)
            .attr('width', end - start)
            .attr('height', 1)
            .attr('fill', 'url(#dayGradient)');
        g.append('rect')
            .attr('class', 'day_text-bg')
            .attr('x', (end - start) / 2 + start - 24)
            .attr('y', 12)
            .attr('width', 48)
            .attr('height', 1)
            .attr('fill', '#000');
        g.append('text')
            .text(new Date(time*1000).toDateString().slice(4, 10))
            .attr('x', (end - start) / 2 + start)
            .attr('y', 16);

    }

    var midnight = 0;
    frames.forEach(function(d, i) {
        if (new Date(d.time * 1000).getHours() % 24 === 0 || i === frames.length - 1) {
            showDay(frames[midnight].time, midnight * 10 + 20, i * 10 + 20);
            midnight = i;
        }
    });

    var points = timeline.append('g').attr('class', 'ticks').selectAll('g')
        .data(frames)
        .enter();
    var tick = points.append('g')
        .attr('transform', function(d, i) { return 'translate(' + (i*10 + 20) + ',30)'; })
        .each(function(d, i) {
            var $this = d3.select(this),
                hours = new Date(d.time * 1000).getHours();
            $this.classed('is-midnight', hours % 24 === 0);
            $this.classed('is-fourth', hours % 4 === 0);
            $this.classed('is-even', hours % 2 === 0);
        })
        .on('click', function(d, i) {
            timeline.selectAll('.ticks g').classed('is-active', false);
            timeline.select('.ticks g:nth-child(' + (i + 1) + ')').classed('is-active', true);
            dataLoader.setFrame(i).load();
            clearInterval(interval);
        });
    tick.append('rect')
        .attr('class', 'is-area')
        .attr('x', -5)
        .attr('y', -10)
        .attr('width', 10)
        .attr('height', 30);
    tick.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5);
    tick.append('text')
        .attr('dy', 20)
        .text(function(d, i) { return (new Date(parseInt(d.time, 10) * 1000).getHours() % 24) + ':00'; });


    // Levels

    var levels = d3.select('.footer_controls.is-levels').attr('width', 500).attr('height', 60);

    var ground = levels.append('g').append('g')
        .attr('transform', 'translate(20,30)')
        .attr('class', 'is-even is-fourth is-midnight')
        .on('click', function() {
            dataLoader.setLevel(-1).load();
            clearInterval(interval);
        });
    ground.append('rect')
        .attr('class', 'is-area')
        .attr('x', -5)
        .attr('y', -10)
        .attr('width', 10)
        .attr('height', 30);
    ground.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5);
    ground.append('text')
        .attr('dy', 20)
        .text('ground');

    var points = levels.append('g')
        .attr('transform', 'translate(60,0)')
        .selectAll('g')
        .data(new Array(39));
    var tick = points.enter().append('g')
        .attr('transform', function(d, i) { return 'translate(' + (i*10) + ',30)'; })
        .each(function(d, i) {
            d3.select(this).classed('is-fourth', i%4 === 0);
            d3.select(this).classed('is-even', i%2 === 0);
        })
        .on('click', function(d, i) {
            points.selectAll('g').classed('is-active', false);
            points.select('g:nth-child(' + (i + 1) + ')').classed('is-active', true);
            dataLoader.setLevel(i).load();
            clearInterval(interval);
        });
    tick.append('rect')
        .attr('class', 'is-area')
        .attr('x', -5)
        .attr('y', -10)
        .attr('width', 10)
        .attr('height', 30);
    tick.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5);
    tick.append('text')
        .attr('dy', 20)
        .text(function(d, i) { return i; });


    var hoursSinceLastUpdate = Math.round((Date.now() / 1000 - frames[0].time) / 3600);
    dataLoader.setFrame(clamp(hoursSinceLastUpdate, 0, frames.length - 1));

    dataLoader.load().then(function() {

        // var frame = 0;
        // interval = setInterval(function() {
        //     dataLoader.setFrame(++frame % 72).load();
        // }, 1000);

        elContainer.classList.add('is-active');

    }).done();

});




function loadMap() {

    var deferred = Q.defer();

    /**
     * Show D3 map overlay
     */

    d3.json('world-50m.json', function(err, world) {

        if (err) {
            deferred.reject(err);
            return;
        }

        // TODO: Remove?
        var mainAspectRatio = elMain.clientWidth / elMain.clientHeight,
            containerAspectRatio = dataLoader.WIDTH / dataLoader.HEIGHT;

        if (mainAspectRatio > containerAspectRatio) {
            elContainer.style.width = (elMain.clientHeight * containerAspectRatio) + 'px';
            elContainer.style.height = elMain.clientHeight + 'px';
        } else {
            elContainer.style.width = elMain.clientWidth + 'px';
            elContainer.style.height = (elMain.clientWidth / containerAspectRatio) + 'px';
        }


        var width = elContainer.clientWidth,
            height = elContainer.clientHeight;

        var grid_center = {lat: 47.5, lon: 4};

        projection = d3.geo.conicConformal()
            // .center([47.5, 4])
            .center([44.5, 0]) // ?
            .scale(width)
            .rotate([-grid_center.lon, 0])
            .parallels([47.5, 47.5])
            // .translate([width/2, height/2])
            .precision(0.1);

        var path = d3.geo.path()
            .projection(projection);

        var graticule = d3.geo.graticule()
            .extent([[-90,0], [90, 90]])
            .step([5, 5]);



        /**
         * Adjust scale
         */

        var projTopLeft = projection(dataLoader.CORNERS.topLeft),
            projBottomRight = projection(dataLoader.CORNERS.bottomRight),
            upscale = elContainer.clientWidth / (projBottomRight[0] - projTopLeft[0]);
        projection
            .scale(width * upscale)
            .translate([width * upscale, height * upscale]);



        /**
         * Draw control dataframe
         */

        g.append('polyline')
            .attr('class', 'dataframe')
            .attr('points', [
                projection(dataLoader.CORNERS.topLeft),
                projection(dataLoader.CORNERS.topRight),
                projection(dataLoader.CORNERS.bottomRight),
                projection(dataLoader.CORNERS.bottomLeft),
                projection(dataLoader.CORNERS.topLeft)
            ].map(function (item) { return item.toString(); }).join(' '));



        var countries = g.append('g').attr('class', 'countries');

        graticulePath = g.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);

        countries.selectAll('path')
             .data(topojson.feature(world, world.objects.countries).features)
             .enter().append('path')
                        // .attr('class', 'country')
                        .attr('class', function(d,i) { return 'country country-' + d.id; })
                        .attr('d', path);

        deferred.resolve();

    });

    return deferred.promise;

}


loadMap();



Q(function() {

    return true;

}).then(function afterWorldLoaded() {

    /**
     * 1. Hide loading
     */

    document.querySelector('.loading').classList.remove('is-active');



    /**
     * 2. Setup canvases
     */

    // Temperature canvas
    tempCanvas = document.createElement('canvas');
    tempCtx = tempCanvas.getContext('2d');
    elContainer.appendChild(tempCanvas);

    // Buffer canvas
    buffer = document.createElement('canvas');
    bufferCtx = buffer.getContext('2d');

    // Heatmap canvas
    heatCanvas = document.createElement('canvas');
    heatCtx = buffer.getContext('2d');
    elContainer.appendChild(tempCanvas);
    heatCanvas.classList.add('heat');

    // Create canvas layers
    canvas = document.createElement('canvas');
    elContainer.appendChild(canvas);
    ctx = canvas.getContext('2d');



    /**
     * 3. Resize container
     */

    function resizeContainer() {

        var mainAspectRatio = elMain.clientWidth / elMain.clientHeight,
            containerAspectRatio = dataLoader.WIDTH / dataLoader.HEIGHT;

        if (mainAspectRatio > containerAspectRatio) {
            elContainer.style.width = (elMain.clientHeight * containerAspectRatio) + 'px';
            elContainer.style.height = elMain.clientHeight + 'px';
        } else {
            elContainer.style.width = elMain.clientWidth + 'px';
            elContainer.style.height = (elMain.clientWidth / containerAspectRatio) + 'px';
        }

        canvas.width  = buffer.width  = tempCanvas.width  = heatCanvas.width  = elContainer.clientWidth;
        canvas.height = buffer.height = tempCanvas.height = heatCanvas.height = elContainer.clientHeight;

        svg.attr('width', elContainer.clientWidth);
        svg.attr('height', elContainer.clientHeight);
        svg.attr('transform', 'translate(' + elContainer.clientWidth / 2 + ',' + elContainer.clientHeight / 2 + ')');

        options.maxParticles = elContainer.clientWidth * 6;

    }
    resizeContainer();
    window.addEventListener('resize', resizeContainer);



    // Start rendering
    render();

    // Mouse event
    var container = document.querySelector('.container'),
        header = document.querySelector('.header'),
        elDetails = document.querySelector('.details');


    // Cache elements
    var elWindIndicatorParent = document.querySelector('.details_item.is-wind'),
        elWindSpeedIndicator = document.querySelector('.data_wind10m_speed'),
        elWindDirectionIndicator = document.querySelector('.data_wind10m_dir'),
        elLatitudeIndicator = document.querySelector('.data_lat'),
        elLongitudeIndicator = document.querySelector('.data_lon'),
        elTemperatureIndicatorParent = document.querySelector('.details_item.is-temperature'),
        elTemperatureIndicator = document.querySelector('.data_temp2m');


    container.addEventListener('mousemove', function(e) {

        if (!dataLoader.ready) {
            return;
        }

        var offset = elContainer.getBoundingClientRect();
        var proj = projection.invert([
            e.pageX - offset.left - elContainer.clientWidth / 2,
            e.pageY - offset.top - elContainer.clientHeight / 2
        ]);
        var coords = [
            Math.floor((e.pageX - offset.left) / canvas.width * dataLoader.WIDTH),
            Math.floor((e.pageY - offset.top) / canvas.height * dataLoader.HEIGHT),
        ];


        var scale = d3.scale.linear()
                        .domain([-14, 28])
                        .range([244,360]);
        var temp = Math.round(dataLoader.get('temp', coords[0], coords[1])*10)/10;

        elTemperatureIndicatorParent.style.color = 'rgb(' + tempToColor(temp) + ')';
        elTemperatureIndicator.innerHTML = (temp == Math.floor(temp)) ? temp + '.0' : temp;

        elLatitudeIndicator.innerHTML = Math.round(proj[1] * 100) / 100;
        elLongitudeIndicator.innerHTML = Math.round(proj[0] * 100) / 100;

        var u = dataLoader.get('wind_u', coords[0], coords[1]),
            v = dataLoader.get('wind_v', coords[0], coords[1]),
            speed = Math.round(Math.sqrt(u*u+v*v)*36)/10,
            dir = Math.round(360 - Math.atan2(v,u) / Math.PI * 180 - 90);

        var windScale = d3.scale.linear().domain([0,100]).range([0,55]);

        // elWindIndicatorParent.style.color = 'hsl(' + Math.floor(154 - speed*2) + ',55%,51%)';
        // elWindIndicatorParent.style.color = 'hsl(' + Math.floor(154 - speed*2) + ',55%,51%)';
        elWindSpeedIndicator.innerHTML = (speed == Math.floor(speed)) ? speed + '.0' : speed;
        elWindDirectionIndicator.style.webkitTransform = 'rotate(' + dir + 'deg)';
        elWindDirectionIndicator.style.mozTransform = 'rotate(' + dir + 'deg)';
        elWindDirectionIndicator.style.transform = 'rotate(' + dir + 'deg)';

    });

    container.addEventListener('mouseover', function(e) {
        elDetails.classList.add('is-active');
    });
    container.addEventListener('mouseout', function(e) {
        elDetails.classList.remove('is-active');
    });


}).done();