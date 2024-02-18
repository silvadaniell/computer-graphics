import { Scene, PerspectiveCamera, WebGLRenderer, MirroredRepeatWrapping, PlaneGeometry, TextureLoader, Vector3, MathUtils, PMREMGenerator, ShaderMaterial } from "three";
import { Water } from './objects/water'
import { Sky } from 'three/examples/jsm/objects/Sky'

export const scene = new Scene()
export const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
)
const sun = new Vector3();

// Configure water settings
const waterGeometry = new PlaneGeometry(10000, 10000);
const water = new Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new TextureLoader().load('static/normals/waternormals.jpeg', function (texture) {
            texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
        }),
        sunDirection: new Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    }
);

// If the user changes tabs, we don't want to waste resources rendering
const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Our three renderer
let renderer: WebGLRenderer;

// This init function will carry out the initial setup for our scene
// and only runs once (when the game is first loaded)
async function init() {
    renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Configure the rotation and position of our water plane
    water.rotation.x = -Math.PI / 2;
    water.rotation.z = 0;
    scene.add(water);

    // Set up the skybox
    const sky = new Sky();
    sky.scale.setScalar(10000); // Specify the dimensions of the skybox
    scene.add(sky); // Add the sky to our scene

    // Set up variables to control the look of the sky
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 3,
        azimuth: 115
    };

    const pmremGenerator = new PMREMGenerator(renderer);

    const phi = MathUtils.degToRad(90 - parameters.elevation);
    const theta = MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    (water.material as ShaderMaterial).uniforms['sunDirection'].value.copy(sun).normalize();
    scene.environment = pmremGenerator.fromScene(sky as any).texture;

    (water.material as ShaderMaterial).uniforms['speed'].value = 0.0;
}