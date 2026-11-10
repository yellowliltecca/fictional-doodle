import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const config = window.BUSINESS_CONFIG || {};
const whatsappNumber = String(config.whatsapp || "79372523222").replace(/\D/g, "");
const twoGisUrl = config.twoGisUrl || "https://2gis.ru/engels/firm/70000001006157383";
const reviewsUrl = config.twoGisReviewsUrl || `${twoGisUrl}/tab/reviews`;
const galleryUrl = config.twoGisGalleryUrl || "https://2gis.ru/engels/gallery/firm/70000001006157383";

// Keep all business links in one place so they are easy to update later.
document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
  link.href = `https://wa.me/${whatsappNumber}`;
});
document.querySelectorAll("[data-map-link]").forEach((link) => link.href = twoGisUrl);
document.querySelectorAll("[data-reviews-link]").forEach((link) => link.href = reviewsUrl);
document.querySelectorAll("[data-gallery-link]").forEach((link) => link.href = galleryUrl);
document.getElementById("year").textContent = new Date().getFullYear();
document.title = `${config.name || "SKYLINE"} — ${config.subtitle || "студия винила"} в ${config.city || "Энгельсе"}`;

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  mainNav.classList.toggle("is-open", open);
});
mainNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

// A service card can preselect its service in the enquiry form.
document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const select = document.querySelector('#bookingForm select[name="service"]');
    const requested = link.dataset.service;
    if (!select || !requested) return;
    const option = [...select.options].find((item) => item.textContent.toLowerCase().includes(requested.toLowerCase().split(" ")[0]));
    if (option) select.value = option.value || option.textContent;
  });
});

const form = document.getElementById("bookingForm");
const formStatus = document.getElementById("formStatus");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const name = String(values.get("name") || "").trim();
  const phone = String(values.get("phone") || "").trim();
  const service = String(values.get("service") || "").trim();
  const message = String(values.get("message") || "").trim();
  const body = [
    "Здравствуйте! Пишу с сайта Skyline.",
    "",
    `Имя: ${name}`,
    `Телефон для связи: ${phone}`,
    `Услуга: ${service}`,
    message ? `Автомобиль и пожелания: ${message}` : ""
  ].filter(Boolean).join("\n");

  if (!whatsappNumber) {
    formStatus.textContent = "Номер WhatsApp пока не указан в business-config.js.";
    return;
  }

  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(body)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  formStatus.textContent = "Сообщение подготовлено в WhatsApp. Проверьте данные и нажмите «Отправить». Если новая вкладка не открылась, разрешите всплывающие окна для сайта.";
});

const canvas = document.getElementById("carCanvas");
const loading = document.getElementById("modelLoading");
const loadingText = document.getElementById("loadingText");
const loadingBar = document.getElementById("loadingBar");
const modelError = document.getElementById("modelError");
const stage = document.getElementById("carStage");
const autoButton = document.getElementById("autoRotate");

let renderer;
let scene;
let camera;
let controls;
let model;
let frameId = 0;
let isVisible = true;
let autoSpin = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastFrameTime = 0;
const AUTO_SPIN_SPEED = 0.22; // radians per second — one full turn in about 28.6 seconds

function updateSpinButton() {
  if (!autoButton) return;
  autoButton.classList.toggle("active", autoSpin);
  autoButton.setAttribute("aria-pressed", String(autoSpin));
  autoButton.textContent = autoSpin ? "ПАУЗА" : "ВРАЩАТЬ";
}
updateSpinButton();

function setLoading(percent, label = "ЗАГРУЖАЕМ 3D-МОДЕЛЬ") {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  loadingText.textContent = `${label} · ${value}%`;
  loadingBar.style.width = `${value}%`;
}

function showError(error) {
  console.error("3D model loading error:", error);
  loading.classList.add("is-hidden");
  modelError.hidden = false;
}

function stopAnimation() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
}

function initScene() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    // Mobile GPUs benefit more from a lower render resolution than from MSAA.
    antialias: window.innerWidth >= 720 && (window.devicePixelRatio || 1) < 1.75,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.0 : 1.35));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = false;

  scene = new THREE.Scene();
  scene.background = null; // transparent canvas: the car blends into the page background

  camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
  camera.position.set(5.7, 2.45, -6.6);

  scene.add(new THREE.HemisphereLight(0xc9d9f1, 0x171b22, 2.1));

  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(-4, 7, -5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8baeff, 2.4);
  rim.position.set(5, 4, 5);
  scene.add(rim);

  const fill = new THREE.PointLight(0x9ab7ff, 28, 12, 2);
  fill.position.set(-4, 1.6, 1.5);
  scene.add(fill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 10.5;
  controls.minPolarAngle = 0.78;
  controls.maxPolarAngle = 1.48;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.72;
  controls.target.set(0, 0.72, 0);
  controls.autoRotate = false; // the model itself rotates, not the camera
  controls.saveState();
  controls.addEventListener("start", () => {
    if (autoSpin) {
      autoSpin = false;
      updateSpinButton();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0]?.isIntersecting ?? true;
    if (isVisible && model && !document.hidden) animate();
    else stopAnimation();
  }, { threshold: 0.03 });
  observer.observe(stage);

  window.addEventListener("resize", resizeScene, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else if (isVisible && model) animate();
  });
}

function resizeScene() {
  if (!renderer || !camera) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.0 : 1.35));
  renderer.setSize(width, height, false);
}

async function fetchCompressedModel(url) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Не удалось загрузить GLB: HTTP ${response.status}`);
  if (!("DecompressionStream" in window)) {
    throw new Error("Браузер не поддерживает распаковку gzip. Откройте сайт в актуальной версии Chrome, Edge, Firefox или Safari.");
  }

  // Decompress the network stream directly. This avoids keeping a second full
  // copy of the compressed file in memory on phones.
  setLoading(18, "ЗАГРУЖАЕМ И РАСПАКОВЫВАЕМ МОДЕЛЬ");
  const decompressedStream = response.body.pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(decompressedStream).arrayBuffer();
  setLoading(92, "ПОДГОТАВЛИВАЕМ СЦЕНУ");
  return buffer;
}

function loadModel() {
  const loader = new GLTFLoader();
  fetchCompressedModel("./bmw-m2-cs.glb.gz")
    .then((buffer) => {
      loader.parse(buffer, "", (gltf) => {
        model = gltf.scene;

        // KHR_mesh_quantization stores positions as normalized uint16 and decodes
        // them with each mesh node's translation/scale. Set local geometry bounds
        // in the normalized 0..1 coordinate space so Three.js frustum culling and
        // the initial camera fit use the decoded shape rather than raw uint16 values.
        model.traverse((child) => {
          if (!child.isMesh || !child.geometry?.attributes?.position) return;
          const position = child.geometry.attributes.position;
          if (position.normalized && position.array instanceof Uint16Array) {
            const values = position.array;
            const inv = 1 / 65535;
            const min = new THREE.Vector3(Infinity, Infinity, Infinity);
            const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
            for (let i = 0; i < position.count; i++) {
              const x = values[i * 3] * inv;
              const y = values[i * 3 + 1] * inv;
              const z = values[i * 3 + 2] * inv;
              min.min(new THREE.Vector3(x, y, z));
              max.max(new THREE.Vector3(x, y, z));
            }
            child.geometry.boundingBox = new THREE.Box3(min, max);
            child.geometry.boundingSphere = new THREE.Sphere();
            child.geometry.boundingBox.getBoundingSphere(child.geometry.boundingSphere);
          }
        });

        // Move the model's geometric centre to the rotation axis so it spins in place.
        const bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= bounds.min.y;

        model.traverse((child) => {
          if (!child.isMesh) return;
          child.frustumCulled = true;
          if (!child.material) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if ("envMapIntensity" in material) material.envMapIntensity = 1.15;
            material.needsUpdate = true;
          });
        });

        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        const targetFootprint = window.innerWidth < 720 ? 5.95 : 6.8;
        const scale = targetFootprint / Math.max(size.x, size.z);
        model.scale.setScalar(scale);
        model.position.x += window.innerWidth < 720 ? 0.12 : 0.22;
        model.rotation.y = 0.18;
        scene.add(model);

        setLoading(100, "ГОТОВО");
        window.setTimeout(() => loading.classList.add("is-hidden"), 350);
        if (isVisible && !document.hidden) animate();
      }, showError);
    })
    .catch(showError);
}

function animate() {
  if (frameId || !renderer || !model || !isVisible || document.hidden) return;
  lastFrameTime = performance.now();
  const loop = (now) => {
    frameId = 0;
    if (!renderer || !model || !isVisible || document.hidden) return;

    const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    if (autoSpin) model.rotation.y += delta * AUTO_SPIN_SPEED;
    controls?.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);
}

function rotateModel(direction) {
  if (!model) return;
  model.rotation.y += direction * Math.PI / 5;
  if (renderer && scene && camera) renderer.render(scene, camera);
}

document.getElementById("rotateLeft")?.addEventListener("click", () => rotateModel(1));
document.getElementById("rotateRight")?.addEventListener("click", () => rotateModel(-1));
document.getElementById("resetView")?.addEventListener("click", () => {
  if (model) model.rotation.y = 0;
  controls?.reset();
});
autoButton?.addEventListener("click", () => {
  autoSpin = !autoSpin;
  updateSpinButton();
  if (autoSpin && isVisible && model) animate();
});

try {
  if (!window.WebGLRenderingContext) throw new Error("WebGL не поддерживается этим браузером.");
  initScene();
  loadModel();
} catch (error) {
  showError(error);
}
