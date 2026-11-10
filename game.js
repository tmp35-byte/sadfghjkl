// FORZA HORIZON 6 ULTRA GRAPHICS ENGINE
// High-res skybox, procedural tire smoke, volumetric light shafts, reflective clearcoat & asphalt

const container = document.getElementById('game-container');
const speedValue = document.getElementById('speedValue');
const gearValue = document.getElementById('gearValue');
const nitroBar = document.getElementById('nitroBar');
const nitroPercent = document.getElementById('nitroPercent');
const driftPopup = document.getElementById('driftPopup');
const driftPoints = document.getElementById('driftPoints');
const driftMultiplier = document.getElementById('driftMultiplier');
const skillBadge = document.getElementById('skillBadge');
const driftScoreText = document.getElementById('driftScoreText');
const bestSpeedText = document.getElementById('bestSpeedText');
const xpText = document.getElementById('xpText');
const timeToggleBtn = document.getElementById('timeToggleBtn');
const viewToggleBtn = document.getElementById('viewToggleBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const carColorBtn = document.getElementById('carColorBtn');
const carSelectBtn = document.getElementById('carSelectBtn');
const currentCarName = document.getElementById('currentCarName');
const motionBlur = document.getElementById('motionBlur');
const rpmDots = document.querySelectorAll('.rpm-dot');

// ================= 1. RENDERER & HIGH-END POST-LIGHTING =================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xec9e69, 0.00085); // Cinematic sunset horizon haze

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Tone Mapping for Forza HDR Bloom / Color Depth
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Environment Sky Dome / Skybox Gradient
function createSkyDome() {
  const skyGeo = new THREE.SphereGeometry(2400, 32, 24);
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  // Dusk Sunset Gradient: Deep blue sky -> golden sunburst -> warm peach horizon
  grad.addColorStop(0.0, '#0c1b33');
  grad.addColorStop(0.4, '#3a2d54');
  grad.addColorStop(0.7, '#c9523e');
  grad.addColorStop(0.9, '#f39249');
  grad.addColorStop(1.0, '#fcd385');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);

  const skyTex = new THREE.CanvasTexture(canvas);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);
  return skyMat;
}
const skyMaterial = createSkyDome();

// Sun Light (Warm golden rays)
const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x1f2b3e, 0.85);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffe2b8, 2.6);
sunLight.position.set(220, 260, 180);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 850;
const d = 200;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0002;
scene.add(sunLight);

// ================= 2. PROCEDURAL HIGH-RES TEXTURES =================
function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c1e24';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro gravel noise
  for (let i = 0; i < 70000; i++) {
    const v = Math.floor(Math.random() * 50 + 20);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 1.5);
  }

  // Tar cracks & rubber tire marks
  ctx.fillStyle = 'rgba(10, 12, 16, 0.25)';
  for (let i = 0; i < 28; i++) {
    const y = Math.random() * 1024;
    ctx.fillRect(0, y, 1024, Math.random() * 14 + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 90);
  return texture;
}

function createGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#22471c';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 50000; i++) {
    const g = Math.floor(Math.random() * 65 + 60);
    const r = Math.floor(g * 0.48);
    ctx.fillStyle = `rgb(${r},${g},25)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(90, 90);
  return texture;
}

const asphaltTex = createAsphaltTexture();
const grassTex = createGrassTexture();

// ================= 3. VAST FORZA HORIZON OPEN WORLD =================
// Terrain Ground
const groundGeo = new THREE.PlaneGeometry(3800, 3800);
const groundMat = new THREE.MeshStandardMaterial({
  map: grassTex,
  roughness: 0.92,
  metalness: 0.04
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Highway Circuit Spline
const trackPoints = [
  new THREE.Vector3(0, 0.08, 0),
  new THREE.Vector3(450, 0.08, 280),
  new THREE.Vector3(950, 0.08, 160),
  new THREE.Vector3(1200, 0.08, -420),
  new THREE.Vector3(750, 0.08, -1050),
  new THREE.Vector3(0, 0.08, -1200),
  new THREE.Vector3(-750, 0.08, -950),
  new THREE.Vector3(-1100, 0.08, -320),
  new THREE.Vector3(-900, 0.08, 460),
  new THREE.Vector3(-400, 0.08, 550),
  new THREE.Vector3(0, 0.08, 0)
];

const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true);

// Asphalt Highway Mesh
const trackGeo = new THREE.TubeGeometry(trackCurve, 500, 22, 2, true);
trackGeo.scale(1, 0.015, 1);
const trackMat = new THREE.MeshStandardMaterial({
  map: asphaltTex,
  roughness: 0.58,
  metalness: 0.22
});
const trackMesh = new THREE.Mesh(trackGeo, trackMat);
trackMesh.receiveShadow = true;
scene.add(trackMesh);

// Center Highway Line (Double Yellow Lines)
const centerStripeGeo = new THREE.TubeGeometry(trackCurve, 500, 0.45, 2, true);
centerStripeGeo.scale(1, 0.025, 1);
const centerStripeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const centerStripe = new THREE.Mesh(centerStripeGeo, centerStripeMat);
centerStripe.position.y = 0.1;
scene.add(centerStripe);

// Broken White Lane Separator Markings (Left & Right Lanes)
const leftLaneGeo = new THREE.TubeGeometry(trackCurve, 500, 0.25, 2, true);
leftLaneGeo.scale(1, 0.02, 1);
const leftLaneMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
const leftLane = new THREE.Mesh(leftLaneGeo, leftLaneMat);
leftLane.position.set(0, 0.1, 0);
scene.add(leftLane);

// ================= OPEN WORLD LANDMARKS & DISTRICTS =================
// 1. HORIZON FESTIVAL MAIN HUB (Stages, Jumbotrons, Neon Floodlights)
function buildFestivalHub() {
  const hubGroup = new THREE.Group();
  hubGroup.position.set(0, 0, 40);

  // Main Concert Stage
  const stageMat = new THREE.MeshStandardMaterial({ color: 0x181a20, metalness: 0.9, roughness: 0.2 });
  const stage = new THREE.Mesh(new THREE.BoxGeometry(45, 8, 25), stageMat);
  stage.position.y = 4;
  hubGroup.add(stage);

  // Massive Jumbotron Screen
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(36, 16, 1), screenMat);
  screen.position.set(0, 18, 0);
  hubGroup.add(screen);

  // Festival Truss Towers with Golden Spotlights
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x33353d, metalness: 0.95 });
  const spotColors = [0xff007f, 0x00f0ff, 0xffcc00, 0x9d4edd];

  for (let i = -2; i <= 2; i++) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 28, 2), trussMat);
    tower.position.set(i * 18, 14, -12);
    hubGroup.add(tower);

    // Glowing floodlight head
    const spotHead = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new THREE.MeshBasicMaterial({ color: spotColors[(i + 2) % spotColors.length] }));
    spotHead.position.set(i * 18, 28, -12);
    hubGroup.add(spotHead);
  }

  scene.add(hubGroup);
}
buildFestivalHub();

// 2. MODERN HORIZON CITY DISTRICT (Modern Glass Skyscrapers along Eastern Highway)
function buildCityDistrict() {
  const cityGroup = new THREE.Group();
  cityGroup.position.set(750, 0, -250);

  const towerColors = [0x1a2639, 0x111e2e, 0x242d3d, 0x151c28];

  for (let x = -3; x <= 3; x++) {
    for (let z = -2; z <= 2; z++) {
      const h = 70 + Math.random() * 120;
      const w = 28 + Math.random() * 20;
      const d = 28 + Math.random() * 20;

      const towerMat = new THREE.MeshStandardMaterial({
        color: towerColors[Math.floor(Math.random() * towerColors.length)],
        metalness: 0.85,
        roughness: 0.15
      });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), towerMat);
      const posX = x * 65 + (Math.random() - 0.5) * 15;
      const posZ = z * 65 + (Math.random() - 0.5) * 15;
      tower.position.set(posX, h / 2, posZ);
      tower.castShadow = true;
      tower.receiveShadow = true;
      cityGroup.add(tower);

      // Register Skyscraper Hitbox
      worldColliders.push({
        type: 'box',
        minX: 750 + posX - w / 2 - 1.0,
        maxX: 750 + posX + w / 2 + 1.0,
        minZ: -250 + posZ - d / 2 - 1.0,
        maxZ: -250 + posZ + d / 2 + 1.0,
        name: 'Skyscraper'
      });

      // Rooftop Spire & Aviation Beacon
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.8, 18, 6), new THREE.MeshStandardMaterial({ color: 0x888888 }));
      spire.position.set(tower.position.x, h + 9, tower.position.z);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
      beacon.position.set(tower.position.x, h + 18, tower.position.z);
      cityGroup.add(spire, beacon);
    }
  }

  scene.add(cityGroup);
}
buildCityDistrict();

// 3. CANYON TUNNEL OVERPASS
function buildCanyonTunnel() {
  const tunnelGroup = new THREE.Group();
  tunnelGroup.position.set(-650, 0, -750);

  const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.9 });
  const arch1 = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 90, 16, 1, true, 0, Math.PI), tunnelMat);
  arch1.rotateZ(Math.PI / 2);
  arch1.position.y = 8;
  tunnelGroup.add(arch1);

  // Tunnel interior orange sodium lights
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  for (let i = -3; i <= 3; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 0.8), lightMat);
    strip.position.set(0, 27, i * 12);
    tunnelGroup.add(strip);
  }

  scene.add(tunnelGroup);
}
buildCanyonTunnel();

// Red/White Racing Rumble Curbs
const curb1Geo = new THREE.TubeGeometry(trackCurve, 500, 1.2, 2, true);
curb1Geo.scale(1, 0.032, 1);
const curbMat = new THREE.MeshStandardMaterial({ color: 0xe60000, roughness: 0.45 });
const curb1 = new THREE.Mesh(curb1Geo, curbMat);
curb1.position.set(0, 0.11, 0);
scene.add(curb1);

// Distant Alpine Mountain Ridge with Snow Peaks
function buildMountains() {
  const mGeo = new THREE.ConeGeometry(170, 320, 6);
  const mMat = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.9, flatShading: true });
  const snowGeo = new THREE.ConeGeometry(75, 130, 6);
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, flatShading: true });

  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const dist = 1450 + Math.random() * 320;
    const m = new THREE.Mesh(mGeo, mMat);
    m.position.set(Math.cos(angle) * dist, 140, Math.sin(angle) * dist);
    const scale = 1.3 + Math.random() * 1.8;
    m.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);

    const snow = new THREE.Mesh(snowGeo, snowMat);
    snow.position.set(0, 100, 0);
    m.add(snow);

    scene.add(m);
  }
}
buildMountains();

// World Static Obstacle Hitboxes (Trees, Festival Arches, Skyscraper Towers)
const worldColliders = [];

// Roadside Foliage: 320+ Detailed Pine Trees with Collision Hitboxes
function buildTrees() {
  const trunkGeo = new THREE.CylinderGeometry(0.65, 1.1, 5.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x362112, roughness: 0.9 });
  const foliageGeo1 = new THREE.ConeGeometry(4.8, 9.5, 7);
  const foliageGeo2 = new THREE.ConeGeometry(3.8, 8.5, 7);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x163817, roughness: 0.8, flatShading: true });

  for (let i = 0; i < 320; i++) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.75;
    trunk.castShadow = true;
    tree.add(trunk);

    const f1 = new THREE.Mesh(foliageGeo1, foliageMat);
    f1.position.y = 7.5;
    f1.castShadow = true;
    const f2 = new THREE.Mesh(foliageGeo2, foliageMat);
    f2.position.y = 12;
    f2.castShadow = true;
    tree.add(f1, f2);

    const rx = (Math.random() - 0.5) * 2400;
    const rz = (Math.random() - 0.5) * 2400;
    if (Math.hypot(rx, rz) > 52) {
      tree.position.set(rx, 0, rz);
      const s = 0.8 + Math.random() * 0.7;
      tree.scale.set(s, s, s);
      scene.add(tree);

      // Register Tree Hitbox (Cylinder radius ~1.8)
      worldColliders.push({
        type: 'circle',
        x: rx,
        z: rz,
        radius: 1.8 * s,
        name: 'Pine Tree'
      });
    }
  }
}
buildTrees();

// Festival Arches with Column Hitboxes
function createFestivalArch(x, z, rotY) {
  const arch = new THREE.Group();
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.95, roughness: 0.15 });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

  const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 20, 1.6), trussMat);
  p1.position.set(-22, 10, 0);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 20, 1.6), trussMat);
  p2.position.set(22, 10, 0);

  const top = new THREE.Mesh(new THREE.BoxGeometry(46, 3.5, 2.2), trussMat);
  top.position.set(0, 20, 0);

  const banner = new THREE.Mesh(new THREE.BoxGeometry(40, 2.5, 0.4), neonMat);
  banner.position.set(0, 20, 1.2);

  arch.add(p1, p2, top, banner);
  arch.position.set(x, 0, z);
  arch.rotation.y = rotY;
  scene.add(arch);

  // Register Left & Right Pillar Hitboxes
  const leftCol = new THREE.Vector3(-22, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(new THREE.Vector3(x, 0, z));
  const rightCol = new THREE.Vector3(22, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(new THREE.Vector3(x, 0, z));

  worldColliders.push(
    { type: 'circle', x: leftCol.x, z: leftCol.z, radius: 2.2, name: 'Arch Pillar' },
    { type: 'circle', x: rightCol.x, z: rightCol.z, radius: 2.2, name: 'Arch Pillar' }
  );
}
createFestivalArch(0, 0, 0);
createFestivalArch(950, 160, Math.PI / 4);
createFestivalArch(0, -1200, 0);

// ================= REALISTIC AI TRAFFIC SYSTEM =================
// AI Traffic Vehicles cruise along the highway in designated lanes, obey road speed, brake for players, and yield
const TRAFFIC_COUNT = 14;
const trafficVehicles = [];

const TRAFFIC_TYPES = [
  { name: 'Sedan', w: 2.1, h: 0.65, d: 4.6, color: 0x2244aa },
  { name: 'SUV', w: 2.3, h: 0.85, d: 4.8, color: 0x992222 },
  { name: 'Sports Coupe', w: 2.2, h: 0.55, d: 4.7, color: 0xeebb11 },
  { name: 'Horizon Van', w: 2.4, h: 0.95, d: 5.2, color: 0x228833 }
];

function createTrafficCarMesh(type) {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: type.color,
    metalness: 0.85,
    roughness: 0.2
  });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(type.w, type.h, type.d), bodyMat);
  body.position.y = type.h / 2 + 0.35;
  body.castShadow = true;
  g.add(body);

  // Cabin
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.1 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(type.w * 0.85, type.h * 0.75, type.d * 0.55), cabMat);
  cab.position.set(0, type.h + 0.35, -0.2);
  cab.castShadow = true;
  g.add(cab);

  // Headlights (Warm Yellow-White)
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
  const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), hlMat);
  hl1.position.set(-type.w * 0.35, type.h * 0.6, -type.d / 2 - 0.05);
  const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), hlMat);
  hl2.position.set(type.w * 0.35, type.h * 0.6, -type.d / 2 - 0.05);
  g.add(hl1, hl2);

  // Taillights (Red)
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xee1111 });
  const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), tlMat);
  tl1.position.set(-type.w * 0.35, type.h * 0.65, type.d / 2 + 0.05);
  const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), tlMat);
  tl2.position.set(type.w * 0.35, type.h * 0.65, type.d / 2 + 0.05);
  g.add(tl1, tl2);

  // Wheels
  const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12);
  wGeo.rotateZ(Math.PI / 2);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const wPositions = [
    [-type.w / 2 - 0.1, 0.4, -type.d * 0.32],
    [type.w / 2 + 0.1, 0.4, -type.d * 0.32],
    [-type.w / 2 - 0.1, 0.4, type.d * 0.32],
    [type.w / 2 + 0.1, 0.4, type.d * 0.32]
  ];
  wPositions.forEach(wp => {
    const wm = new THREE.Mesh(wGeo, wMat);
    wm.position.set(wp[0], wp[1], wp[2]);
    g.add(wm);
  });

  return g;
}

function initTraffic() {
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const type = TRAFFIC_TYPES[i % TRAFFIC_TYPES.length];
    const mesh = createTrafficCarMesh(type);
    scene.add(mesh);

    // Stagger along track spline
    // laneOffset: -5.5 (Left Lane, forward) or +5.5 (Right Lane, oncoming)
    const laneOffset = (i % 2 === 0) ? -5.5 : 5.5;
    const direction = (i % 2 === 0) ? 1 : -1;

    // Slower, realistic civilian cruise speeds (~35 to 55 MPH relative cruising speed)
    const slowBaseSpeed = 0.00014 + Math.random() * 0.00008;

    trafficVehicles.push({
      mesh: mesh,
      u: (i / TRAFFIC_COUNT) + Math.random() * 0.05,
      baseSpeed: slowBaseSpeed,
      currentSpeed: slowBaseSpeed,
      laneOffset: laneOffset,
      direction: direction,
      w: type.w,
      d: type.d,
      brakeLight: mesh.children[4]
    });
  }
}
initTraffic();

// ================= 4. REALISTIC TIRE DRIFT SMOKE PARTICLES =================
const SMOKE_COUNT = 120;
const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
const smokeMat = new THREE.MeshBasicMaterial({
  color: 0xdddddd,
  transparent: true,
  opacity: 0.0
});
const smokeParticles = [];
for (let i = 0; i < SMOKE_COUNT; i++) {
  const p = new THREE.Mesh(smokeGeo, smokeMat.clone());
  p.position.set(0, -50, 0);
  scene.add(p);
  smokeParticles.push({
    mesh: p,
    life: 0,
    maxLife: 1.0,
    velY: 0,
    scaleSpeed: 0
  });
}
let smokeIndex = 0;

function emitTireSmoke(pos) {
  const p = smokeParticles[smokeIndex];
  smokeIndex = (smokeIndex + 1) % SMOKE_COUNT;
  p.mesh.position.copy(pos);
  p.mesh.position.y = 0.25;
  p.life = 1.0;
  p.maxLife = 0.7 + Math.random() * 0.4;
  p.mesh.scale.set(0.6, 0.6, 0.6);
  p.velY = 0.8 + Math.random() * 0.8;
  p.scaleSpeed = 2.4 + Math.random() * 1.2;
}

// ================= 5. NEXT-GEN SUPERCARS FLEET =================
const car = new THREE.Group();
car.position.set(0, 0, 0);
scene.add(car);

// Paint Finish Library
const CAR_PAINTS = [
  { name: 'Forza Horizon Magenta', color: 0xff0055, metal: 0.94, rough: 0.08 },
  { name: 'Nardo Grey', color: 0x6e7278, metal: 0.88, rough: 0.14 },
  { name: 'Giallo Midas Gold', color: 0xffcc00, metal: 0.96, rough: 0.08 },
  { name: 'Blu Cepheus Cyan', color: 0x00d8ff, metal: 0.92, rough: 0.1 },
  { name: 'Rosso Corsa Red', color: 0xd90429, metal: 0.9, rough: 0.1 },
  { name: 'Onyx Carbon Pearl', color: 0x0f1115, metal: 0.98, rough: 0.06 }
];
let currentPaintIdx = 0;

const carPaintMat = new THREE.MeshPhysicalMaterial({
  color: CAR_PAINTS[0].color,
  metalness: CAR_PAINTS[0].metal,
  roughness: CAR_PAINTS[0].rough,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  reflectivity: 1.0
});

const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.35, metalness: 0.88 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x05070c,
  metalness: 0.99,
  roughness: 0.01,
  transmission: 0.4,
  transparent: true,
  opacity: 0.94
});
const ledWhite = new THREE.MeshBasicMaterial({ color: 0xf5fbff });
const ledRed = new THREE.MeshBasicMaterial({ color: 0xff002b });

// Car Wheel Setup
const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.48, 24);
tireGeo.rotateZ(Math.PI / 2);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xe5ba2a, metalness: 0.98, roughness: 0.1 });
const caliperMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

let wheels = [];
let flameL, flameR;

const SUPERCAR_SPECS = [
  { name: 'KOENIGSEGG JESKO', maxSpeed: 195, baseAccel: 24, driftGrip: 2.8 },
  { name: 'LAMBORGHINI TERZO', maxSpeed: 185, baseAccel: 26, driftGrip: 3.0 },
  { name: 'PORSCHE 911 GT3 RS', maxSpeed: 175, baseAccel: 22, driftGrip: 2.6 }
];
let currentCarIdx = 0;

function buildCarModel(typeIdx) {
  while (car.children.length > 0) {
    car.remove(car.children[0]);
  }
  wheels = [];

  const bodyGroup = new THREE.Group();

  if (typeIdx === 0) {
    // ================= KOENIGSEGG JESKO =================
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.52, 5.2), carPaintMat);
    lowerBody.position.y = 0.55;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 1.6), carPaintMat);
    nose.position.set(0, 0.46, -2.1);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.8), carbonMat);
    splitter.position.set(0, 0.28, -2.5);
    bodyGroup.add(nose, splitter);

    const cockpit = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 2.4, 8), glassMat);
    cockpit.rotateX(Math.PI / 2);
    cockpit.scale.set(1.15, 1, 0.55);
    cockpit.position.set(0, 1.05, -0.2);
    cockpit.castShadow = true;
    bodyGroup.add(cockpit);

    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 0.8), carbonMat);
    wingBlade.position.set(0, 1.48, 2.3);
    const wingPillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.3), carbonMat);
    wingPillar.position.set(0, 1.2, 2.1);
    bodyGroup.add(wingBlade, wingPillar);

    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), ledWhite);
    hl1.position.set(-0.85, 0.65, -2.6);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), ledWhite);
    hl2.position.set(0.85, 0.65, -2.6);
    bodyGroup.add(hl1, hl2);

    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.2), carbonMat);
    exhaust.position.set(0, 0.75, 2.6);
    bodyGroup.add(exhaust);

  } else if (typeIdx === 1) {
    // ================= LAMBORGHINI TERZO MILLENNIO =================
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.42, 5.0), carPaintMat);
    lowerBody.position.y = 0.5;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), carPaintMat);
    hood.rotateX(Math.PI / 2);
    hood.rotateY(Math.PI / 4);
    hood.scale.set(1.4, 0.3, 1);
    hood.position.set(0, 0.58, -1.8);
    bodyGroup.add(hood);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.2), glassMat);
    cockpit.position.set(0, 0.95, -0.1);
    bodyGroup.add(cockpit);

    const yLight1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), ledWhite);
    yLight1.rotation.z = Math.PI / 6;
    yLight1.position.set(-0.9, 0.56, -2.52);
    const yLight2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), ledWhite);
    yLight2.rotation.z = -Math.PI / 6;
    yLight2.position.set(0.9, 0.56, -2.52);
    bodyGroup.add(yLight1, yLight2);

    const diff1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.8), carbonMat);
    diff1.position.set(-0.7, 0.4, 2.3);
    const diff2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.8), carbonMat);
    diff2.position.set(0.7, 0.4, 2.3);
    bodyGroup.add(diff1, diff2);

  } else {
    // ================= PORSCHE 911 GT3 RS =================
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.58, 4.9), carPaintMat);
    lowerBody.position.y = 0.58;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    const fenderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.4), carPaintMat);
    fenderL.position.set(-1.08, 0.72, -1.5);
    const fenderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.4), carPaintMat);
    fenderR.position.set(1.08, 0.72, -1.5);
    bodyGroup.add(fenderL, fenderR);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 2.5), glassMat);
    cockpit.position.set(0, 1.15, 0.0);
    bodyGroup.add(cockpit);

    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.9), carbonMat);
    wingBlade.position.set(0, 1.42, 2.15);
    const neck1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.3), carbonMat);
    neck1.position.set(-0.8, 1.15, 2.15);
    const neck2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.3), carbonMat);
    neck2.position.set(0.8, 1.15, 2.15);
    bodyGroup.add(wingBlade, neck1, neck2);

    const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), ledWhite);
    h1.rotateX(Math.PI / 2);
    h1.position.set(-0.85, 0.74, -2.46);
    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), ledWhite);
    h2.rotateX(Math.PI / 2);
    h2.position.set(0.85, 0.74, -2.46);
    bodyGroup.add(h1, h2);
  }

  // Taillight bar
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.1), ledRed);
  tailLight.position.set(0, 0.8, 2.54);
  bodyGroup.add(tailLight);

  // Wheels
  const wheelPositions = [
    { x: -1.24, y: 0.48, z: -1.5, isFront: true },
    { x: 1.24, y: 0.48, z: -1.5, isFront: true },
    { x: -1.24, y: 0.48, z: 1.5, isFront: false },
    { x: 1.24, y: 0.48, z: 1.5, isFront: false }
  ];

  wheelPositions.forEach((pos) => {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.49, 14), rimMat);
    rim.rotateZ(Math.PI / 2);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.2), caliperMat);
    caliper.position.set(pos.x < 0 ? -0.15 : 0.15, 0.15, 0);

    wGroup.add(tire, rim, caliper);
    wGroup.position.set(pos.x, pos.y, pos.z);
    car.add(wGroup);
    wheels.push({ mesh: wGroup, isFront: pos.isFront });
  });

  // Twin NOS Burners
  const nosFlameGeo = new THREE.ConeGeometry(0.24, 2.2, 10);
  nosFlameGeo.rotateX(-Math.PI / 2);
  const nosFlameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  flameL = new THREE.Mesh(nosFlameGeo, nosFlameMat);
  flameL.position.set(-0.45, 0.46, 3.2);
  flameL.visible = false;
  flameR = new THREE.Mesh(nosFlameGeo, nosFlameMat);
  flameR.position.set(0.45, 0.46, 3.2);
  flameR.visible = false;
  car.add(flameL, flameR);

  car.add(bodyGroup);
  currentCarName.textContent = SUPERCAR_SPECS[typeIdx].name;
}

buildCarModel(0);

function switchCar() {
  currentCarIdx = (currentCarIdx + 1) % SUPERCAR_SPECS.length;
  buildCarModel(currentCarIdx);
}
carSelectBtn.addEventListener('click', switchCar);

// ================= 6. VEHICLE INPUT & DYNAMICS =================
const keys = { w: false, s: false, a: false, d: false, space: false, shift: false };

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = true;
  if (k === 's' || e.key === 'ArrowDown') keys.s = true;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = true;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = true;
  if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
  if (e.key === 'Shift') keys.shift = true;
  if (k === 'r') resetCar();
  if (k === 'c') toggleCamera();
  if (k === 'v') switchCar();

  forzaAudio.init();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = false;
  if (k === 's' || e.key === 'ArrowDown') keys.s = false;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = false;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
  if (e.code === 'Space') keys.space = false;
  if (e.key === 'Shift') keys.shift = false;
});

const physics = {
  speed: 0,
  lateralSpeed: 0,
  reverseMax: -50,
  brake: 1.4,
  drag: 0.992,
  steerInput: 0,
  wheelAngle: 0,
  maxWheelAngle: 0.58,
  nitro: 100,
  isNitro: false,
  isDrifting: false,
  gear: 1,
  totalDriftScore: 0,
  currentDriftCombo: 0,
  driftTimer: 0,
  comboMultiplier: 1.0,
  bestSpeed: 0,
  xp: 0
};

function resetCar() {
  car.position.set(0, 0, 0);
  car.rotation.set(0, 0, 0);
  physics.speed = 0;
  physics.lateralSpeed = 0;
  physics.wheelAngle = 0;
}

let cameraMode = 0;
function toggleCamera() {
  cameraMode = (cameraMode + 1) % 3;
}
viewToggleBtn.addEventListener('click', toggleCamera);

carColorBtn.addEventListener('click', () => {
  currentPaintIdx = (currentPaintIdx + 1) % CAR_PAINTS.length;
  const p = CAR_PAINTS[currentPaintIdx];
  carPaintMat.color.setHex(p.color);
  carPaintMat.metalness = p.metal;
  carPaintMat.roughness = p.rough;
});

audioToggleBtn.addEventListener('click', () => {
  const on = forzaAudio.toggle();
  audioToggleBtn.textContent = on ? '🔊 AUDIO' : '🔇 MUTED';
});

let isNight = false;
timeToggleBtn.addEventListener('click', () => {
  isNight = !isNight;
  if (isNight) {
    timeToggleBtn.textContent = '🌙 NIGHT';
    renderer.setClearColor(0x04060d);
    scene.fog.color.setHex(0x04060d);
    hemiLight.intensity = 0.25;
    sunLight.intensity = 0.3;
  } else {
    timeToggleBtn.textContent = '🌅 DUSK';
    renderer.setClearColor(0xff9966);
    scene.fog.color.setHex(0xec9e69);
    hemiLight.intensity = 0.85;
    sunLight.intensity = 2.6;
  }
});

// ================= 7. MAIN ENGINE ANIMATION LOOP =================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  const carSpec = SUPERCAR_SPECS[currentCarIdx];

  // --- 1. ACCELERATION & NOS DYNAMICS ---
  const speedRatioForPower = Math.min(1.0, Math.abs(physics.speed) / carSpec.maxSpeed);
  const powerFactor = Math.max(0.45, 1.0 - speedRatioForPower * 0.55);
  let accelRate = carSpec.baseAccel * powerFactor;

  physics.isNitro = false;

  if (keys.shift && physics.nitro > 2 && keys.w) {
    physics.isNitro = true;
    physics.nitro = Math.max(0, physics.nitro - delta * 25);
    accelRate *= 1.65; // Strong, punchy boost
    if (flameL && flameR) {
      flameL.visible = true;
      flameR.visible = true;
      flameL.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.6, 1);
      flameR.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.6, 1);
    }
    motionBlur.classList.add('active');
  } else {
    if (flameL && flameR) {
      flameL.visible = false;
      flameR.visible = false;
    }
    physics.nitro = Math.min(100, physics.nitro + delta * 12);
    motionBlur.classList.remove('active');
  }

  nitroBar.style.width = physics.nitro + '%';
  nitroPercent.textContent = Math.round(physics.nitro) + '%';

  if (keys.w) {
    physics.speed += accelRate * delta;
  } else if (keys.s) {
    if (physics.speed > 2) {
      physics.speed -= 40 * delta;
    } else {
      physics.speed -= 16 * delta;
    }
  } else {
    physics.speed *= Math.pow(0.975, delta * 60);
  }

  const currentMax = physics.isNitro ? carSpec.maxSpeed * 1.2 : carSpec.maxSpeed;
  physics.speed = Math.max(physics.reverseMax, Math.min(physics.speed, currentMax));

  // --- 2. RESPONSIVE FORZA STEERING & TURNING MECHANICS ---
  // Sharp, direct steering with immediate response (increased max lock)
  const speedRatio = Math.min(1.0, Math.abs(physics.speed) / 140);
  const effectiveMaxLock = physics.maxWheelAngle * (1.0 - speedRatio * 0.35); // Keep strong turning even at high speeds

  if (keys.a) {
    physics.steerInput = Math.min(physics.steerInput + delta * 9.0, 1.0);
  } else if (keys.d) {
    physics.steerInput = Math.max(physics.steerInput - delta * 9.0, -1.0);
  } else {
    physics.steerInput *= 0.65; // Snappy return to center
  }

  physics.wheelAngle = physics.steerInput * effectiveMaxLock;

  wheels.forEach(w => {
    if (w.isFront) {
      w.mesh.rotation.y = physics.wheelAngle;
    }
    w.mesh.children[0].rotation.x += physics.speed * 0.08;
    w.mesh.children[1].rotation.x += physics.speed * 0.08;
  });

  // --- 3. DRIFT, LATERAL GRIP & YAW ROTATION ---
  const isMoving = Math.abs(physics.speed) > 1.0;
  const forwardHeading = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  const rightHeading = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);

  physics.isDrifting = false;
  let tireLateralGrip = 0.92;

  if (keys.space && isMoving) {
    physics.isDrifting = true;
    tireLateralGrip = 0.35;
    physics.speed *= 0.99;
  } else if (Math.abs(physics.lateralSpeed) > 12) {
    physics.isDrifting = true;
    tireLateralGrip = 0.6;
  }

  // Direct, satisfying turn-in response (turn factor increased from 2.8 to 4.2)
  if (isMoving) {
    const steerDir = physics.speed >= 0 ? 1 : -1;
    let yawSpeed = (physics.wheelAngle * 4.2) * steerDir * Math.max(0.65, Math.min(1.8, Math.abs(physics.speed) / 45));

    if (physics.isDrifting) {
      yawSpeed *= 1.45;
    }

    car.rotation.y += yawSpeed * delta;
  }

  const targetForwardVel = forwardHeading.clone().multiplyScalar(physics.speed * 0.44);
  physics.lateralSpeed = THREE.MathUtils.lerp(physics.lateralSpeed, 0, tireLateralGrip * delta * 8);

  if (isMoving && (physics.isDrifting || Math.abs(physics.wheelAngle) > 0.15)) {
    const centrifugalForce = -physics.wheelAngle * (physics.speed * 0.8);
    physics.lateralSpeed += centrifugalForce * (1.0 - tireLateralGrip) * delta * 25;

    // Emit Realistic Tire Drift Smoke from rear wheels
    const rearPosL = car.position.clone().add(new THREE.Vector3(-1.2, 0, 1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y));
    const rearPosR = car.position.clone().add(new THREE.Vector3(1.2, 0, 1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y));
    emitTireSmoke(rearPosL);
    emitTireSmoke(rearPosR);
  }

  const movement = targetForwardVel.add(rightHeading.clone().multiplyScalar(physics.lateralSpeed * 0.28 * delta));
  car.position.add(movement);

  // Update smoke particles
  for (let sp of smokeParticles) {
    if (sp.life > 0) {
      sp.life -= delta / sp.maxLife;
      sp.mesh.position.y += sp.velY * delta;
      const s = sp.mesh.scale.x + sp.scaleSpeed * delta;
      sp.mesh.scale.set(s, s, s);
      sp.mesh.material.opacity = Math.max(0, sp.life * 0.35);
      if (sp.life <= 0) {
        sp.mesh.position.set(0, -50, 0);
      }
    }
  }

  // Chassis roll & weight pitch
  const rollTarget = -physics.wheelAngle * (physics.speed / 50);
  const pitchTarget = keys.w ? 0.025 : (keys.s ? -0.04 : 0);
  const chassisMesh = car.children[car.children.length - 1];
  if (chassisMesh) {
    chassisMesh.rotation.z += (rollTarget - chassisMesh.rotation.z) * 0.18;
    chassisMesh.rotation.x += (pitchTarget - chassisMesh.rotation.x) * 0.15;
  }

  // --- 4. UPDATE REALISTIC AI TRAFFIC (Slow Cruising & Solid Hitboxes) ---
  trafficVehicles.forEach((v) => {
    // Advance progress along road spline at slow, realistic civilian speed
    v.u = (v.u + v.currentSpeed * v.direction * delta * 60 + 1.0) % 1.0;

    // Spline center point and tangent
    const pCenter = trackCurve.getPointAt(v.u);
    const tangent = trackCurve.getTangentAt(v.u).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Position car in its designated lane
    const targetPos = pCenter.clone().add(normal.clone().multiplyScalar(v.laneOffset));
    v.mesh.position.set(targetPos.x, 0, targetPos.z);

    // Orient traffic facing travel direction
    const lookTarget = targetPos.clone().add(tangent.clone().multiplyScalar(v.direction));
    v.mesh.lookAt(lookTarget);

    // AI Driving Behavior: Collision avoidance & Braking for Player
    const distToPlayer = v.mesh.position.distanceTo(car.position);
    if (distToPlayer < 24) {
      // Brake when player is in front
      v.currentSpeed = v.baseSpeed * 0.3;
    } else {
      // Normal calm cruising speed
      v.currentSpeed = v.baseSpeed;
    }

    // Near-Miss Skill Scoring when weaving through traffic at speed
    if (distToPlayer < 7.5 && Math.abs(physics.speed) > 35 && !v.nearMissed) {
      v.nearMissed = true;
      physics.currentDriftCombo += 350;
      skillBadge.textContent = 'NEAR MISS!';
      driftPopup.classList.remove('hidden');
      driftPoints.textContent = '+' + physics.currentDriftCombo.toLocaleString();
      setTimeout(() => { v.nearMissed = false; }, 3000);
    }

    // --- ACCURATE 3D BOUNDING BOX COLLISION (TRAFFIC HITBOX) ---
    const dx = Math.abs(car.position.x - v.mesh.position.x);
    const dz = Math.abs(car.position.z - v.mesh.position.z);
    const hitDistance = (v.w + 2.4) / 2; // Cross-section threshold
    const hitLength = (v.d + 5.0) / 2;

    if (distToPlayer < (hitLength + 1.2)) {
      // Check oriented overlap
      const relPos = car.position.clone().sub(v.mesh.position);
      if (Math.abs(relPos.x) < hitDistance && Math.abs(relPos.z) < hitLength) {
        // Physical crash response
        const bounceDir = relPos.normalize();
        physics.speed = -physics.speed * 0.45; // Bounce back & scrub speed
        physics.lateralSpeed += bounceDir.x * 20;
        car.position.add(bounceDir.multiplyScalar(1.2));
        forzaAudio.playBackfire();

        // Trigger camera shake effect
        camera.position.y += (Math.random() - 0.5) * 0.6;
      }
    }
  });

  // --- 5. WORLD STATIC ENVIRONMENT HITBOXES (Trees, Pillars, Towers) ---
  for (let c of worldColliders) {
    if (c.type === 'circle') {
      const dist = Math.hypot(car.position.x - c.x, car.position.z - c.z);
      if (dist < (c.radius + 1.3)) { // 1.3 is half-width of car
        // Solid physical collision
        const push = new THREE.Vector3(car.position.x - c.x, 0, car.position.z - c.z).normalize();
        physics.speed = -physics.speed * 0.4; // Bounce off
        physics.lateralSpeed = 0;
        car.position.x = c.x + push.x * (c.radius + 1.4);
        car.position.z = c.z + push.z * (c.radius + 1.4);
        forzaAudio.playBackfire();
      }
    } else if (c.type === 'box') {
      // AABB Box Hitbox (Skyscrapers)
      if (car.position.x > c.minX && car.position.x < c.maxX &&
          car.position.z > c.minZ && car.position.z < c.maxZ) {
        physics.speed = -physics.speed * 0.35;
        // Push back to closest edge
        const dMinX = Math.abs(car.position.x - c.minX);
        const dMaxX = Math.abs(car.position.x - c.maxX);
        const dMinZ = Math.abs(car.position.z - c.minZ);
        const dMaxZ = Math.abs(car.position.z - c.maxZ);
        const minVal = Math.min(dMinX, dMaxX, dMinZ, dMaxZ);
        if (minVal === dMinX) car.position.x = c.minX - 0.5;
        else if (minVal === dMaxX) car.position.x = c.maxX + 0.5;
        else if (minVal === dMinZ) car.position.z = c.minZ - 0.5;
        else car.position.z = c.maxZ + 0.5;
        forzaAudio.playBackfire();
      }
    }
  }

  // --- 6. DRIFT COMBO SCORING CHAIN ---
  if (physics.isDrifting && Math.abs(physics.speed) > 25 && Math.abs(physics.wheelAngle) > 0.08) {
    physics.comboMultiplier = Math.min(5.0, physics.comboMultiplier + delta * 0.8);
    physics.currentDriftCombo += Math.floor((Math.abs(physics.speed) + Math.abs(physics.lateralSpeed)) * 0.35 * physics.comboMultiplier);
    physics.driftTimer = 45;
    driftPopup.classList.remove('hidden');

    if (physics.comboMultiplier > 3.5) skillBadge.textContent = 'DAREDEVIL DRIFT!';
    else if (physics.comboMultiplier > 2.0) skillBadge.textContent = 'ULTIMATE DRIFT!';
    else skillBadge.textContent = 'GREAT DRIFT!';

    driftPoints.textContent = '+' + physics.currentDriftCombo.toLocaleString();
    driftMultiplier.textContent = 'x ' + physics.comboMultiplier.toFixed(1);
  } else {
    if (physics.driftTimer > 0) {
      physics.driftTimer--;
      if (physics.driftTimer === 0) {
        physics.totalDriftScore += physics.currentDriftCombo;
        physics.xp += Math.floor(physics.currentDriftCombo / 100);
        physics.currentDriftCombo = 0;
        physics.comboMultiplier = 1.0;
        driftPopup.classList.add('hidden');
      }
    }
  }

  // --- 5. AUDIO & RPM GAUGE ---
  const displaySpeed = Math.abs(Math.round(physics.speed));
  const rpmRatio = (displaySpeed % 38) / 38;
  forzaAudio.update(rpmRatio, physics.isDrifting, physics.isNitro);

  const activeDotCount = Math.floor(rpmRatio * rpmDots.length);
  rpmDots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx < activeDotCount);
  });

  // Gear Calculation (Calibrated for the upgraded performance curve)
  let currentGear = 1;
  if (displaySpeed > 145) currentGear = 6;
  else if (displaySpeed > 115) currentGear = 5;
  else if (displaySpeed > 82) currentGear = 4;
  else if (displaySpeed > 50) currentGear = 3;
  else if (displaySpeed > 24) currentGear = 2;
  else if (physics.speed < -0.5) currentGear = 'R';

  if (currentGear !== physics.gear) {
    physics.gear = currentGear;
    forzaAudio.playBackfire();
  }

  // --- 6. HUD DASHBOARD UPDATES ---
  speedValue.textContent = displaySpeed;
  gearValue.textContent = physics.gear;
  driftScoreText.textContent = physics.totalDriftScore.toLocaleString() + ' PTS';
  xpText.textContent = 'LVL ' + (1 + Math.floor(physics.xp / 10));

  if (displaySpeed > physics.bestSpeed) {
    physics.bestSpeed = displaySpeed;
    bestSpeedText.textContent = physics.bestSpeed + ' MPH';
  }

  // --- 7. DYNAMIC HORIZON CHASE CAMERA ---
  let camOffset;
  let lookOffset;

  if (cameraMode === 0) {
    camOffset = new THREE.Vector3(0, 3.8, 8.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    lookOffset = new THREE.Vector3(0, 1.2, -6).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  } else if (cameraMode === 1) {
    camOffset = new THREE.Vector3(0, 2.5, 5.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    lookOffset = new THREE.Vector3(0, 1.0, -5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  } else {
    camOffset = new THREE.Vector3(0, 1.35, -0.7).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    lookOffset = new THREE.Vector3(0, 1.1, -15).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  }

  const targetCamPos = car.position.clone().add(camOffset);
  camera.position.lerp(targetCamPos, 0.18);
  camera.lookAt(car.position.clone().add(lookOffset));

  sunLight.position.set(car.position.x + 100, 200, car.position.z + 80);
  sunLight.target = car;

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
