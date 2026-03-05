import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";

// ── Model catalog ─────────────────────────────────────────────────────────────
const MODELS = [
  {
    name: "double_tree",
    description: "Filtered textured 3D tree reconstruction",
    icon: "🌳",
    layers: [
      {
        name: "Mesh Structure",
        type: "ply",
        file: "models/double_tree/scene_mesh.ply",
        size: "4.6 MB", color: "#8b5cf6", visible: true, isMesh: true,
      },
      {
        name: "Mesh Filtered",
        type: "ply",
        file: "models/double_tree/scene_mesh_filtered_openmvs.ply",
        size: "4.6 MB", color: "#60a5fa", visible: false, isMesh: true,
      },
    ],
  },
  {
    name: "single_tree",
    description: "Single tree geometry from single camera angle",
    icon: "🌲",
    layers: [
      {
        name: "Textured Mesh",
        type: "obj",
        obj: "models/single_tree/scene_textured.obj",
        mtl: "models/single_tree/scene_textured.mtl",
        tex: "models/single_tree/scene_textured_material_00_map_Kd.jpg",
        size: "11 MB", color: "#10b981", visible: true,
      },
      {
        name: "Mesh Structure",
        type: "ply",
        file: "models/single_tree/scene_mesh.ply",
        size: "1.8 MB", color: "#059669", visible: false, isMesh: true,
      },
      {
        name: "Dense Cloud",
        type: "ply",
        file: "models/single_tree/scene_dense.ply",
        size: "10 MB", color: "#34d399", visible: false,
      },
    ],
  },
  {
    name: "transcect 1 Abo Shosha",
    description: "Coral reef transect survey - Abo Shosha location",
    icon: "🪸",
    layers: [
      {
        name: "Mesh Structure",
        type: "ply",
        file: "models/transcect 1 Abo Shosha/scene_mesh.ply",
        size: "32 MB", color: "#f59e0b", visible: true, isMesh: true,
      },
      {
        name: "Dense Surface",
        type: "ply",
        file: "models/transcect 1 Abo Shosha/scene_dense.mvs",
        size: "3.1 MB", color: "#f97316", visible: false, isMesh: true,
      },
    ],
  },
  {
    name: "transcect 2 Abo Shosha",
    description: "Coral reef transect survey - Abo Shosha location (second site)",
    icon: "🪸",
    layers: [
      {
        name: "Mesh Structure",
        type: "ply",
        file: "models/transcect 2 Abo Shosha/scene_mesh.ply",
        size: "28 MB", color: "#ec4899", visible: true, isMesh: true,
      },
      {
        name: "Scene Surface",
        type: "ply",
        file: "models/transcect 2 Abo Shosha/scene.mvs",
        size: "3.7 MB", color: "#d946ef", visible: false, isMesh: true,
      },
      {
        name: "Dense Surface Alt",
        type: "ply",
        file: "models/transcect 2 Abo Shosha/scene_dense.mvs",
        size: "3.7 MB", color: "#a855f7", visible: false, isMesh: true,
      },
    ],
  },
];

// ── DOM ───────────────────────────────────────────────────────────────────────
const galleryEl    = document.getElementById("gallery");
const modelGridEl  = document.getElementById("model-grid");
const loadingEl    = document.getElementById("loading-screen");
const viewerEl     = document.getElementById("viewer");
const errorEl      = document.getElementById("error-screen");
const errorMsgEl   = document.getElementById("error-msg");
const progressBar  = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const loadingLabel = document.getElementById("loading-label");
const canvas       = document.getElementById("canvas");
const modelTitleEl = document.getElementById("model-title");
const resetBtn     = document.getElementById("resetBtn");
const layerListEl  = document.getElementById("layer-list");
const layerToggle  = document.getElementById("layer-toggle-btn");

// ── Crypto ────────────────────────────────────────────────────────────────────
// Same salt as encrypt.py — public, that's fine given the strong password.
const SALT = new TextEncoder().encode("3d-viewer-v1-salt");
let cryptoKey = null; // set once password is verified

async function deriveKey(password) {
  const raw = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
  );
  // extractable:true so we can export key bytes for sessionStorage
  // (avoids storing the password itself)
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, hash: "SHA-256", iterations: 100_000 },
    raw,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );
}

async function decryptBuffer(encBuffer) {
  const data = new Uint8Array(encBuffer);
  const iv         = data.slice(0, 12);
  const ciphertext = data.slice(12);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
}

// ── Auto-unlock (no password gate) ────────────────────────────────────────────
galleryEl.hidden = false;

// Derive encryption key from hardcoded password
(async () => {
  try {
    const key = await deriveKey("robot452");
    cryptoKey = key;
  } catch (err) {
    console.error("Failed to initialize encryption:", err);
  }
})();

// ── Gallery cards ─────────────────────────────────────────────────────────────
MODELS.forEach((m, i) => {
  const card = document.createElement("div");
  card.className = "model-card";
  card.innerHTML = `
    <div class="model-icon">${m.icon}</div>
    <div>
      <div class="model-name">${m.name}</div>
      <div class="model-meta">${m.description}</div>
      <span class="model-badge">${m.layers.length} layers</span>
    </div>`;
  card.addEventListener("click", () => openModel(i));
  modelGridEl.appendChild(card);
});

document.getElementById("cancel-btn").addEventListener("click", showGallery);
document.getElementById("back-btn").addEventListener("click", showGallery);
document.getElementById("err-back-btn").addEventListener("click", showGallery);

let layerPanelOpen = true;
layerToggle.addEventListener("click", () => {
  layerPanelOpen = !layerPanelOpen;
  layerListEl.style.display = layerPanelOpen ? "flex" : "none";
  layerToggle.textContent = layerPanelOpen ? "−" : "+";
});

// ── Three.js (lazy) ───────────────────────────────────────────────────────────
let renderer, scene, camera, controls, animating = false;

function initThree() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  camera = new THREE.PerspectiveCamera(55, 1, 0.01, 5000);
  controls = new TrackballControls(camera, canvas);
  controls.rotateSpeed = 3.0;
  controls.zoomSpeed   = 1.2;
  controls.panSpeed    = 0.8;
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(5, 10, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 1.0);
  fill.position.set(-5, 2, -5);
  scene.add(fill);
  window.addEventListener("resize", resizeRenderer);
}

function resizeRenderer() {
  if (!renderer) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  controls?.handleResize();
}

function startAnimating() {
  if (animating) return;
  animating = true;
  (function loop() {
    if (!animating) return;
    requestAnimationFrame(loop);
    resizeRenderer();
    controls.update();
    renderer.render(scene, camera);
  })();
}

function fitCamera() {
  const box = new THREE.Box3();
  scene.children.forEach(o => { if (o.visible && (o.isPoints || o.isGroup || o.isMesh)) box.expandByObject(o); });
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const dist = Math.max(size.length(), 0.5);
  camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist);
  controls.target.copy(center);
  controls.update();
}

// ── Cache & Performance Optimizations ────────────────────────────────────────
const FILE_CACHE = new Map(); // In-memory cache for loaded files

// ── Encrypted fetch with progress & caching ──────────────────────────────────
async function fetchEnc(url, onProgress) {
  // Check cache first
  if (FILE_CACHE.has(url)) {
    return FILE_CACHE.get(url);
  }

  const resp = await fetch(url + ".enc");
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  const total = parseInt(resp.headers.get("content-length") || "0", 10);
  const reader = resp.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress) onProgress(loaded, total);
  }
  const blob = new Blob(chunks);
  const decrypted = await decryptBuffer(await blob.arrayBuffer());

  // Cache the result
  FILE_CACHE.set(url, decrypted);
  return decrypted;
}

function progressCb(loaded, total) {
  const pct = total > 0 ? (loaded / total) * 100 : 0;
  progressBar.style.width = pct + "%";
  progressText.textContent =
    `${(loaded / 1048576).toFixed(1)} MB` +
    (total > 0 ? ` / ${(total / 1048576).toFixed(1)} MB` : "");
}

// ── Layer loading (optimized) ─────────────────────────────────────────────────
async function loadLayer(layer, onProgress) {
  if (layer.type === "obj") {
    // 1. Fetch + decrypt OBJ in parallel with texture
    const objPromise = fetchEnc(layer.obj, (loaded, total) => {
      if (onProgress) onProgress(loaded, total * 0.7); // Weight OBJ as 70% of progress
    });
    const texPromise = fetchEnc(layer.tex).catch(() => null);

    const objBuf = await objPromise;
    const objUrl = URL.createObjectURL(new Blob([objBuf], { type: "text/plain" }));

    // Parse OBJ (this is fast, just parsing text)
    const object = await new OBJLoader().loadAsync(objUrl);
    URL.revokeObjectURL(objUrl);

    // 2. Load texture in parallel (non-blocking)
    const texBuf = await texPromise;
    if (texBuf && layer.tex) {
      const ext    = layer.tex.split(".").pop();
      const mime   = ext === "png" ? "image/png" : "image/jpeg";
      const texUrl = URL.createObjectURL(new Blob([texBuf], { type: mime }));
      const texture = await new Promise((resolve, reject) =>
        new THREE.TextureLoader().load(texUrl, resolve, undefined, reject)
      );
      URL.revokeObjectURL(texUrl);
      texture.colorSpace = THREE.SRGBColorSpace;

      // Apply texture to every mesh
      object.traverse(child => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhongMaterial({
            map: texture,
            shininess: 100,
            envMapIntensity: 0.5,
          });
        }
      });
    }

    object.rotation.x = Math.PI;
    return object;
  }

  if (layer.type === "ply") {
    const plyBuf  = await fetchEnc(layer.file, onProgress);
    const plyBlob = new Blob([plyBuf]);
    const plyUrl  = URL.createObjectURL(plyBlob);

    const geometry = await new PLYLoader().loadAsync(plyUrl);
    URL.revokeObjectURL(plyUrl);

    // Skip expensive normal computation for large point clouds
    if (layer.isMesh && geometry.attributes.position.count < 1000000) {
      geometry.computeVertexNormals();
    }

    const color = new THREE.Color(layer.color);
    let object;
    if (layer.isMesh) {
      // Use wireframe for dense meshes to improve performance
      const wireframe = geometry.attributes.position.count > 500000;
      object = new THREE.Mesh(
        geometry,
        new THREE.MeshLambertMaterial({
          color,
          side: THREE.DoubleSide,
          wireframe,
          flatShading: wireframe, // Faster rendering
        })
      );
    } else {
      // Optimize point cloud rendering
      object = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color,
          size: 0.002,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.8,
        })
      );
    }
    object.rotation.x = Math.PI;
    return object;
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showGallery() {
  galleryEl.hidden = false; loadingEl.hidden = true;
  viewerEl.hidden  = true;  errorEl.hidden   = true;
  if (scene) scene.children.filter(c => c.isPoints || c.isGroup || c.isMesh).forEach(c => scene.remove(c));
}
function showLoading(label) {
  galleryEl.hidden = true;  loadingEl.hidden = false;
  viewerEl.hidden  = true;  errorEl.hidden   = true;
  loadingLabel.textContent = label || "Loading…";
  progressBar.style.width  = "0%";
  progressText.textContent = "0 MB / — MB";
}
function showViewer() {
  galleryEl.hidden = true;  loadingEl.hidden = true;
  viewerEl.hidden  = false; errorEl.hidden   = true;
  resizeRenderer();
}
function showError(msg) {
  galleryEl.hidden = true;  loadingEl.hidden = true;
  viewerEl.hidden  = true;  errorEl.hidden   = false;
  errorMsgEl.textContent = msg;
}

// ── Open model ────────────────────────────────────────────────────────────────
let activeModel = null;

async function openModel(index) {
  activeModel = MODELS[index];
  modelTitleEl.textContent = activeModel.name;
  activeModel.layers.forEach(l => { l._object = null; l._loaded = false; l._loading = false; });
  buildLayerPanel();

  const defaultLayer = activeModel.layers.find(l => l.visible);
  if (!defaultLayer) { showViewer(); initThree(); startAnimating(); return; }

  showLoading(`Loading: ${defaultLayer.name}`);
  try {
    const object = await loadLayer(defaultLayer, progressCb);
    defaultLayer._object = object;
    defaultLayer._loaded = true;
    showViewer(); initThree(); startAnimating();
    scene.add(object);
    fitCamera();
    updateLayerUI();
    resetBtn.onclick = fitCamera;
    preloadRemainingLayers(); // background-fetch all other layers silently
  } catch (err) {
    showError(err?.message || String(err));
  }
}

// ── Background pre-loader ──────────────────────────────────────────────────────
async function preloadRemainingLayers() {
  const model = activeModel;
  for (const layer of model.layers) {
    if (layer._loaded || layer._loading) continue;
    // Check we're still on the same model (user didn't go back)
    if (activeModel !== model) break;
    layer._loading = true;
    updateLayerUI();
    try {
      layer._object = await loadLayer(layer, null); // silent — no progress bar
      layer._loaded = true;
    } catch (err) {
      console.warn(`Preload failed for "${layer.name}":`, err);
    }
    layer._loading = false;
    updateLayerUI();
  }
}

// ── Layer panel ───────────────────────────────────────────────────────────────
function buildLayerPanel() {
  layerListEl.innerHTML = "";
  activeModel.layers.forEach((layer, i) => {
    const row = document.createElement("div");
    row.className = "layer-row";
    row.innerHTML = `
      <button class="eye-btn ${layer.visible ? "eye-on" : "eye-off"}" data-i="${i}" title="Toggle">👁</button>
      <span class="layer-dot" style="background:${layer.color}"></span>
      <div class="layer-info">
        <span class="layer-name">${layer.name}</span>
        <span class="layer-size">${layer.size}</span>
      </div>
      <span class="layer-status" id="lstatus-${i}">${layer.visible ? "" : "off"}</span>`;
    row.querySelector(".eye-btn").addEventListener("click", () => toggleLayer(i));
    layerListEl.appendChild(row);
  });
}

function updateLayerUI() {
  activeModel?.layers.forEach((layer, i) => {
    const btn    = document.querySelector(`.eye-btn[data-i="${i}"]`);
    const status = document.getElementById(`lstatus-${i}`);
    if (!btn || !status) return;
    btn.className = `eye-btn ${layer.visible ? "eye-on" : "eye-off"}`;
    status.textContent = layer._loading ? "loading…" : (!layer._loaded && !layer.visible ? "off" : "");
  });
}

async function toggleLayer(i) {
  const layer = activeModel.layers[i];
  if (layer._loading) return;
  layer.visible = !layer.visible;

  if (layer.visible && !layer._loaded) {
    layer._loading = true;
    updateLayerUI();
    showLoading(`Loading: ${layer.name}`);
    try {
      layer._object = await loadLayer(layer, progressCb);
      layer._loaded = true;
      layer._loading = false;
      scene.add(layer._object);
      layer._object.visible = true;
      showViewer();
    } catch (err) {
      layer.visible = false;
      layer._loading = false;
      showViewer();
      alert(`Failed: ${err.message}`);
    }
  } else if (layer._object) {
    // Pre-loaded objects haven't been added to scene yet — add on first show
    if (layer.visible && !layer._object.parent) scene.add(layer._object);
    layer._object.visible = layer.visible;
    showViewer();
  }
  updateLayerUI();
}
