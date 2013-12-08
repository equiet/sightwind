if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;
var camera, scene, renderer, materials = [], parameters, i, h, color;
var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;


var sphere, uniforms, attributes;

var particles;


/**
 * Speed up data
 */
// var newWindU = [];
// var newWindV = [];
// var i = 0, j = 0;
// wind_u.forEach(function (arr, y) {
//     if (y % 1 !== 0) return;
//     newWindU[i] = [];
//     newWindV[i] = [];
//     j = 0;
//     arr.forEach(function (arr, x) {
//         if (x % 1 !== 0) return;
//         newWindU[i][j] = wind_u[y][x];
//         newWindV[i][j] = wind_v[y][x];
//         j++;
//     });
//     i++;
// });
// wind_u = newWindU;
// wind_v = newWindV;

wind_u = data_wind10_u;
wind_v = data_wind10_v;


init();
animate();


function translateCoordX(x) {
    return (x / wind_u[0].length) * window.innerWidth - window.innerWidth / 2;
}
function translateCoordY(y) {
    return (y / wind_u.length) * window.innerHeight - window.innerHeight / 2;
}


/**
 * Init
 */

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.OrthographicCamera(
        - window.innerWidth / 2,    // left
        window.innerWidth / 2,      // right
        - window.innerHeight / 2,   // top
        window.innerHeight / 2,     // bottom
        0,                          // near
        1000                        // far
    );

    scene = new THREE.Scene();



    // var geometry = new THREE.Geometry();


    // var lineMaterial = new THREE.LineBasicMaterial({
    //     color: 0x0000ff
    // });




    // wind_u.forEach(function (arr, y) {
    //     arr.forEach(function (arr, x) {

    //         var material = new THREE.LineBasicMaterial({
    //             color: 0x0000ff
    //         });

    //         var geometry = new THREE.Geometry();
    //         geometry.vertices.push(new THREE.Vector3(
    //             x * scaleX - windowHalfX,
    //             y * scaleY - windowHalfY,
    //             0
    //         ));
    //         geometry.vertices.push(new THREE.Vector3(
    //             x * scaleX - windowHalfX + wind_u[y][x],
    //             y * scaleY - windowHalfY + wind_v[y][x]
    //         ), 0);

    //         scene.add(new THREE.Line(geometry, material));

    //     });
    // });



    // ========================================================


    attributes = {

        size: { type: 'f', value: [] },
        customColor: { type: 'c', value: [] }

    };

    uniforms = {

        amplitude: { type: "f", value: 1.0 },
        color:     { type: "c", value: new THREE.Color( 0xffffff ) },
        texture:   { type: "t", value: THREE.ImageUtils.loadTexture('spark.png') },

    };

    var shaderMaterial = new THREE.ShaderMaterial( {

        uniforms:       uniforms,
        attributes:     attributes,
        vertexShader:   document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

        blending:       THREE.AdditiveBlending,
        depthTest:      false,
        transparent:    true

    });


    particles = new THREE.Geometry();

    var index = 0;

    wind_u.forEach(function (arr, y) {
        arr.forEach(function (arr, x) {

            var particle = new THREE.Vector3();
            particle.x = translateCoordX(x);
            particle.y = translateCoordY(y);
            particle.z = 0;
            particle.originalPosition = new THREE.Vector3(translateCoordX(x), translateCoordY(y), 0);
            particle.velocity = new THREE.Vector3(wind_u[y][x], wind_v[y][x], 0);
            particle.timeOffset = Math.random();

            particles.vertices[index] = particle;
            // attributes.size.value[index] = 10;
            attributes.size.value[index] = Math.abs(wind_u[y][x]) + Math.abs(wind_v[y][x]);
            attributes.customColor.value[index] = new THREE.Color(0x0E578D);

            index++;

        });
    });

    sphere = new THREE.ParticleSystem( particles, shaderMaterial );
    sphere.dynamic = true;
    scene.add( sphere );



    // ========================================================




    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    stats = new Stats();
    container.appendChild( stats.domElement );


    window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}


/**
 * Animate
 */


function animate() {

    var time = Date.now() / 1000;

    requestAnimationFrame( animate );

    var particle;

    for (var i = 0; i < particles.vertices.length; i++) {

        particle = particles.vertices[i];

        particle.add(particle.velocity);
        particle.x = particle.originalPosition.x + (particle.velocity.x * (time + particle.timeOffset)) % particle.velocity.x;
        particle.y = particle.originalPosition.y + (particle.velocity.y * (time + particle.timeOffset)) % particle.velocity.y;

    }


    sphere.geometry.verticesNeedUpdate = true;


    // for( var i = 0; i < attributes.size.value.length; i++ ) {
    //     sphere.geometry.vertices[i].x += 1;
    //     // attributes.size.value[ i ] = 14 + 13 * Math.sin( 1 * i + time );
    // }

    // attributes.size.needsUpdate = true;



    renderer.render( scene, camera );
    stats.update();

}