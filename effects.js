/* Live-only ceremony effects. No geometry, canvas or particles enter export. */
(() => {
  "use strict";
  let enabled = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = false;
  let sceneVisible = true;
  const host = document.getElementById("ceremony-scene");
  let renderer,
    scene,
    camera,
    offering,
    sceneFrame = 0,
    lastRender = 0;
  let targetX = 0,
    targetY = 0;
  const active = () => enabled && !paused && !document.hidden;
  const layer = document.createElement("div");
  layer.className = "floating-petals live-decoration";
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("data-html2canvas-ignore", "true");
  document.body.append(layer);
  for (let i = 0; i < 18; i++) {
    const petal = document.createElement("i");
    petal.className = "floating-petal";
    petal.style.setProperty("--edge", `${i % 2 ? 89 + (i % 9) : i % 10}%`);
    petal.style.setProperty("--duration", `${13 + (i % 9)}s`);
    petal.style.setProperty("--delay", `${-i * 2.4}s`);
    petal.style.setProperty("--size", `${9 + (i % 12)}px`);
    layer.append(petal);
  }

  // A real lit 3D model: lathed gold pedestal, scalloped tray and folded cloth.
  try {
    const T = window.THREE;
    renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(360, 230);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.className = "offering-canvas";
    host.append(renderer.domElement);
    host.classList.add("webgl-ready");
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(34, 360 / 230, 0.1, 50);
    camera.position.set(4, 3.3, 6.8);
    camera.lookAt(0, 0.85, 0);
    scene.add(new T.HemisphereLight(0xffefc9, 0x805020, 2.4));
    const key = new T.DirectionalLight(0xffe4ac, 4.5);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new T.DirectionalLight(0xffffff, 3.2);
    rim.position.set(4, 2, -3);
    scene.add(rim);
    const gold = new T.MeshStandardMaterial({
      color: 0xeeb337,
      metalness: 0.72,
      roughness: 0.24,
    });
    const accent = new T.MeshStandardMaterial({
      color: 0xffd967,
      metalness: 0.65,
      roughness: 0.22,
    });
    offering = new T.Group();
    scene.add(offering);
    const profile = [
      [0, 0],
      [0.72, 0],
      [0.82, 0.08],
      [0.73, 0.18],
      [0.48, 0.24],
      [0.28, 0.38],
      [0.2, 0.64],
      [0.24, 0.82],
      [0.48, 0.92],
      [0.82, 1.02],
      [1.26, 1.2],
      [1.52, 1.42],
      [1.55, 1.5],
      [1.46, 1.52],
      [1.3, 1.35],
      [0.9, 1.25],
      [0, 1.24],
    ];
    offering.add(
      new T.Mesh(
        new T.LatheGeometry(
          profile.map(([x, y]) => new T.Vector2(x, y)),
          64,
        ),
        gold,
      ),
    );
    for (const [radius, y, tube] of [
      [0.76, 0.1, 0.04],
      [0.44, 0.29, 0.035],
      [0.27, 0.79, 0.035],
      [1.52, 1.48, 0.055],
    ]) {
      const ring = new T.Mesh(
        new T.TorusGeometry(radius, tube, 10, 64),
        accent,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      offering.add(ring);
    }
    for (let i = 0; i < 32; i++) {
      const bead = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), accent);
      const angle = (i * Math.PI) / 16;
      bead.position.set(Math.cos(angle) * 1.5, 1.46, Math.sin(angle) * 1.5);
      bead.scale.set(1, 1.6, 1);
      offering.add(bead);
    }
    const clothTexture = document.createElement("canvas");
    clothTexture.width = 256;
    clothTexture.height = 128;
    const paint = clothTexture.getContext("2d");
    paint.fillStyle = "#f5a723";
    paint.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 128; i++) {
      paint.fillStyle = `rgba(110,44,0,${0.04 + 0.06 * Math.sin(i * 0.18)})`;
      paint.fillRect(0, i, 256, 1);
    }
    const texture = new T.CanvasTexture(clothTexture);
    texture.colorSpace = T.SRGBColorSpace;
    const cloth = new T.MeshStandardMaterial({
      map: texture,
      color: 0xffbd3c,
      roughness: 0.92,
      metalness: 0,
    });
    for (let i = 0; i < 4; i++) {
      const fold = new T.Mesh(
        new T.BoxGeometry(2.22 - i * 0.06, 0.19, 1.28, 12, 2, 8),
        cloth,
      );
      const positions = fold.geometry.attributes.position;
      for (let j = 0; j < positions.count; j++)
        positions.setY(
          j,
          positions.getY(j) + Math.sin(positions.getX(j) * 5 + i) * 0.025,
        );
      fold.geometry.computeVertexNormals();
      fold.position.set((i % 2) * 0.035, 1.57 + i * 0.185, 0);
      fold.rotation.y = 0.08;
      offering.add(fold);
      const hem = new T.Mesh(
        new T.CylinderGeometry(0.09, 0.09, 2.2 - i * 0.06, 16),
        cloth,
      );
      hem.rotation.z = Math.PI / 2;
      hem.position.set(0, 1.57 + i * 0.185, 0.64);
      offering.add(hem);
    }
    const band = new T.Mesh(
      new T.BoxGeometry(0.22, 0.04, 1.35),
      new T.MeshStandardMaterial({ color: 0xffd165, roughness: 0.8 }),
    );
    band.position.set(0.45, 2.24, 0);
    offering.add(band);
    renderer.render(scene, camera);
    new IntersectionObserver(([entry]) => {
      sceneVisible = entry.isIntersecting;
      sync();
    }).observe(host);
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      cancelAnimationFrame(sceneFrame);
      sceneFrame = 0;
      host.classList.remove("webgl-ready");
      renderer = null;
    });
  } catch (_) {
    host.classList.remove("webgl-ready");
    if (renderer) renderer.dispose();
    renderer = null;
  }
  function renderScene(time) {
    sceneFrame = 0;
    if (!renderer || !active() || !sceneVisible) return;
    if (time - lastRender > 32) {
      lastRender = time;
      offering.rotation.y = Math.sin(time * 0.00038) * 0.48 + targetX * 0.35;
      offering.rotation.x = targetY * 0.09;
      offering.position.y = Math.sin(time * 0.0012) * 0.055;
      renderer.render(scene, camera);
    }
    sceneFrame = requestAnimationFrame(renderScene);
  }

  // Upward pointer fountains are drawn on a click-through screen overlay.
  const canvas = document.createElement("canvas");
  canvas.id = "pointer-sparkles";
  canvas.className = "pointer-sparkles live-decoration";
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("data-html2canvas-ignore", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  let particles = [],
    particleFrame = 0,
    lastTime = 0,
    lastEmit = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });
  function emit(x, y, count) {
    if (!active() || document.getElementById("export-dialog").open) return;
    for (let i = 0; i < count; i++)
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 110,
        vy: -65 - Math.random() * 180,
        life: 0,
        max: 0.65 + Math.random() * 0.75,
        size: 1 + Math.random() * 2.7,
        phase: Math.random() * 6.28,
      });
    if (particles.length > 220) particles.splice(0, particles.length - 220);
    if (!particleFrame) {
      lastTime = performance.now();
      particleFrame = requestAnimationFrame(drawParticles);
    }
  }
  function drawParticles(time) {
    particleFrame = 0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!active()) {
      particles = [];
      return;
    }
    const dt = Math.min((time - lastTime) / 1000, 0.04);
    lastTime = time;
    particles = particles.filter((p) => p.life < p.max);
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 25 * dt;
      const fade = Math.max(0, 1 - p.life / p.max);
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(p.life * 19 + p.phase));
      ctx.globalAlpha = fade * twinkle;
      ctx.strokeStyle = "#ffdf7e";
      ctx.fillStyle = "#fff6d9";
      ctx.shadowColor = "#ffc34b";
      ctx.shadowBlur = 11;
      const r = p.size * (0.8 + twinkle);
      ctx.beginPath();
      ctx.moveTo(p.x - r * 2, p.y);
      ctx.lineTo(p.x + r * 2, p.y);
      ctx.moveTo(p.x, p.y - r * 2);
      ctx.lineTo(p.x, p.y + r * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    if (particles.length) particleFrame = requestAnimationFrame(drawParticles);
  }
  window.addEventListener(
    "pointermove",
    (event) => {
      targetX = (event.clientX / innerWidth - 0.5) * 2;
      targetY = (event.clientY / innerHeight - 0.5) * 2;
      if (performance.now() - lastEmit < 24) return;
      lastEmit = performance.now();
      emit(event.clientX, event.clientY, event.pointerType === "touch" ? 9 : 5);
      document.documentElement.style.setProperty(
        "--lotus-tilt",
        `${targetX * 10}deg`,
      );
    },
    { passive: true },
  );
  window.addEventListener(
    "pointerdown",
    (event) => emit(event.clientX, event.clientY, 32),
    { passive: true },
  );
  document.addEventListener("visibilitychange", sync);
  function sync() {
    layer.style.display = enabled ? "" : "none";
    canvas.style.display = enabled ? "" : "none";
    document.body.classList.toggle("effects-paused", paused || document.hidden);
    if (!active()) {
      cancelAnimationFrame(sceneFrame);
      sceneFrame = 0;
      cancelAnimationFrame(particleFrame);
      particleFrame = 0;
      particles = [];
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    } else if (renderer && sceneVisible && !sceneFrame)
      sceneFrame = requestAnimationFrame(renderScene);
  }
  window.KathinEffects = {
    setEnabled(value) {
      enabled = value;
      sync();
    },
    pause(value) {
      paused = value;
      sync();
    },
  };
  sync();
  // DOM petals retain individual depth and parallax; the static footer remains below.
  const footer = document.querySelector(".poster-footer");
  for (const side of ["left", "right"]) {
    const lotus = document.createElement("div");
    lotus.className = `lotus-3d lotus-${side} live-decoration`;
    lotus.setAttribute("data-html2canvas-ignore", "true");
    lotus.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 9; i++) {
      const petal = document.createElement("i");
      petal.className = "lotus-petal";
      petal.style.setProperty("--angle", `${(i - 4) * 17}deg`);
      petal.style.setProperty("--depth", `${Math.abs(i - 4) * -5}px`);
      lotus.append(petal);
    }
    const heart = document.createElement("b");
    heart.className = "lotus-heart";
    lotus.append(heart);
    footer.append(lotus);
  }
  const glint = document.createElement("div");
  glint.className = "frame-glint live-decoration";
  glint.setAttribute("data-html2canvas-ignore", "true");
  glint.setAttribute("aria-hidden", "true");
  document.getElementById("poster").append(glint);
})();
