import { Scene, PerspectiveCamera, WebGLRenderer, MirroredRepeatWrapping, PlaneGeometry, TextureLoader, Vector3, MathUtils, PMREMGenerator, ShaderMaterial } from "three";
import { Water } from './objects/water'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { rocketModel, mothershipModel, addBackgroundBit, addChallengeRow, challengeRows, environmentBits, starterBay } from "./game/objects";
import { crystalUiElement, shieldUiElement } from "./game/ui";

export const scene = new Scene()
export const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
)
const sun = new Vector3();

let leftPressed = false;
let rightPressed = false;

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

// Scene configuration
export const sceneConfiguration = {
    /// Whether the scene is ready (i.e.: All models have been loaded and can be used)
    ready: false,
    /// Whether the camera is moving from the beginning circular pattern to behind the ship
    cameraMovingToStartPosition: false,
    /// Whether the rocket is moving forward
    rocketMoving: false,
    // backgroundMoving: false,
    /// Collected game data
    data: {
        /// How many crystals the player has collected on this run
        crystalsCollected: 0,
        /// How many shields the player has collected on this run (can be as low as -5 if player hits rocks)
        shieldsCollected: 0,
    },
    /// The length of the current level, increases as levels go up
    courseLength: 500,
    /// How far the player is through the current level, initialises to zero.
    courseProgress: 0,
    /// Whether the level has finished
    levelOver: false,
    /// The current level, initialises to one.
    level: 1,
    /// Gives the completion amount of the course thus far, from 0.0 to 1.0.
    coursePercentComplete: () => (sceneConfiguration.courseProgress / sceneConfiguration.courseLength),
    /// Whether the start animation is playing (the circular camera movement while looking at the ship)
    cameraStartAnimationPlaying: false,
    /// How many 'background bits' are in the scene (the cliffs)
    backgroundBitCount: 0,
    /// How many 'challenge rows' are in the scene (the rows that have rocks, shields, or crystals in them).
    challengeRowCount: 0,
    /// The current speed of the ship
    speed: 0.0
}

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

    // Set the appropriate scale for our rocket
    rocketModel.scale.set(0.3, 0.3, 0.3);
    scene.add(rocketModel);
    scene.add(mothershipModel);

    // Set the scale and location for our mothership (above the player)
    mothershipModel.position.y = 200;
    mothershipModel.position.z = 100;
    mothershipModel.scale.set(15,15,15);
    sceneConfiguration.ready = true;

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
}

// This scene setup function will be called every time the player starts a new level
export const sceneSetup = (level: number) => {
    // Remove all references to old "challenge rows" and background bits
    sceneConfiguration.challengeRowCount = 0;
    sceneConfiguration.backgroundBitCount = 0;

    // Reset the camera position back to slightly infront of the ship, for the start-up animation
    camera.position.z = 50;
    camera.position.y = 12;
    camera.position.x = 15;
    camera.rotation.y = 2.5;

    // Add the starter bay to the scene (the sandy shore with the rocks around it)
    scene.add(starterBay);

    // Set the starter bay position to be close to the ship
    starterBay.position.copy(new Vector3(10, 0, 120));

    // Rotate the rocket model back to the correct orientation to play the level
    rocketModel.rotation.x = Math.PI;
    rocketModel.rotation.z = Math.PI;

    // Set the location of the rocket model to be within the starter bay
    rocketModel.position.z = 70;
    rocketModel.position.y = 10;
    rocketModel.position.x = 0;

    // Remove any existing challenge rows from the scene
    challengeRows.forEach(x => {
        scene.remove(x.rowParent);
    });

    // Remove any existing environment bits from the scene
    environmentBits.forEach(x => {
        scene.remove(x);
    })

    // Setting the length of these arrays to zero clears the array of any values
    environmentBits.length = 0;
    challengeRows.length = 0;

    // Render some challenge rows and background bits into the distance
    for (let i = 0; i < 60; i++) {
        // debugger;
        addChallengeRow(sceneConfiguration.challengeRowCount++);
        addBackgroundBit(sceneConfiguration.backgroundBitCount++);
    }

    //Set the variables back to their beginning state

    // Indicates that the animation where the camera flies from the current position isn't playing
    sceneConfiguration.cameraStartAnimationPlaying = false;
    // The level isn't over (we just started it)
    sceneConfiguration.levelOver = false;
    // The rocket isn't flying away back to the mothership
    rocketModel.userData.flyingAway = false;
    // Resets the current progress of the course to 0, as we haven't yet started the level we're on
    sceneConfiguration.courseProgress = 0;
    // Sets the length of the course based on our current level
    sceneConfiguration.courseLength = 1000 * level;

    // Reset how many things we've collected in this level to zero
    sceneConfiguration.data.shieldsCollected = 0;
    sceneConfiguration.data.crystalsCollected = 0;

    // Updates the UI to show how many things we've collected to zero.
    crystalUiElement.innerText = String(sceneConfiguration.data.crystalsCollected);
    shieldUiElement.innerText = String(sceneConfiguration.data.shieldsCollected);

    // Sets the current level ID in the UI
    document.getElementById('levelIndicator')!.innerText = `LEVEL ${sceneConfiguration.level}`;
    // Indicates that the scene setup has completed, and the scene is now ready
    sceneConfiguration.ready = true;
}

function onKeyDown(event: KeyboardEvent) {
    console.log('keypress');
    let keyCode = event.which;
    if (keyCode == 37) {
        leftPressed = true;
    } else if (keyCode == 39) {
        rightPressed = true;
    }
}

function onKeyUp(event: KeyboardEvent) {
    let keyCode = event.which;
    if (keyCode == 37) {
        leftPressed = false;
    } else if (keyCode == 39) {
        rightPressed = false;
    }
}