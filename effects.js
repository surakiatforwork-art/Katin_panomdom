/* Live-only ceremony effects. No geometry, canvas or particles enter export. */
(() => {
  "use strict";
  let enabled = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = false;
  let targetX = 0;
  const active = () => enabled && !paused && !document.hidden;
  // Avoid a full-screen canvas compositor layer on touch devices / iOS.
  const touchMode =
    matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const touchLayer = document.createElement("div");
  touchLayer.className = "touch-sparkles live-decoration";
  touchLayer.setAttribute("aria-hidden", "true");
  touchLayer.setAttribute("data-html2canvas-ignore", "true");
  if (touchMode) document.body.append(touchLayer);
  const touchStars = new Set();
  function emitTouch(x, y, count) {
    for (let i = 0; i < Math.min(count, 12); i++) {
      const star = document.createElement("i");
      star.className = "touch-spark";
      star.textContent = "✦";
      star.style.left = `${x}px`;
      star.style.top = `${y}px`;
      star.style.fontSize = `${9 + Math.random() * 9}px`;
      touchLayer.append(star);
      touchStars.add(star);
      const drift = (Math.random() - 0.5) * 85;
      const rise = 65 + Math.random() * 100;
      const animation = star.animate(
        [
          { transform: "translate(0,0) scale(.35)", opacity: 0 },
          {
            offset: 0.16,
            transform: `translate(${drift * 0.15}px,${-rise * 0.15}px) scale(1)`,
            opacity: 1,
          },
          { offset: 0.5, opacity: 0.55 },
          {
            transform: `translate(${drift}px,${-rise}px) scale(.25)`,
            opacity: 0,
          },
        ],
        { duration: 700 + Math.random() * 450, easing: "ease-out" },
      );
      const remove = () => {
        touchStars.delete(star);
        star.remove();
      };
      animation.onfinish = remove;
      while (touchStars.size > 48) {
        const oldest = touchStars.values().next().value;
        oldest.getAnimations().forEach((a) => a.cancel());
        touchStars.delete(oldest);
        oldest.remove();
      }
    }
  }
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

  // Upward pointer fountains are drawn on a click-through screen overlay.
  const canvas = document.createElement("canvas");
  canvas.id = "pointer-sparkles";
  canvas.className = "pointer-sparkles live-decoration";
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("data-html2canvas-ignore", "true");
  if (!touchMode) document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  let particles = [],
    particleFrame = 0,
    lastTime = 0,
    lastEmit = 0;
  function resize() {
    if (touchMode) return;
    const dpr = Math.min(devicePixelRatio, 1.25);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });
  function emit(x, y, count) {
    if (!active() || document.getElementById("export-dialog").open) return;
    if (touchMode) {
      emitTouch(x, y, count);
      return;
    }
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
    if (particles.length > 128) particles.splice(0, particles.length - 128);
    if (!particleFrame) {
      lastTime = performance.now();
      particleFrame = requestAnimationFrame(drawParticles);
    }
  }
  function drawParticles(time) {
    particleFrame = 0;
    if (active() && time - lastTime < 32) {
      particleFrame = requestAnimationFrame(drawParticles);
      return;
    }
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
    touchLayer.style.display = enabled ? "" : "none";
    document.body.classList.toggle("effects-paused", paused || document.hidden);
    if (!active()) {
      for (const star of touchStars) {
        star.getAnimations().forEach((a) => a.cancel());
        star.remove();
      }
      touchStars.clear();
      cancelAnimationFrame(particleFrame);
      particleFrame = 0;
      particles = [];
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
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
