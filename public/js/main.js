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
        speedFactor: 0.05,
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
        minParticles: 1500,
        maxParticles: 10000,
        minFPS: 20
};

var currentParticles = options.minParticles;


var t, s;
var mouseBuffer = {x: 0, y: 0};




var width = document.querySelector('.container').clientWidth,
    height = document.querySelector('.container').clientHeight;

var grid_center = {lat: 47.5, lon: 4};

var projection = d3.geo.conicConformal()
                                .center([47.5, 4])
                                .scale(width)
                                .rotate([-grid_center.lon, 0])
                                .parallels([47.5, 47.5])
                                .translate([width, height])
                                .precision(0.1);

// var projection = d3.geo.mercator()
//     .scale(width)
//     .center([47.5, 4])
//     .rotate([-grid_center.lon, 0])
//     .translate([width, height])
//     .precision(.1);






// var projection = d3.geo.mercator();

var path = d3.geo.path()
.projection(projection);

var zoom = d3.behavior.zoom()
        .center([width/2, height/2])
        .scaleExtent([0, 3])
        .on("zoom", move);


var graticule = d3.geo.graticule()
        .extent([[-90,0], [90, 90]])
        .step([5, 5]);

var svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
             .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
             .call(zoom);
var g = svg.append('g');


// var center = projection([grid_center.lon, grid_center.lat]),
//     bottomLeft = projection([-24.6064, 26.3683]),
//     topRight = projection([4 + (4 + 24.6064), (47.5 + (47.5 - 26.3683))]); // 48, 60


var countries = g.append('g').attr('class', 'countries');

var graticulePath = g.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path);

var cursor = g.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('class', 'cursor');




var container = document.querySelector('.container'),
        canvasBuckets = [],
        ctxBuckets = [],
        buffer,
        bufferCtx,
        tempCanvas,
        tempCtx,
        heatCanvas,
        heatCtx;


var dataLoaded = false;

var data = {
    nx: 495,
    ny: 309,
    lat: false,
    lon: false,
    wind10m_u: false,
    wind10m_v: false,
    temp2m: false,
    press: false,
    rain: false,
    topo: false
};

var dataParams = ['lat', 'lon', 'wind10m_u', 'wind10m_v', 'temp2m', 'press', 'rain', 'topo'];


var projTopLeft, projBottomRight;
var gridSize;
var corners;


var canvasDim, canvasOffset;
//move();



d3.json('data/world-50m.json', function(error, world) {

        countries.selectAll('path')
             .data(topojson.feature(world, world.objects.countries).features)
             .enter().append('path')
                        // .attr('class', 'country')
                        .attr('class', function(d,i) { return 'country countr-' + d.id; })
                        .attr('d', path);

});





function move() {

        if (d3.event) {
             t = d3.event.translate;
             s = d3.event.scale;
        } else {
             t = [0,0];
             s = 1;
        }


        // var originalT = [t[0], t[1]];
        // mouseBuffer.x = originalT[0] - t[0];
        // mouseBuffer.y = originalT[1] - t[1];
        // t[0] = clamp(t[0] - mouseBuffer.x, (width - canvasDim.width) / 2, -(width - canvasDim.width) / 2);
        // t[1] = clamp(t[1] - mouseBuffer.y, (height - canvasDim.height) / 2, -(height - canvasDim.height) / 2);
        // if (width > canvasDim.width) {
        //     t[0] = 0;
        // }
        // if (height > canvasDim.height) {
        //     t[1] = 1;
        // }


        g.style("stroke-width", 1 / s).attr("transform", "translate(" + [t[0],t[1]] + ")scale(" + s + ")");

        graticulePath.style('stroke-width', 1/s);

        for (var i = 0; i < ctxBuckets.length; i++) {
            ctxBuckets[i].clearRect(0, 0, canvasBuckets[i].width, canvasBuckets[i].height);
        }

        if (dataLoaded) {

                canvasDim = {
                     width: (projBottomRight[0] - projTopLeft[0]) * s,
                     height: -(projTopLeft[1] - projBottomRight[1]) * s
                };
                canvasOffset = {
                     x: width / 2 + projTopLeft[0] * s + t[0],
                     y: height / 2 + projTopLeft[1] * s + t[1]
                };
                for (var i = 0; i < canvasBuckets.length; i++) {
                    canvasBuckets[i].width = canvasDim.width;
                    canvasBuckets[i].height = canvasDim.height;
                    canvasBuckets[i].style.webkitTransform = 'translate(' + canvasOffset.x + 'px,' + canvasOffset.y + 'px)';
                }
                buffer.width = canvasDim.width;
                buffer.height = canvasDim.height;

                var webglCanvas = document.querySelector('canvas.is-heatmap');
                if (webglCanvas) {
                    webglCanvas.width = canvasDim.width;
                    webglCanvas.height = canvasDim.height;
                    webglCanvas.style.webkitTransform = 'translate(' + canvasOffset.x + 'px,' + canvasOffset.y + 'px)';
                }
                // canvasOffset = {x: 0, y: 0};

        }

        Dispatcher.trigger('move');

}



function resizeCanvas() {

    var windowAspectRatio = window.innerWidth / window.innerHeight,
        containerAspectRatio = container.clientWidth / container.clientHeight;

    if (windowAspectRatio > containerAspectRatio) {
        container.style.width = (window.innerHeight * containerAspectRatio) + 'px';
        container.style.height = window.innerHeight + 'px';
    } else {
        container.style.width = window.innerWidth + 'px';
        container.style.height = (window.innerWidth / containerAspectRatio) + 'px';
    }

    // TODO..........
    container.style.width = width + 'px';
    container.style.height = height + 'px';


    for (var i = 0; i < canvasBuckets.length; i++) {
        canvasBuckets[i].width = document.querySelector('.container').clientWidth;
        canvasBuckets[i].height = document.querySelector('.container').clientHeight;
    }

    buffer.width = document.querySelector('.container').clientWidth;
    buffer.height = document.querySelector('.container').clientHeight;
    tempCanvas.width = document.querySelector('.container').clientWidth;
    tempCanvas.height = document.querySelector('.container').clientHeight;
    heatCanvas.width = document.querySelector('.container').clientWidth;
    heatCanvas.height = document.querySelector('.container').clientHeight;
    svg.attr("width", buffer.width);
    svg.attr("height", buffer.height);
    // width = buffer.width;
    // height = buffer.height;

}
window.addEventListener('resize', resizeCanvas);



function clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
}


function getDataCoords(x, y) {
    return [
        Math.floor(clamp((x - canvasOffset.x) / canvasDim.width, 0, 1) * data.nx),
        data.ny - Math.floor(clamp((y - canvasOffset.y) / canvasDim.height, 0, 1) * data.ny) -1,
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
    this.dataCoordX = Math.floor(this.x / canvasDim.width * data.nx);
    this.dataCoordY = data.ny - Math.floor(this.y / canvasDim.height * data.ny) - 1;
};
Particle.prototype.nextPositionX = function () {
    this.x = this.x + data.wind10m_u[this.dataCoordY*data.nx+this.dataCoordX] * timeDiff * options.speedFactor * s;
    return this.x;
};
Particle.prototype.nextPositionY = function () {
    this.y = this.y - data.wind10m_v[this.dataCoordY*data.nx+this.dataCoordX] * timeDiff * options.speedFactor * s;
    return this.y;
};



var particles = [],
    bounds = [],
    boundsMin,
    boundsMax;


function setupBounds(criterion) {

        if (criterion) {
            options.criterion = criterion;
        }

        // Find min/max
        boundsMin = Infinity,
        boundsMax = -Infinity;
        for (var i = 0; i < data[options.criterion].length; i++) {
            var val = data[options.criterion][i];
            boundsMin = Math.min(boundsMin, val);
            boundsMax = Math.max(boundsMax, val);
        }

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

    now = Date.now();
    timeDiff = (Date.now() - lastTick) / 16; // timeDiff should be near 1 at 60fps
    lastTick = now;

    requestAnimationFrame(render);

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
            var criterion = data[options.criterion][particles[j].dataCoordY*data.nx+particles[j].dataCoordX];
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

     ctxBuckets[0].clearRect(0, 0, 100, canvasDim.height);
     ctxBuckets[0].fillStyle = '#ffffff';
     ctxBuckets[0].fillText(fps, 0, canvasDim.height);
     ctxBuckets[0].fillText(currentParticles, 30, canvasDim.height);

     if (fps > options.minFPS) {
        currentParticles = Math.min(currentParticles + 100, options.maxParticles);
    } else {
        currentParticles = Math.max(currentParticles - 100, options.minParticles);
    }

}


NodeList.prototype.forEach = Array.prototype.forEach;
document.querySelectorAll('.header_nav a').forEach(function(el) {
    el.addEventListener('click', function(e) {
        e.preventDefault();
        setupBounds(el.dataset.criterion);
    });
});



function loadDataImage(param) {

    var deferred = Q.defer(),
        loadCanvas = document.createElement('canvas'),
        loadCtx = loadCanvas.getContext('2d'),
        img = new Image();

    loadCanvas.width = data.nx;
    loadCanvas.height = data.ny;

    img.onload = function() {

        loadCtx.drawImage(img, 0, 0);

        var imageData = loadCtx.getImageData(0,0, loadCanvas.width, loadCanvas.height);
        data[param] = new Float32Array(imageData.data.buffer);

        img = null;

        deferred.resolve();

    };

    img.src = 'data/data-' + param + '.png';

    return deferred.promise;

}

Q.all(dataParams.map(function(param) {
    return loadDataImage(param);
})).then(data_is_ready).done();


function data_is_ready() {


    loadingPopup.style.display='none';

    /** Data
        *    ^
        *  y |
        *    0 —->
        *      x
        */
    corners = {
        topLeft: [data.lon[data.nx*(data.ny-1)], data.lat[data.nx*(data.ny-1)]],
        topRight: [data.lon[data.ny*data.nx-1], data.lat[data.ny*data.nx-1]],
        bottomLeft: [data.lon[0], data.lat[0]],
        bottomRight: [data.lon[(data.nx-1)], data.lat[(data.nx-1)]],
    };


    projTopLeft = projection(corners.topLeft);
    projBottomRight = projection(corners.bottomRight);



    /**
     * Draw control dataframe
     */
    g.append('polyline')
            .attr('class', 'dataframe')
            .attr('points', [
                projection(corners.topLeft),
                projection(corners.topRight),
                projection(corners.bottomRight),
                projection(corners.bottomLeft),
                projection(corners.topLeft)
        ].map(function (item) { return item.toString(); }).join(' '));


    dataLoaded = true;



    // Temperature canvas
    tempCanvas = document.createElement('canvas');
    document.querySelector('.container').appendChild(tempCanvas);
    tempCtx = tempCanvas.getContext('2d');


    // Buffer canvas
    buffer = document.createElement('canvas');
    bufferCtx = buffer.getContext('2d');


    // Heatmap canvas
    heatCanvas = document.createElement('canvas');
    document.querySelector('.container').appendChild(tempCanvas);
    heatCanvas.classList.add('heat');
    heatCtx = buffer.getContext('2d');



    move();

    // heatCtx.fillStyle = "#ffffff";
    // heatCtx.fillRect(0, 0, 1000, 1000);


    // Create canvas layers
    for (var i = 0; i < options.color.length; i++) {
        canvasBuckets[i] = document.createElement('canvas');
        document.querySelector('.container').appendChild(canvasBuckets[i]);
        ctxBuckets[i] = canvasBuckets[i].getContext('2d');
    }

    // Resize canvas
    resizeCanvas();

    // Set which paramter will be colored
    setupBounds();


    // Create particles
    for (var i = 0; i < options.maxParticles; i++) {
        particles[i] = new Particle();
    }


    // Start rendering
    render();

    // Mouse event
    var container = document.querySelector('.container'),
        header = document.querySelector('.header');

    container.addEventListener('mousemove', function(e) {

        var coords = getDataCoords(e.pageX, e.pageY),
            proj = projection([data.lon[coords[1]*data.nx+coords[0]], data.lat[coords[1]*data.nx+coords[0]]]);

        cursor.attr('transform', 'translate(' + proj + ')');

        dataParams.forEach(function(value) {
            if (document.querySelector('.data_' + value)) {
                if (value == 'lat' || value == 'lon') {
                    document.querySelector('.data_' + value).innerHTML = Math.round(data[value][coords[1]*data.nx+coords[0]]*100)/100;
                } else {
                    document.querySelector('.data_' + value).innerHTML = Math.round(data[value][coords[1]*data.nx+coords[0]]*10)/10;
                }
            }
        });

        var u = data['wind10m_u'][coords[1]*data.nx+coords[0]],
            v = data['wind10m_v'][coords[1]*data.nx+coords[0]],
            speed = Math.round(Math.sqrt(u*u+v*v)*36)/10,
            dir = Math.round(((360-Math.atan2(v,u)/Math.PI*180-90)%360)*10)/10;

        document.querySelector('.data_wind10m_speed').innerHTML = speed;
        document.querySelector('.data_wind10m_dir').innerHTML = dir;

    });


    runWebGL();

    move();

}


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
        startColor: { type: 'c', value: new THREE.Color(0x09202a) },
        endColor: { type: 'c', value: new THREE.Color(0x1e0829) },
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

    // create a new mesh with sphere geometry -
    // we will cover the sphereMaterial next!

    // // My geometry
    // var geometry = new THREE.Geometry();

    // for ( var i = 0; i < 100; i++ ) {

    //     var vertex = new THREE.Vector3();
    //     vertex.x = Math.random() * 2 - 1;
    //     vertex.y = Math.random() * 2 - 1;
    //     vertex.z = Math.random() * 2 - 1;
    //     vertex.multiplyScalar( radius );

    //     geometry.vertices.push( vertex );

    // }
    //     geometry.faces.push(THREE.Face3(0,1,2));


    var geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, data.nx - 1, data.ny - 1);
    var plane = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(plane);

    scene.add(plane);

    // // now populate the array of attributes
    for (var v = 0; v < plane.geometry.vertices.length; v++) {
        var x = v % data.nx,
            y = Math.floor(v / data.nx);
        attributes.temperature.value[v] = data.temp2m[(data.ny - y) * data.nx + x];
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
