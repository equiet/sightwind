var vertexShader = '' +
    'attribute float temperature;' +
    'varying float vTemperature;' +
    'void main() {' +
    '    vTemperature = temperature;' +
    '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);' +
    '}';

var fragmentShader = '' +
    'varying float vTemperature;' +
    'uniform vec3 startColor;' +
    'uniform vec3 endColor;' +
    'uniform float minTemperature;' +
    'uniform float maxTemperature;' +
    'void main() {' +
    '    vec3 mixed = mix(startColor, endColor, (vTemperature - minTemperature) / (maxTemperature - minTemperature) );' +
    '    gl_FragColor = vec4(mixed, 1.0);' +
    '}';


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
        minTemperature: { type: 'f', value: options.colorScale[0].color },
        maxTemperature: { type: 'f', value: options.colorScale[options.colorScale.length - 1].color }
    };

    // create the sphere's material
    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms:       uniforms,
        attributes:     attributes,
        vertexShader:   vertexShader,
        fragmentShader: fragmentShader
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



    var frame = 0;



    function render() {

        renderer.render(scene, camera);
        requestAnimationFrame(render);

    }
    render();


}