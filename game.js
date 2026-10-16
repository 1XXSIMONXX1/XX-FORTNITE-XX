// --- 1. SETUP SCENE, CAMERA, & RENDERER ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- 2. LIGHTING & GROUND ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// Ground Grid
const GRID_SIZE = 3; // Grid unit size (like Fortnite grid)
const groundGeo = new THREE.PlaneGeometry(120, 120);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x55aa55 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const gridHelper = new THREE.GridHelper(120, 40, 0x000000, 0x444444);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// --- 3. PLAYER & CONTROLS ---
camera.position.set(0, 2, 5);
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocityY = 0;
const gravity = -0.015;
let isGrounded = true;

// Pointer Lock for FPS Look
document.addEventListener("click", () => {
  if (document.pointerLockElement !== document.body) {
    document.body.requestPointerLock();
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    camera.rotation.y -= e.movementX * 0.002;
    // Pitch limit
    const pitch = camera.rotation.x - e.movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
  }
});

// --- 4. BUILDING SYSTEM ---
let currentBuildType = 1; // 1: Wall, 2: Ramp, 3: Floor
const buildObjects = []; // Stores placed structures

// Blue Preview Mesh (Blueprint)
const previewGeo = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, 0.2);
const previewMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.5 });
const previewMesh = new THREE.Mesh(previewGeo, previewMat);
scene.add(previewMesh);

// Helper to Snap Position to Grid
function snapToGrid(val) {
  return Math.floor((val + GRID_SIZE / 2) / GRID_SIZE) * GRID_SIZE;
}

// Raycaster to aim in front of camera
const raycaster = new THREE.Raycaster();

function updateBlueprint() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targetPos = new THREE.Vector3();
  raycaster.ray.at(4, targetPos); // Get point 4 units in front of camera

  let snappedX = snapToGrid(targetPos.x);
  let snappedZ = snapToGrid(targetPos.z);
  let snappedY = Math.max(GRID_SIZE / 2, snapToGrid(targetPos.y));

  previewMesh.position.set(snappedX, snappedY, snappedZ);

  // Rotate Preview based on build type
  if (currentBuildType === 1) { // Wall
    previewMesh.scale.set(1, 1, 0.05);
    previewMesh.rotation.set(0, 0, 0);
  } else if (currentBuildType === 2) { // Ramp
    previewMesh.scale.set(1, 1.4, 0.05);
    previewMesh.rotation.set(Math.PI / 4, 0, 0);
  } else if (currentBuildType === 3) { // Floor
    previewMesh.scale.set(1, 1, 0.05);
    previewMesh.rotation.set(Math.PI / 2, 0, 0);
    previewMesh.position.y = snappedY - GRID_SIZE / 2;
  }
}

// --- 5. INPUT CONTROLS ---
document.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") moveForward = true;
  if (e.code === "KeyS") moveBackward = true;
  if (e.code === "KeyA") moveLeft = true;
  if (e.code === "KeyD") moveRight = true;
  if (e.code === "Space" && isGrounded) { velocityY = 0.3; isGrounded = false; }
  
  if (e.key === "1") currentBuildType = 1;
  if (e.key === "2") currentBuildType = 2;
  if (e.key === "3") currentBuildType = 3;
});

document.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") moveForward = false;
  if (e.code === "KeyS") moveBackward = false;
  if (e.code === "KeyA") moveLeft = false;
  if (e.code === "KeyD") moveRight = false;
});

// Place Structure (Left Click) or Destroy Structure (Right Click)
document.addEventListener("mousedown", (e) => {
  if (document.pointerLockElement !== document.body) return;

  if (e.button === 0) { // Left Click: Place
    const buildGeo = previewMesh.geometry.clone();
    const buildMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.8 }); // Wood texture color
    const newBuild = new THREE.Mesh(buildGeo, buildMat);

    newBuild.position.copy(previewMesh.position);
    newBuild.rotation.copy(previewMesh.rotation);
    newBuild.scale.copy(previewMesh.scale);
    newBuild.castShadow = true;
    newBuild.receiveShadow = true;

    scene.add(newBuild);
    buildObjects.push(newBuild);
  } else if (e.button === 2) { // Right Click: Destroy Target
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(buildObjects);
    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      scene.remove(hitObj);
      buildObjects.splice(buildObjects.indexOf(hitObj), 1);
    }
  }
});

// Prevent context menu on right click
document.addEventListener("contextmenu", e => e.preventDefault());

// --- 6. GAME LOOP ---
function animate() {
  requestAnimationFrame(animate);

  // Movement physics
  const speed = 0.12;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const sideDir = new THREE.Vector3().crossVectors(camera.up, dir).negate();

  if (moveForward) camera.position.addScaledVector(dir, speed);
  if (moveBackward) camera.position.addScaledVector(dir, -speed);
  if (moveLeft) camera.position.addScaledVector(sideDir, -speed);
  if (moveRight) camera.position.addScaledVector(sideDir, speed);

  // Jump Gravity
  camera.position.y += velocityY;
  velocityY += gravity;
  if (camera.position.y <= 2) {
    camera.position.y = 2;
    velocityY = 0;
    isGrounded = true;
  }

  updateBlueprint();
  renderer.render(scene, camera);
}

animate();

// Handle Window Resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
