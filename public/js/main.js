/*globals d3,topojson,Q,THREE*/
'use strict';


var Dispatcher = new function() {

    var events = {};

    this.on = function(e, fn) {
        if (!events[e]) {
            events[e] = [];
        }
        if (events[e].indexOf(fn) === -1) {
            events[e].push(fn);
        }
    };
    this.off = function(e, fn) {
        if (!events[e]) {
            events[e] = [];
        }
        if (events.indexOf(fn) !== -1) {
            events.splice(events.indexOf(fn), 1);
        }
    };
    this.trigger = function(e) {
        if (!events[e]) {
            events[e] = [];
        }
        var args = Array.prototype.slice.call(arguments, 1);
        events[e].forEach(function(fn) {
            fn.apply(null, args);
        });
    };

}();



var now = Date.now(),
        timeDiff,
        lastTick = Date.now();

var options = {
        speedFactor: 0.03,
        lifeTime: 1000,
        lineWidth: 1,
        colorAlpha: 0.6,
        globalAlpha: 0.96,
        color: [
             '71,132,255',
             '110,118,233',
             '149,105,211',
             '189,92,190',
             '228,79,168',
             '255,71,154'
        ],
        criterion: 'temp2m',
        minParticles: 500,
        maxParticles: 5000,
        minFPS: 20
};

var currentParticles = options.minParticles;


var t = [0, 0],
    s = 1;


var svg, projection, g, graticulePath;




// var projection = d3.geo.mercator()
//     .scale(width)
//     .center([47.5, 4])
//     .rotate([-grid_center.lon, 0])
//     .translate([width, height])
//     .precision(.1);


var dataLoaded = false;




// var projection = d3.geo.mercator();





var elMain = document.querySelector('.main'),
    elContainer = document.querySelector('.container');

var canvasBuckets = [],
    ctxBuckets = [],
    buffer,
    bufferCtx,
    tempCanvas,
    tempCtx,
    heatCanvas,
    heatCtx;

var DATA_WIDTH = 495,
    DATA_HEIGHT = 309;

var DATA_CORNERS = {
    topLeft: [-45.6597900390625, 55.27363204956055],
    topRight: [53.409786224365234, 55.27363204956055],
    bottomLeft: [-24.60595703125, 26.117345809936523],
    bottomRight: [32.1064453125, 26.117345809936523]
};

var data;

var dataParams = ['wind10m_u', 'wind10m_v', 'temp2m'];


var projTopLeft, projBottomRight;
var gridSize;


var canvasDim;





function move() {

        if (d3.event) {
             t = d3.event.translate;
             s = d3.event.scale;
        } else {
             t = [0,0];
             s = 1;
        }

        s = 1; // TODO

        g.style("stroke-width", 1 / s).attr("transform", "translate(" + [t[0], t[1]] + ")scale(" + s + ")");
        graticulePath.style('stroke-width', 1/s);

        for (var i = 0; i < ctxBuckets.length; i++) {
            ctxBuckets[i].clearRect(0, 0, canvasBuckets[i].width, canvasBuckets[i].height);
        }

        canvasDim = {
             width: elContainer.clientWidth,
             height: elContainer.clientHeight
        };

}



function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}


function getDataCoords(x, y) {
    return [
        Math.floor(x / canvasDim.width * DATA_WIDTH),
        Math.floor(y / canvasDim.height * DATA_HEIGHT),
    ];
}




function Particle(x, y) {
    this.reset(Math.floor(now + Math.random() * options.lifeTime));
}
Particle.prototype.reset = function (lifeTime) {
    this.x = Math.floor(Math.random() * canvasDim.width);
    this.y = Math.floor(Math.random() * canvasDim.height);
    this.refreshCoords();
    this.lifeTime = lifeTime || now + options.lifeTime;
};
Particle.prototype.tick = function () {
    if (this.x > canvasDim.width || this.x < 0 ||
        this.y > canvasDim.height || this.y < 0 ||
        this.lifeTime < now) {
        this.reset();
    }
};
Particle.prototype.refreshCoords = function () {
    this.dataCoordX = Math.floor(this.x / canvasDim.width * DATA_WIDTH);
    this.dataCoordY = Math.floor(this.y / canvasDim.height * DATA_HEIGHT);
};
Particle.prototype.nextPositionX = function () {
    this.x = this.x + data.wind10m_u[this.dataCoordY*DATA_WIDTH+this.dataCoordX] * timeDiff * options.speedFactor * s;
    return this.x;
};
Particle.prototype.nextPositionY = function () {
    this.y = this.y - data.wind10m_v[this.dataCoordY*DATA_WIDTH+this.dataCoordX] * timeDiff * options.speedFactor * s;
    return this.y;
};



var particles = [],
    bounds = [],
    boundsMin,
    boundsMax;


function setupBounds(criterion) {

    // Find min/max
    boundsMin = Infinity;
    boundsMax = -Infinity;
    for (var i = 0; i < data[criterion].length; i++) {
        var val = data[criterion][i];
        boundsMin = Math.min(boundsMin, val);
        boundsMax = Math.max(boundsMax, val);
    }

    // TODO find global min, max
    boundsMin = -10;
    boundsMax = 25;

    // Find temp bounds
    var step = (boundsMax - boundsMin) / options.color.length;
    bounds = [];
    for (var i = 0; i < options.color.length; i++) {
        bounds.push({
             low: boundsMin + step * i,
             high: boundsMin + step * (i + 1)
        });
    }

}



var fpsCounter = function() {
    var fps = 0;
    return function (newFps) {
            fps = (fps * 4 + newFps) / 5;
            return Math.floor(fps * 10) / 10;
    };
}();


function render() {

    requestAnimationFrame(render);

    if (!data) {
        return;
    }

    now = Date.now();
    timeDiff = (Date.now() - lastTick) / 16; // timeDiff should be near 1 at 60fps
    lastTick = now;


    bufferCtx.globalAlpha = options.globalAlpha;

    for (var j = 0; j < currentParticles; j++) {
       particles[j].tick();
       particles[j].refreshCoords();
    }

    for (var i = 0; i < canvasBuckets.length; i++) {

        bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
        bufferCtx.drawImage(canvasBuckets[i], 0, 0);
        ctxBuckets[i].clearRect(0, 0, canvasBuckets[i].width, canvasBuckets[i].height);
        ctxBuckets[i].drawImage(buffer, 0, 0);

        ctxBuckets[i].beginPath();

        ctxBuckets[i].lineWidth = options.lineWidth;
        ctxBuckets[i].strokeStyle = 'rgba(' + options.color[i] + ',' + options.colorAlpha + ')';

        for (var j = 0; j < currentParticles; j++) {
            var criterion = data[options.criterion][particles[j].dataCoordY*DATA_WIDTH+particles[j].dataCoordX];
            if (bounds[i].low <= criterion && criterion < bounds[i].high) {
                ctxBuckets[i].moveTo(particles[j].x, particles[j].y);
                ctxBuckets[i].lineTo(particles[j].nextPositionX(), particles[j].nextPositionY());
            }
        }

        ctxBuckets[i].stroke();

    }



    /**
     * FPS counter
     */
     var fps = fpsCounter(1000 / (timeDiff * 16));

     ctxBuckets[0].clearRect(0, 0, 100, elContainer.clientHeight);
     ctxBuckets[0].fillStyle = '#ffffff';
     ctxBuckets[0].fillText(fps, 0, elContainer.clientHeight);
     ctxBuckets[0].fillText(currentParticles, 30, elContainer.clientHeight);

     if (fps > options.minFPS) {
        currentParticles = Math.min(currentParticles + 100, options.maxParticles);
    } else {
        currentParticles = Math.max(currentParticles - 100, options.minParticles);
    }

}


// NodeList.prototype.forEach = Array.prototype.forEach;
// document.querySelectorAll('.header_nav a').forEach(function(el) {
//     el.addEventListener('click', function(e) {
//         e.preventDefault();
//         setupBounds(el.dataset.criterion);
//     });
// });



function loadData(frame) {

    var tmpData = {};

    document.querySelector('.loading').classList.add('is-active');

    /**
     * Load image
     */

    function loadDataImage(param) {

        var deferred = Q.defer(),
            loadCanvas = document.createElement('canvas'),
            loadCtx = loadCanvas.getContext('2d'),
            img = new Image();

        loadCanvas.width = DATA_WIDTH;
        loadCanvas.height = DATA_HEIGHT;

        img.onload = function() {

            loadCtx.drawImage(img, 0, 0);

            var imageData = loadCtx.getImageData(0,0, loadCanvas.width, loadCanvas.height);
            tmpData[param] = new Float32Array(imageData.data.buffer);

            img = null;

            deferred.resolve();

        };

        img.src = 'data/data-' + param + '_' + frame + '.png';

        return deferred.promise;

    }



    /**
     * Promise for all images
     */

    return Q.all(dataParams.map(function(param) {

        return loadDataImage(param);

    })).then(function() {

        data = tmpData;
        setupBounds('temp2m');
        dataLoaded = true;

        document.querySelectorAll('.timeline li').forEach(function(el) {
            el.classList.remove('is-active');
        });
        document.querySelector('.timeline li[data-frame="' + frame + '"]').classList.add('is-active');

        document.querySelector('.loading').classList.remove('is-active');

    });

}


d3.csv('data/frames.csv', function(err, rows) {

    console.log(arguments)

    if (err) {
        triggerError('Couldn\'t load data');
        return;
    }

    var interval;

    document.querySelector('.last-update').innerHTML = new Date(rows[0].time * 1000).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });

    NodeList.prototype.forEach = Array.prototype.forEach;

    var elFooter = document.querySelector('.footer');
    elFooter.innerHTML =
        '<ul class="timeline">' +
            rows.map(function(row, index) {
                var date = new Date(parseInt(row.time, 10) * 1000);
                if (date.getHours() % 24 === 0) {
                    return '<li data-frame="' + row.frame + '" data-time="' + row.time + '" class="is-midnight is-down">' +
                        '<span>' + date.toDateString().slice(4, 10) + '</span>' +
                        '</li>';
                } else {
                    return '<li data-frame="' + row.frame + '" data-time="' + row.time + '" class="is-' + (date.getHours() % 4 === 2 ? 'up' : '') + ' is-' + (date.getHours() % 4 === 0 ? 'down' : '') + '">' +
                        '<span>' + date.getHours() % 24 + ':00</span>' +
                        '</li>';
                }
            }).join('') +
        '</ul>';

    elFooter.querySelectorAll('li').forEach(function(el) {
        el.addEventListener('click', function(e) {
            loadData(parseInt(el.dataset.frame, 10));
            clearInterval(interval);
        });
    });


    var hoursSinceLastUpdate = Math.round((Date.now() / 1000 - rows[0].time) / 3600),
        currentFrame = clamp(hoursSinceLastUpdate, 0, 72);

    loadData(currentFrame).then(function() {

        // runWebGL();

        // var frame = 0;
        // interval = setInterval(function() {
        //     loadData(++frame % 72);
        // }, 1000);

        elContainer.classList.add('is-active');

    });

});



Q(function() {

    return true;

}).then(function loadMap() {

    var deferred = Q.defer();

    /**
     * Show D3 map overlay
     */

    d3.json('world-50m.json', function(err, world) {

        if (err) {
            deferred.reject(err);
            return;
        }


        var mainAspectRatio = elMain.clientWidth / elMain.clientHeight,
            containerAspectRatio = DATA_WIDTH / DATA_HEIGHT;

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

        var zoom = d3.behavior.zoom()
            .center([width/2, height/2])
            .scaleExtent([0, 3])
            .on("zoom", move);

        var graticule = d3.geo.graticule()
            .extent([[-90,0], [90, 90]])
            .step([5, 5]);

        svg = d3.select("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
            .call(zoom);
        g = svg.append('g');


        /**
         * Adjust scale
         */

        projTopLeft = projection(DATA_CORNERS.topLeft);
        projBottomRight = projection(DATA_CORNERS.bottomRight);

        var upscale = elContainer.clientWidth / (projBottomRight[0] - projTopLeft[0]);
        projection
            .scale(width * upscale)
            .translate([width * upscale, height * upscale]);



        /**
         * Draw control dataframe
         */

        g.append('polyline')
            .attr('class', 'dataframe')
            .attr('points', [
                projection(DATA_CORNERS.topLeft),
                projection(DATA_CORNERS.topRight),
                projection(DATA_CORNERS.bottomRight),
                projection(DATA_CORNERS.bottomLeft),
                projection(DATA_CORNERS.topLeft)
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
                        .attr('class', function(d,i) { return 'country countr-' + d.id; })
                        .attr('d', path);

        deferred.resolve();

    });

    return deferred.promise;

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
    for (var i = 0; i < options.color.length; i++) {
        canvasBuckets[i] = document.createElement('canvas');
        elContainer.appendChild(canvasBuckets[i]);
        ctxBuckets[i] = canvasBuckets[i].getContext('2d');
    }



    /**
     * 3. Resize container
     */

    function resizeContainer() {

        var mainAspectRatio = elMain.clientWidth / elMain.clientHeight,
            containerAspectRatio = DATA_WIDTH / DATA_HEIGHT;

        if (mainAspectRatio > containerAspectRatio) {
            elContainer.style.width = (elMain.clientHeight * containerAspectRatio) + 'px';
            elContainer.style.height = elMain.clientHeight + 'px';
        } else {
            elContainer.style.width = elMain.clientWidth + 'px';
            elContainer.style.height = (elMain.clientWidth / containerAspectRatio) + 'px';
        }

        for (var i = 0; i < canvasBuckets.length; i++) {
            canvasBuckets[i].width = elContainer.clientWidth;
            canvasBuckets[i].height = elContainer.clientHeight;
        }
        buffer.width  = tempCanvas.width  = heatCanvas.width  = elContainer.clientWidth;
        buffer.height = tempCanvas.height = heatCanvas.height = elContainer.clientHeight;

        svg.attr('width', elContainer.clientWidth);
        svg.attr('height', elContainer.clientHeight);

        options.maxParticles = elContainer.clientWidth * 6;

    }
    resizeContainer();
    window.addEventListener('resize', resizeContainer);




    move();








    // Create particles
    for (var i = 0; i < options.maxParticles; i++) {
        particles[i] = new Particle();
    }


    // Start rendering
    render();

    // Mouse event
    var container = document.querySelector('.container'),
        header = document.querySelector('.header'),
        elDetails = document.querySelector('.details');

    container.addEventListener('mousemove', function(e) {

        if (!dataLoaded) {
            return;
        }

        var offset = elContainer.getBoundingClientRect();
        var proj = projection.invert([
            e.pageX - offset.left - elContainer.clientWidth / 2 - t[0],
            e.pageY - offset.top - elContainer.clientHeight / 2 - t[1]
        ]);
        var coords = getDataCoords(e.pageX - offset.left, e.pageY - offset.top);

        dataParams.forEach(function(value) {
            if (document.querySelector('.data_' + value)) {
                document.querySelector('.data_' + value).innerHTML = Math.round(data[value][coords[1]*DATA_WIDTH+coords[0]]*10)/10;
            }
        });
        document.querySelector('.data_lat').innerHTML = Math.round(proj[1] * 100) / 100;
        document.querySelector('.data_lon').innerHTML = Math.round(proj[0] * 100) / 100;

        var u = data['wind10m_u'][coords[1]*DATA_WIDTH+coords[0]],
            v = data['wind10m_v'][coords[1]*DATA_WIDTH+coords[0]],
            speed = Math.round(Math.sqrt(u*u+v*v)*36)/10,
            dir = Math.round(360 - Math.atan2(v,u) / Math.PI * 180 - 90);

        document.querySelector('.data_wind10m_speed').innerHTML = speed;
        document.querySelector('.data_wind10m_dir').style.webkitTransform = 'rotate(' + dir + 'deg)';
        document.querySelector('.data_wind10m_dir').style.mozTransform = 'rotate(' + dir + 'deg)';
        document.querySelector('.data_wind10m_dir').style.transform = 'rotate(' + dir + 'deg)';

    });

    container.addEventListener('mouseover', function(e) {
        elDetails.classList.add('is-active');
    });
    container.addEventListener('mouseout', function(e) {
        elDetails.classList.remove('is-active');
    });


}).done();




function runWebGL() {

    var $container = document.querySelector('.container');

    // set the scene size
    var WIDTH = $container.clientWidth,
        HEIGHT = $container.clientHeight;


    // create a WebGL renderer, camera
    // and a scene
    var renderer = new THREE.WebGLRenderer();
    var camera = new THREE.OrthographicCamera( WIDTH / -2, WIDTH / 2, HEIGHT / 2, HEIGHT / -2, 0, 1000);
    var scene = new THREE.Scene();

    // the camera starts at 0,0,0 so pull it back
    camera.position.z = 100;

    // start the renderer
    renderer.setSize(WIDTH, HEIGHT);

    // attach the render-supplied DOM element
    $container.appendChild(renderer.domElement);
    renderer.domElement.classList.add('is-heatmap');

    var attributes = {
        temperature: { type: 'f', value: [] },
    };

    var uniforms = {
        startColor: { type: 'c', value: new THREE.Color(0x124156) },
        endColor: { type: 'c', value: new THREE.Color(0x1e0829) },
        // endColor: { type: 'c', value: new THREE.Color(0x1e0829) },
        minTemperature: { type: 'f', value: boundsMin },
        maxTemperature: { type: 'f', value: boundsMax }
    };

    // create the sphere's material
    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms:       uniforms,
        attributes:     attributes,
        vertexShader:   document.querySelector('#vertexshader').innerHTML,
        fragmentShader: document.querySelector('#fragmentshader').innerHTML
    });

    // set up the sphere vars
    var radius = 50, segments = 16, rings = 16;


    var geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, DATA_WIDTH - 1, DATA_HEIGHT - 1);
    var plane = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(plane);


    // // now populate the array of attributes
    for (var v = 0; v < plane.geometry.vertices.length; v++) {
        attributes.temperature.value[v] = data.temp2m[v];
    }


    Dispatcher.on('move', function() {
        // camera.position.x = t[0];
        // camera.position.y = t[1];
    });



    var frame = 0;



    function render() {

        renderer.render(scene, camera);
        // requestAnimationFrame(render);

    }
    render();

    // move();

}




function update_time(frame_time) {
    var timeText = document.getElementById("time-text");
    var d = new Date(0);
    d.setUTCMilliseconds(frame_time*1000);
    var hour=d.getHours();
    var minutes=d.getMinutes();
    if (hour < 10) hour = "0"+hour;
    if (minutes < 10) minutes = "0"+minutes;
    timeText.innerHTML=d.toLocaleDateString()+", "+hour+":"+minutes;
    var tz=-1*d.getTimezoneOffset()/60;
    if (tz > 0) {
        timeText.innerHTML+=" UTC+"+tz;
    } else {
        tz *= -1;
        timeText.innerHTML+=" UTC-"+tz;
    }
}
