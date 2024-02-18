import { Scene, PerspectiveCamera, WebGLRenderer } from "three";

export const scene = new Scene()
export const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
)

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
}