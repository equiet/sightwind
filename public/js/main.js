/*globals d3,topojson,Q*/
'use strict';



var now = Date.now(),
    timeDiff,
    lastTick = Date.now();

var options = {
    speedFactor: 0.04,
    lifeTime: 1000,
    lineWidth: 1,
    colorAlpha: 0.6,
    globalAlpha: 0.94,
    color: [
       '71,132,255',
       '110,118,233',
       '149,105,211',
       '189,92,190',
       '228,79,168',
       '255,71,154'
    ],
    criterion: 'temp2m',
    // startParticles: 1500,
    minParticles: 1500,
    maxParticles: 15000,
    minFPS: 15
};

var currentParticles = options.minParticles;


if (!!window.chrome) {
    options.startParticles = 8000;
}

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
    canvas = [],
    ctx = [],
    buffer,
    bufferCtx,
    tempCanvas,
    tempCtx;


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

    for (var i = 0; i < ctx.length; i++) {
        ctx[i].clearRect(0,0,canvas[i].width, canvas[i].height);
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

    }

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


    for (var i = 0; i < canvas.length; i++) {
        canvas[i].width = document.querySelector('.container').clientWidth;
        canvas[i].height = document.querySelector('.container').clientHeight;
        // ctx[i].setTransform(canvasMapWidth / canvas[i].width, 0, (canvas[i].width - canvasMapWidth) / 2,
        // canvasMapHeight / canvas[i].height, 0, (canvas[i].height - canvasMapHeight) / 2);
    }

    buffer.width = document.querySelector('.container').clientWidth;
    buffer.height = document.querySelector('.container').clientHeight;
    tempCanvas.width = document.querySelector('.container').clientWidth;
    tempCanvas.height = document.querySelector('.container').clientHeight;
    svg.attr("width", buffer.width);
    svg.attr("height", buffer.height);
    width = buffer.width;
    height = buffer.height;

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
    this.x = canvasOffset.x + Math.floor(Math.random() * canvasDim.width);
    this.y = canvasOffset.y + Math.floor(Math.random() * canvasDim.height);
    this.refreshCoords();
    this.lifeTime = lifeTime || now + options.lifeTime;
};
Particle.prototype.refreshCoords = function () {
    var coords = getDataCoords(this.x, this.y);
    this.dataCoordX = coords[0];
    this.dataCoordY = coords[1];
};
Particle.prototype.tick = function () {
    if (this.x > canvasOffset.x + canvasDim.width || this.x < canvasOffset.x ||
        this.y > canvasOffset.y + canvasDim.height || this.y < canvasOffset.y ||
        this.lifeTime < now) {
        this.reset();
    }
};
Particle.prototype.nextPositionX = function () {
    this.x = this.x + data.wind10m_u[this.dataCoordY*data.nx+this.dataCoordX] * timeDiff * options.speedFactor;
    return this.x;
};
Particle.prototype.nextPositionY = function () {
    this.y = this.y - data.wind10m_v[this.dataCoordY*data.nx+this.dataCoordX] * timeDiff * options.speedFactor;
    return this.y;
};



var particles = [],
    bounds = [];
function setupCanvas() {


    // Temperature canvas
    tempCanvas = document.createElement('canvas');
    document.querySelector('.container').appendChild(tempCanvas);
    tempCtx = tempCanvas.getContext('2d');


    // Create canvas layers
    for (var i = 0; i < options.color.length; i++) {
        canvas[i] = document.createElement('canvas');
        document.querySelector('.container').appendChild(canvas[i]);
        ctx[i] = canvas[i].getContext('2d');
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
        var coords = getDataCoords(e.pageX, e.pageY - header.clientHeight);
        var proj = projection([data.lon[coords[1]*data.nx+coords[0]], data.lat[coords[1]*data.nx+coords[0]]]);
        cursor.attr('transform', 'translate(' + proj + ')');
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                if (document.querySelector('.data_' + key)) {
                    if (key == 'lat' || key == 'lon') {
                      document.querySelector('.data_' + key).innerHTML = Math.round(data[key][coords[1]*data.nx+coords[0]]*100)/100;
                    } else {
                      document.querySelector('.data_' + key).innerHTML = Math.round(data[key][coords[1]*data.nx+coords[0]]*10)/10;
                    }
                }
            }
        }
        var u=data['wind10m_u'][coords[1]*data.nx+coords[0]];
        var v=data['wind10m_v'][coords[1]*data.nx+coords[0]];
  var speed=Math.round(Math.sqrt(u*u+v*v)*36)/10;
  var dir=Math.round(((360-Math.atan2(v,u)/Math.PI*180-90)%360)*10)/10;
        document.querySelector('.data_wind10m_speed').innerHTML = speed;
        document.querySelector('.data_wind10m_dir').innerHTML = dir;
    });

}


function setupBounds(criterion) {

    if (criterion) {
        options.criterion = criterion;
    }

    // Find min/max
    /*var min = Math.min.apply(null, data[options.criterion].map(function(item) {
        return Math.min.apply(null, item);
    })) - 0.1;
    var max = Math.max.apply(null, data[options.criterion].map(function(item) {
        return Math.max.apply(null, item);
    }));*/

    var min = 99999;
    var max = -99999;
    var nvals = data.nx*data.ny;
    for (i=0; i<nvals; i++) {
      var val=data[options.criterion][i];
      if (val < min) {
  min=val;
      } else if (val > max){
  max=val;
      }
    }

    // Find temp bounds
    var step = (max - min) / options.color.length;
    bounds = [];
    for (var i = 0; i < options.color.length; i++) {
        bounds.push({
           low: min + step * i,
           high: min + step * (i + 1)
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
       particles[j].refreshCoords();
       particles[j].tick();
    }

    for (var i = 0; i < canvas.length; i++) {

       bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
       bufferCtx.drawImage(canvas[i], 0, 0);
       ctx[i].clearRect(0, 0, canvas[i].width, canvas[i].height);
       ctx[i].drawImage(buffer, 0, 0);

       ctx[i].beginPath();

           ctx[i].lineWidth = options.lineWidth;
           ctx[i].strokeStyle = 'rgba(' + options.color[i] + ',' + options.colorAlpha + ')';

           for (var j = 0; j < currentParticles; j++) {
               var criterion = data[options.criterion][particles[j].dataCoordY*data.nx+particles[j].dataCoordX];
               if (bounds[i].low < criterion && criterion <= bounds[i].high) {
                   ctx[i].moveTo(particles[j].x, particles[j].y);
                   ctx[i].lineTo(particles[j].nextPositionX(), particles[j].nextPositionY());
               }
           }

       ctx[i].stroke();

    }

    /**
     * FPS counter
     */
    var fps=fpsCounter(1000 / (timeDiff * 16));

    ctx[0].clearRect(0, 0, 100, height);
    ctx[0].fillStyle = '#ffffff';
    ctx[0].fillText(fps, 0, height);
    ctx[0].fillText(currentParticles, 30, height);

    if (fps > options.minFPS) {
        currentParticles = Math.min(currentParticles + 100, options.maxParticles);
    } else {
        currentParticles = Math.max(currentParticles - 100, options.minParticles);
    }
}


NodeList.prototype.forEach = Array.prototype.forEach;
document.querySelectorAll('.menu a').forEach(function(el) {
    el.addEventListener('click', function(e) {
        e.preventDefault();
        setupBounds(el.dataset.criterion);
    });
});




init();

function init () {

  buffer = document.createElement('canvas');
  bufferCtx = buffer.getContext('2d');

}




function loadDataImage(param) {

  var deferred = Q.defer(),
      loadingText = document.getElementById('loading-text'),
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      img = new Image();

  loadingText.innerHTML += param + '<br>';

  canvas.width=data.nx;
  canvas.height=data.ny;

  img.onload = function() {

    ctx.drawImage(img, 0, 0);

    var imageData = ctx.getImageData(0,0, canvas.width, canvas.height);
    data[param] = new Float32Array(imageData.data.buffer);

    img = null;

    deferred.resolve();

  };

  img.src = 'data/data-' + param + '.png';

  return deferred.promise;

}

Q.all(dataParams.map(function(param) {
  return loadDataImage(param);
})).then(data_is_ready);

// function load_data_from_img (varname) {
//   loadingText.innerHTML+= varname + '<br>';
//   var img = new Image();
//   img.onload=function () {
//     var canvas = document.createElement("canvas");
//     canvas.width=data.nx;
//     canvas.height=data.ny;
//     var ctx=canvas.getContext("2d");
//     ctx.drawImage(img,0,0);
//     var imageData=ctx.getImageData(0,0, data.nx, data.ny);
//     data[varname] = new Float32Array(imageData.data.buffer);
//     imageData=null;
//     canvas=null;
//     img=null;
//     //TODO : implement bytes to float32 without typed arrays
//     for (var key in data) {
//       if (data[key] === false) {
//         load_data_from_img(key);
//         return;
//       }
//     }
//     data_is_ready();
//   };
//   img.src="data/data-"+varname+".png";
// }

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

  move();
  setupCanvas();
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
