(() => {
  "use strict";

  const FPS = 60;
  const PREVIEW_SECONDS = 90;

  // CONFIGURACIÓN DE ACCESO
  // Cambia PURCHASE_URL por la URL real de tu producto Gumroad antes de publicar.
  const PURCHASE_URL = "https://payhip.com/b/0vY1y";
  // Contraseña temporal inicial: FLOW2026. Cámbiala antes de vender.
  const PASSWORD_SHA256 = "06a70c266512ea2200aaf30fca26d250d6503228ae7221cae9b82cbc42e456fb";
  const ACCESS_KEY = "visualizer_flow_access";

  const $ = (s) => document.querySelector(s);
  const canvas = $("#canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const audioInput = $("#audioInput");
  const artist = $("#artist");
  const title = $("#title");
  const subtitle = $("#subtitle");
  const animationSelect = $("#animationSelect");
  const paletteSelect = $("#paletteSelect");
  const backgroundSelect = $("#backgroundSelect");
  const fontSelect = $("#fontSelect");
  const positionSelect = $("#positionSelect");
  const intensitySelect = $("#intensitySelect");
  const formatSelect = $("#formatSelect");
  const playBtn = $("#playPreview");
  const muteBtn = $("#mutePreview");
  const exportBtn = $("#exportButton");
  const randomStyleButton = $("#randomStyleButton");
  const advancedToggle = $("#advancedToggle");
  const advancedPanel = $("#advancedPanel");
  const status = $("#status");
  const empty = $("#emptyState");
  const progress = $("#previewProgress");
  const previewTime = $("#previewTime");
  const fileLabel = $("#fileLabel");
  const exportFill = $("#exportFill");
  const styleSummary = $("#styleSummary");
  const buyButton = $("#buyButton");
  const loginButton = $("#loginButton");
  const payModal = $("#payModal");
  const loginModal = $("#loginModal");
  const modalBuyButton = $("#modalBuyButton");
  const modalLoginButton = $("#modalLoginButton");
  const loginBuyButton = $("#loginBuyButton");
  const passwordInput = $("#passwordInput");
  const loginSubmit = $("#loginSubmit");
  const loginError = $("#loginError");
  const unlockHint = $("#unlockHint");
  const trimCard = $("#trimCard");
  const trimStartInput = $("#trimStart");
  const trimEndInput = $("#trimEnd");
  const trimStartLabel = $("#trimStartLabel");
  const trimEndLabel = $("#trimEndLabel");
  const trimDurationLabel = $("#trimDurationLabel");
  const trimRangeFill = $("#trimRangeFill");

  const formats = {
    vertical: { w: 1080, h: 1920 },
    portrait: { w: 1080, h: 1350 },
    square: { w: 1080, h: 1080 },
    landscape: { w: 1920, h: 1080 }
  };

  const palettes = {
    ocean: {
      label: "Ocean",
      colors: ["#7ee7ff", "#2db8ff", "#5967ff", "#10162e"],
      bg: ["#07111f", "#0b1730", "#020308"]
    },
    sunset: {
      label: "Sunset",
      colors: ["#ffe08a", "#ff9a4d", "#ff4f7b", "#5b173b"],
      bg: ["#1e0d16", "#32131b", "#070307"]
    },
    ultraviolet: {
      label: "Ultraviolet",
      colors: ["#f2b6ff", "#b56dff", "#6d5cff", "#241447"],
      bg: ["#120b22", "#1d0e36", "#040208"]
    }
  };

  const animationLabels = {
    spectrum: "Espectro",
    wave: "Ondas",
    particles: "Partículas",
    planets: "Planetas"
  };

  const backgroundLabels = {
    aurora: "Aurora",
    waves: "Ondulado",
    prisms: "Prismas"
  };

  const fontLabels = {
    modern: "Modern",
    editorial: "Editorial",
    mono: "Mono"
  };

  const positionLabels = {
    top: "Arriba",
    center: "Centro",
    bottom: "Abajo"
  };

  const intensityLabels = {
    balanced: "Equilibrada",
    bold: "Intensa"
  };

  const fontStacks = {
    modern: 'Arial, Helvetica, sans-serif',
    editorial: 'Georgia, "Times New Roman", serif',
    mono: '"Courier New", Courier, monospace'
  };

  let audioCtx = null;
  let buffer = null;
  let analyser = null;
  let source = null;
  let gain = null;
  let playing = false;
  let muted = false;
  let animationId = 0;
  let resizeTimer = null;
  let trimStart = 0;
  let trimEnd = 0;

  let visual = {
    animation: "spectrum",
    palette: "ocean",
    background: "aurora",
    font: "modern",
    position: "top",
    intensity: "balanced"
  };

  function hasAccess() {
    return localStorage.getItem(ACCESS_KEY) === "1";
  }

  function syncAccessUI() {
    const unlocked = hasAccess();
    if (exportBtn) {
      exportBtn.textContent = unlocked ? "EXPORTAR VIDEO" : "🔒 EXPORTAR VIDEO";
      exportBtn.title = unlocked ? "Exportar video" : "Compra o inicia sesión para exportar";
    }
    if (unlockHint) {
      unlockHint.textContent = unlocked
        ? "Exportación desbloqueada. Puedes descargar tu video cuando quieras."
        : "Prueba el visualizador gratis. La exportación se desbloquea después de comprar o iniciar sesión.";
    }
    if (status && unlocked && !buffer) {
      status.textContent = "Sesión iniciada. Sube una canción para comenzar.";
    }
    if (buffer && exportBtn) exportBtn.disabled = false;
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function goToPurchase() {
    window.open(PURCHASE_URL, "_blank", "noopener,noreferrer");
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function tryLogin() {
    const password = (passwordInput?.value || "").trim();
    if (!password) {
      if (loginError) loginError.textContent = "Introduce tu contraseña.";
      return;
    }
    try {
      const hash = await sha256(password);
      if (hash === PASSWORD_SHA256) {
        localStorage.setItem(ACCESS_KEY, "1");
        if (loginError) loginError.textContent = "";
        if (passwordInput) passwordInput.value = "";
        closeModal(loginModal);
        syncAccessUI();
        if (buffer) exportBtn.disabled = false;
        if (status) setStatus("ACCESO DESBLOQUEADO · Puedes exportar tu video.");
      } else {
        if (loginError) loginError.textContent = "Contraseña incorrecta.";
      }
    } catch (error) {
      console.error(error);
      if (loginError) loginError.textContent = "No se pudo verificar la contraseña.";
    }
  }

  function audioEngine() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("Web Audio no disponible");
      audioCtx = new AC();
    }
    return audioCtx;
  }

  function fmt(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function setStatus(text) {
    if (!status) return;

    status.textContent = text;

    const match = text.match(/EXPORTANDO WEBM\s*[·-]\s*(\d+)%/i);
    const percent = match
      ? Number(match[1])
      : (/LISTO\s*[·-]\s*100%/i.test(text) ? 100 : 0);

    if (exportFill) exportFill.style.width = percent + "%";
  }

  function seeded(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomVisualStyle() {
    const animation = randomItem(Object.keys(animationLabels));
    const palette = randomItem(Object.keys(palettes));
    const intensity = randomItem(Object.keys(intensityLabels));
    const font = randomItem(Object.keys(fontLabels));

    // Solo combinaciones que existen y que se mantienen visualmente seguras.
    const allowedBackgrounds =
      animation === "wave"
        ? ["aurora", "waves", "prisms"]
        : animation === "particles"
          ? ["aurora", "prisms"]
          : animation === "planets"
            ? ["aurora", "prisms"]
            : ["aurora", "waves", "prisms"];

    const background = randomItem(allowedBackgrounds);

    const allowedPositions = animation === "spectrum"
      ? ["top", "center"]
      : animation === "wave"
        ? ["top", "center"]
        : animation === "planets"
          ? ["top", "center"]
          : ["top", "center", "bottom"];

    const position = randomItem(allowedPositions);

    return {
      animation,
      palette,
      background,
      font,
      position,
      intensity
    };
  }

  function applyVisual(next, redraw = true) {
    visual = { ...visual, ...next };
    if (visual.intensity === "soft") visual.intensity = "balanced";

    animationSelect.value = visual.animation;
    paletteSelect.value = visual.palette;
    backgroundSelect.value = visual.background;
    fontSelect.value = visual.font;
    positionSelect.value = visual.position;
    intensitySelect.value = visual.intensity;

    updateSummary();

    if (redraw) draw(performance.now(), 0.08);
  }

  function updateSummary() {
    const p = palettes[visual.palette];

    styleSummary.textContent =
      `${animationLabels[visual.animation]} · ${p.label} · ${backgroundLabels[visual.background]}`;
  }

  function newRandomStyle() {
    applyVisual(randomVisualStyle());
  }

  function fit() {
    const format = formats[formatSelect.value];
    if (!format) return;

    canvas.width = format.w;
    canvas.height = format.h;

    const previewWrap = document.querySelector(".preview-wrap");

    if (previewWrap) {
      previewWrap.style.aspectRatio = `${format.w} / ${format.h}`;
    }

    draw(performance.now(), 0.08);
  }

  function energyProfile() {
    const map = {
      balanced: 1,
      bold: 1.35
    };

    return map[visual.intensity] || 1;
  }

  function clearBackground(t, energy) {
    const w = canvas.width;
    const h = canvas.height;
    const p = palettes[visual.palette];
    const intensity = energyProfile();

    if (visual.background === "waves") {
      ctx.fillStyle = p.bg[2];
      ctx.fillRect(0, 0, w, h);
      drawSoftWaveBackground(t, p, intensity);
    } else if (visual.background === "prisms") {
      drawPrismsBackground(t, p, intensity);
    } else {
      const gradient = ctx.createRadialGradient(
        w * 0.5,
        h * 0.32,
        0,
        w * 0.5,
        h * 0.55,
        Math.max(w, h) * 0.78
      );

      gradient.addColorStop(0, p.bg[0]);
      gradient.addColorStop(.48, p.bg[1]);
      gradient.addColorStop(1, p.bg[2]);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      drawOrbs(t, p, energy, intensity);
    }
  }

  function drawOrbs(t, p, energy, intensity) {
    const w = canvas.width;
    const h = canvas.height;

    const spots = [
      [0.18, 0.25, 0.36, p.colors[2]],
      [0.82, 0.38, 0.32, p.colors[1]],
      [0.48, 0.78, 0.42, p.colors[3]]
    ];

    spots.forEach((s, i) => {
      const x =
        w * s[0] +
        Math.sin(t * 0.00025 + i) * w * 0.025;

      const y =
        h * s[1] +
        Math.cos(t * 0.0002 + i) * h * 0.02;

      const r =
        Math.min(w, h) *
        s[2] *
        (0.9 + energy * 0.08 * intensity);

      const g = ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        r
      );

      const c = hexToRgba(
        s[3],
        0.22 + energy * 0.08
      );

      g.addColorStop(0, c);
      g.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }

  function drawSoftWaveBackground(t, p, intensity) {
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    for (let k = 0; k < 3; k++) {
      ctx.beginPath();

      const yBase = h * (0.22 + k * 0.27);

      for (
        let x = 0;
        x <= w;
        x += Math.max(10, w / 90)
      ) {
        const y =
          yBase +
          Math.sin(
            x * 0.008 +
            t * 0.00045 +
            k * 1.7
          ) *
          h *
          (0.045 + k * 0.008) *
          intensity;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();

      ctx.fillStyle = hexToRgba(
        p.colors[k + 1],
        0.11 + k * 0.025
      );

      ctx.fill();
    }

    ctx.restore();
  }

  function drawPrismsBackground(t, p, intensity) {
    const w = canvas.width;
    const h = canvas.height;
    const base = Math.min(w, h);

    ctx.save();

    // Multicolor base: never a flat/empty black background.
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, p.bg[0]);
    bg.addColorStop(.48, p.bg[1]);
    bg.addColorStop(1, p.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Lightweight translucent geometric planes.
    const count = 16;
    const drift = t * 0.000035;

    for (let i = 0; i < count; i++) {
      const seed = seeded(i * 13.7 + 4.2);
      const x = (seeded(i * 7.1 + 1.4) * 1.25 - .125) * w;
      const y = (seeded(i * 5.3 + 8.2) * 1.20 - .10) * h;
      const size = base * (.10 + seed * .15);
      const angle =
        seeded(i * 3.9 + 2.1) * Math.PI +
        drift * (i % 2 === 0 ? 1 : -1);

      const c1 = p.colors[i % p.colors.length];
      const c2 = p.colors[(i + 1) % p.colors.length];
      const alpha = .07 + seeded(i + 21) * .055;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const g = ctx.createLinearGradient(-size, -size, size, size);
      g.addColorStop(0, hexToRgba(c1, alpha));
      g.addColorStop(.52, hexToRgba(c2, alpha * 1.25));
      g.addColorStop(1, hexToRgba(c1, 0));

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-size, size * .58);
      ctx.lineTo(size * .72, size);
      ctx.lineTo(size, -size * .52);
      ctx.lineTo(-size * .42, -size);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Subtle light sweep tied to intensity, keeping the background alive.
    const sweepX =
      ((Math.sin(t * 0.00016) + 1) * .5) * w;
    const sweep = ctx.createRadialGradient(
      sweepX,
      h * .42,
      0,
      sweepX,
      h * .42,
      base * .42
    );
    sweep.addColorStop(0, hexToRgba(p.colors[0], .045 * intensity));
    sweep.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const bigint = parseInt(value, 16);

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawTextBackdrop() {
    const w = canvas.width;
    const h = canvas.height;
    const y = getTextY();

    const radius = Math.min(w, h) * 0.33;

    const g = ctx.createRadialGradient(
      w * .5,
      y,
      0,
      w * .5,
      y,
      radius
    );

    g.addColorStop(0, "rgba(0,0,0,.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = g;

    ctx.fillRect(
      0,
      Math.max(0, y - radius),
      w,
      Math.min(h, radius * 2)
    );
  }

  function getTextY() {
    const h = canvas.height;

    if (visual.position === "top") return h * 0.25;
    if (visual.position === "bottom") return h * 0.78;

    return h * 0.50;
  }

  function textLayer() {
    const w = canvas.width;
    const h = canvas.height;
    const base = Math.min(w, h);
    const cx = w / 2;
    const y = getTextY();

    const p = palettes[visual.palette];
    const font = fontStacks[visual.font];

    const artistText =
      (artist.value || "NOVA").trim().toUpperCase();

    const titleText =
      (title.value || "MIDNIGHT").trim().toUpperCase();

    const subtitleText =
      (subtitle.value || "NEW RELEASE").trim().toUpperCase();

    drawTextBackdrop();

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = hexToRgba(p.colors[2], .5);
    ctx.shadowBlur = base * .018;

    ctx.fillStyle = "#ffffff";

    ctx.font =
      `800 ${Math.max(24, base * .058)}px ${font}`;

    ctx.fillText(
      artistText,
      cx,
      y
    );

    ctx.shadowBlur = base * .012;
    ctx.fillStyle = p.colors[0];

    ctx.font =
      `600 ${Math.max(15, base * .028)}px ${font}`;

    ctx.fillText(
      titleText,
      cx,
      y + Math.max(31, base * .07)
    );

    if (subtitleText) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = hexToRgba(
        p.colors[0],
        .72
      );

      ctx.font =
        `600 ${Math.max(11, base * .016)}px ${font}`;

      ctx.letterSpacing = "2px";

      ctx.fillText(
        subtitleText,
        cx,
        y + Math.max(56, base * .105)
      );
    }

    ctx.restore();
  }

  /*
   * ESPECTRO
   *
   * Cambio realizado:
   * - Las barras ahora ocupan prácticamente todo el ancho.
   * - Se mantienen pequeños márgenes laterales.
   * - La altura máxima se adapta a la posición del texto.
   * - Las barras no pueden crecer dentro de la zona reservada
   *   para los textos.
   *
   * El resto del visualizador permanece igual.
   */
  function spectrum(energy, t) {
    const w = canvas.width;
    const h = canvas.height;
    const base = Math.min(w, h);
    const cx = w / 2;

    const p = palettes[visual.palette];
    const intensity = energyProfile();

    const count = 72;

    const sideMargin = Math.max(
      8,
      w * 0.012
    );

    const maxWidth =
      w - sideMargin * 2;

    const gap = Math.max(
      1.5,
      base * 0.003
    );

    const bw =
      (maxWidth - gap * (count - 1)) /
      count;

    /*
     * Zona segura para las barras.
     *
     * El texto se dibuja DESPUÉS de las barras,
     * pero no queremos depender de que el texto
     * simplemente tape las barras.
     */
    let floor;
    let maxBarHeight;

    if (visual.position === "bottom") {
      /*
       * En la posición inferior el texto está
       * alrededor de h * .78.
       *
       * Las barras quedan por encima del bloque
       * de texto.
       */
      const textY = getTextY();

      floor =
        textY -
        Math.max(70, base * 0.14);

      maxBarHeight =
        Math.max(
          base * 0.06,
          floor - base * 0.05
        );

    } else {
      /*
       * Arriba o centro:
       * las barras se mantienen debajo del texto.
       */
      floor = h * 0.93;

      const textY = getTextY();

      const textBottom =
        textY +
        Math.max(56, base * 0.105);

      maxBarHeight =
        Math.max(
          base * 0.08,
          floor -
          textBottom -
          base * 0.06
        );
    }

    ctx.save();

    ctx.lineCap = "round";

    for (let i = 0; i < count; i++) {
      const wave =
        .22 +
        .78 *
        Math.abs(
          Math.sin(
            i * .73 +
            t * .0024
          )
        );

      const edge =
        Math.sin(
          i / count * Math.PI
        );

      const rawHeight =
        base *
        (
          .018 +
          energy *
          .30 *
          intensity *
          wave *
          edge
        );

      const height =
        Math.min(
          Math.max(
            base * .012,
            rawHeight
          ),
          maxBarHeight
        );

      const x =
        sideMargin +
        i * (bw + gap);

      const y =
        floor -
        height;

      const gradient =
        ctx.createLinearGradient(
          0,
          y,
          0,
          floor
        );

      gradient.addColorStop(
        0,
        p.colors[0]
      );

      gradient.addColorStop(
        .35,
        p.colors[1]
      );

      gradient.addColorStop(
        1,
        p.colors[2]
      );

      ctx.fillStyle = gradient;

      ctx.shadowColor =
        p.colors[1];

      ctx.shadowBlur = 8;

      ctx.fillRect(
        x,
        y,
        bw,
        height
      );
    }

    ctx.shadowBlur = 0;

    ctx.strokeStyle =
      hexToRgba(
        p.colors[1],
        .45
      );

    ctx.lineWidth =
      Math.max(
        1,
        base * .002
      );

    ctx.beginPath();

    ctx.moveTo(
      sideMargin,
      floor + 2
    );

    ctx.lineTo(
      w - sideMargin,
      floor + 2
    );

    ctx.stroke();

    ctx.restore();
  }

  function wave(energy, t) {
    const w = canvas.width;
    const h = canvas.height;
    const base = Math.min(w, h);
    const p = palettes[visual.palette];

    const intensity = energyProfile();

    const y =
      visual.position === "top"
        ? h * .72
        : h * .66;

    ctx.save();

    ctx.lineCap = "round";

    for (let k = 0; k < 3; k++) {
      ctx.beginPath();

      for (let x = 0; x <= w; x += 8) {
        const amplitude =
          base *
          (.025 + k * .007) +
          energy *
          base *
          (.11 - k * .018) *
          intensity;

        const yy =
          y +
          (k - 1) *
          base *
          .065 +
          Math.sin(
            x * .014 +
            t * .006 +
            k
          ) *
          amplitude;

        if (x === 0) {
          ctx.moveTo(x, yy);
        } else {
          ctx.lineTo(x, yy);
        }
      }

      ctx.strokeStyle =
        k === 1
          ? p.colors[0]
          : hexToRgba(
              p.colors[1],
              .62
            );

      ctx.shadowColor =
        p.colors[1];

      ctx.shadowBlur = 15;

      ctx.lineWidth =
        Math.max(
          2,
          base * .006
        );

      ctx.stroke();
    }

    ctx.restore();
  }

  function particles(energy, t) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const base = Math.min(w, h);
    const p = palettes[visual.palette];

    const intensity = energyProfile();

    const centerY =
      visual.position === "bottom"
        ? h * .35
        : h * .63;

    ctx.save();

    for (let i = 0; i < 210; i++) {
      const angle =
        seeded(i) *
        Math.PI *
        2 +
        t *
        .00025 *
        (.5 + seeded(i + 4));

      const radius =
        base *
        (.16 + seeded(i + 9) * .29) +
        energy *
        base *
        .1 *
        intensity;

      const x =
        cx +
        Math.cos(angle) *
        radius;

      const y =
        centerY +
        Math.sin(angle) *
        radius *
        .35;

      ctx.fillStyle =
        i % 9 === 0
          ? p.colors[0]
          : hexToRgba(
              p.colors[1],
              .6
            );

      ctx.shadowColor =
        p.colors[1];

      ctx.shadowBlur = 8;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        Math.max(
          1,
          base *
          .003 *
          (.7 + energy * 2) *
          intensity
        ),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.restore();
  }

  function planets(energy, t) {
    const w = canvas.width;
    const h = canvas.height;
    const base = Math.min(w, h);
    const cx = w / 2;
    const p = palettes[visual.palette];
    const intensity = energyProfile();

    // Keep planets away from the text when text is at the top.
    // Center remains visually balanced; the randomizer avoids risky
    // combinations for this animation.
    const cy =
      visual.position === "top"
        ? h * .67
        : h * .50;

    // More planets, independent speeds and phases.
    const systems = [
      { rx: .105, ry: .052, speed: .00145, phase: .20, size: .0080, color: 0 },
      { rx: .135, ry: .067, speed: -.00120, phase: 1.50, size: .0100, color: 1 },
      { rx: .165, ry: .082, speed: .00102, phase: 2.40, size: .0070, color: 2 },
      { rx: .195, ry: .097, speed: -.00088, phase: 3.20, size: .0110, color: 0 },
      { rx: .225, ry: .112, speed: .00076, phase: 4.10, size: .0085, color: 1 },
      { rx: .255, ry: .127, speed: -.00066, phase: 5.00, size: .0120, color: 2 },
      { rx: .285, ry: .142, speed: .00057, phase: .90, size: .0075, color: 0 },
      { rx: .315, ry: .157, speed: -.00050, phase: 2.10, size: .0095, color: 1 },
      { rx: .345, ry: .172, speed: .00044, phase: 3.80, size: .0065, color: 2 },
      { rx: .375, ry: .187, speed: -.00039, phase: 5.30, size: .0105, color: 0 }
    ];

    const beat =
      Math.max(0, Math.min(1, energy * intensity));

    // Musical "jump": keep the existing orbit logic, but make the
    // planets visibly breathe outward on stronger beats.
    const orbitPulse = 1 + beat * (intensity >= 1.35 ? .075 : .055);

    ctx.save();

    ctx.lineWidth =
      Math.max(1, base * .0010);

    systems.forEach((s, i) => {
      const rx = base * s.rx * orbitPulse;
      const ry = base * s.ry * orbitPulse;
      const rot = -.12 + (i % 5) * .05;

      ctx.strokeStyle =
        hexToRgba(
          p.colors[s.color],
          .07 + beat * .025
        );

      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        rx,
        ry,
        rot,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    });

    // Central star.
    const starR =
      base * (.018 + beat * .006 * intensity);

    const star =
      ctx.createRadialGradient(
        cx, cy, 0,
        cx, cy, starR * 4
      );

    star.addColorStop(
      0,
      hexToRgba(p.colors[0], .94)
    );
    star.addColorStop(
      .25,
      hexToRgba(p.colors[1], .36)
    );
    star.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.fillStyle = star;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      starR * 4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = p.colors[0];
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      starR,
      0,
      Math.PI * 2
    );
    ctx.fill();

    systems.forEach((s, i) => {
      const angle =
        t * s.speed + s.phase;

      const rot =
        -.12 + (i % 5) * .05;

      const rx =
        base * s.rx * orbitPulse;

      const ry =
        base * s.ry * orbitPulse;

      const lx =
        Math.cos(angle) * rx;

      const ly =
        Math.sin(angle) * ry;

      const x =
        cx +
        lx * Math.cos(rot) -
        ly * Math.sin(rot);

      const y =
        cy +
        lx * Math.sin(rot) +
        ly * Math.cos(rot);

      const planetPulse =
        1 +
        beat * (
          (intensity >= 1.35 ? .42 : .28) +
          (i % 3) * (intensity >= 1.35 ? .035 : .02)
        );

      const r =
        Math.max(
          2,
          base * s.size * planetPulse
        );

      const planet =
        ctx.createRadialGradient(
          x - r * .35,
          y - r * .35,
          r * .05,
          x,
          y,
          r
        );

      planet.addColorStop(
        0,
        "rgba(255,255,255,.90)"
      );
      planet.addColorStop(
        .20,
        hexToRgba(p.colors[s.color], .98)
      );
      planet.addColorStop(
        1,
        hexToRgba(p.colors[s.color], .18)
      );

      ctx.fillStyle = planet;
      ctx.shadowColor = p.colors[s.color];
      ctx.shadowBlur =
        Math.max(
          2,
          base * (.0035 + beat * .003)
        );

      ctx.beginPath();
      ctx.arc(
        x,
        y,
        r,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.shadowBlur = 0;

      // Small halo on stronger beats.
      if (beat > .20) {
        ctx.strokeStyle =
          hexToRgba(
            p.colors[s.color],
            beat * .16
          );

        ctx.lineWidth =
          Math.max(
            1,
            base * .001
          );

        ctx.beginPath();
        ctx.arc(
          x,
          y,
          r * (1.22 + beat * .30),
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      // Small highlight.
      ctx.fillStyle =
        "rgba(255,255,255,.26)";

      ctx.beginPath();
      ctx.arc(
        x - r * .26,
        y - r * .26,
        Math.max(1, r * .14),
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Lightweight deterministic stars.
    for (let i = 0; i < 42; i++) {
      const sx =
        seeded(i * 17.13 + 2.7) * w;

      const sy =
        seeded(i * 9.71 + 8.4) * h;

      const twinkle =
        .30 +
        .70 *
        Math.abs(
          Math.sin(
            t * .001 +
            i * 1.9
          )
        );

      const sr =
        Math.max(
          1,
          base * .001
        );

      ctx.fillStyle =
        hexToRgba(
          p.colors[i % p.colors.length],
          .14 * twinkle
        );

      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        sr,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Occasional shooting star.
    const cycle = 11;
    const phase =
      (t * .001 / cycle) % 1;

    if (phase > .80 && phase < .93) {
      const q =
        (phase - .80) / .13;

      const sx =
        w * (.10 + q * .95);

      const sy =
        h * (.18 + q * .28);

      const tail =
        base * .065;

      const g =
        ctx.createLinearGradient(
          sx - tail,
          sy - tail * .35,
          sx,
          sy
        );

      g.addColorStop(
        0,
        "rgba(255,255,255,0)"
      );

      g.addColorStop(
        1,
        hexToRgba(
          p.colors[0],
          .72
        )
      );

      ctx.strokeStyle = g;
      ctx.lineWidth =
        Math.max(
          1,
          base * .002
        );

      ctx.beginPath();
      ctx.moveTo(
        sx - tail,
        sy - tail * .35
      );
      ctx.lineTo(
        sx,
        sy
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw(t, energy) {
    clearBackground(t, energy);

    if (visual.animation === "spectrum") {
      spectrum(energy, t);
    }

    if (visual.animation === "wave") {
      wave(energy, t);
    }

    if (visual.animation === "particles") {
      particles(energy, t);
    }

    if (visual.animation === "planets") {
      planets(energy, t);
    }

    textLayer();
  }

  function getEnergy() {
    if (!analyser) return .08;

    const data =
      new Uint8Array(
        analyser.frequencyBinCount
      );

    analyser.getByteFrequencyData(data);

    let sum = 0;

    for (const value of data) {
      sum += value;
    }

    return Math.min(
      1,
      (sum / data.length) /
      255 *
      2.1
    );
  }

  function getTrimStart() {
    return Math.max(0, Math.min(trimStart, buffer ? buffer.duration : 0));
  }

  function getTrimEnd() {
    const duration = buffer ? buffer.duration : 0;
    return Math.max(getTrimStart() + Math.min(0.1, duration), Math.min(trimEnd || duration, duration));
  }

  function getSelectedDuration() {
    if (!buffer) return 0;
    return Math.max(0, getTrimEnd() - getTrimStart());
  }

  function updateTrimUI() {
    if (!trimStartInput || !trimEndInput) return;

    // El recortador permanece visible desde el inicio.
    // Antes de cargar audio muestra un estado neutro y queda deshabilitado.
    if (!buffer) {
      trimStart = 0;
      trimEnd = 0;
      trimStartInput.max = 0;
      trimEndInput.max = 0;
      trimStartInput.value = 0;
      trimEndInput.value = 0;
      trimStartInput.disabled = true;
      trimEndInput.disabled = true;
      trimStartLabel.textContent = "0:00";
      trimEndLabel.textContent = "0:00";
      trimDurationLabel.textContent = "Sube un audio para ajustar el inicio y final.";
      if (trimRangeFill) {
        trimRangeFill.style.left = "0%";
        trimRangeFill.style.width = "0%";
      }
      return;
    }

    const duration = buffer.duration;
    trimStart = Math.max(0, Math.min(trimStart, Math.max(0, duration - 0.1)));
    trimEnd = Math.max(trimStart + Math.min(0.1, duration), Math.min(trimEnd || duration, duration));
    trimStartInput.max = duration;
    trimEndInput.max = duration;
    trimStartInput.disabled = false;
    trimEndInput.disabled = false;
    trimStartInput.value = trimStart;
    trimEndInput.value = trimEnd;
    trimStartLabel.textContent = fmt(trimStart);
    trimEndLabel.textContent = fmt(trimEnd);
    trimDurationLabel.textContent = `Duración seleccionada · ${fmt(getSelectedDuration())}`;
    const left = duration ? (trimStart / duration) * 100 : 0;
    const right = duration ? (trimEnd / duration) * 100 : 100;
    trimRangeFill.style.left = left + "%";
    trimRangeFill.style.width = Math.max(0, right - left) + "%";
  }

  function updatePreviewTime(reset = true) {
    const previewDuration = buffer ? Math.min(PREVIEW_SECONDS, getSelectedDuration()) : 0;
    if (previewTime && reset) previewTime.textContent = `0:00 / ${fmt(previewDuration)}`;
    if (progress && reset) progress.style.width = "0%";
  }

  function stop() {
    if (source) {
      try {
        source.stop();
      } catch {}

      try {
        source.disconnect();
      } catch {}
    }

    if (gain) {
      try {
        gain.disconnect();
      } catch {}
    }

    source = null;
    gain = null;
    playing = false;

    cancelAnimationFrame(animationId);

    if (progress) {
      progress.style.width = "0%";
    }

    if (previewTime) {
      const duration = buffer
        ? Math.min(PREVIEW_SECONDS, getSelectedDuration())
        : 0;

      previewTime.textContent =
        `0:00 / ${fmt(duration)}`;
    }

    if (playBtn) {
      playBtn.textContent = "▶";
    }
  }

  async function preview() {
    if (!buffer) return;

    stop();

    const previewDuration =
      Math.min(
        PREVIEW_SECONDS,
        getSelectedDuration()
      );

    if (previewDuration <= 0) return;

    const ac = audioEngine();

    await ac.resume();

    analyser =
      ac.createAnalyser();

    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = .72;

    source =
      ac.createBufferSource();

    source.buffer = buffer;

    gain =
      ac.createGain();

    gain.gain.value =
      muted ? 0 : 1;

    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(ac.destination);

    source.onended = () => {
      if (playing) {
        playing = false;

        if (progress) {
          progress.style.width = "100%";
        }

        if (previewTime) {
          previewTime.textContent =
            `${fmt(previewDuration)} / ${fmt(previewDuration)}`;
        }

        playBtn.textContent = "▶";
      }
    };

    source.start(0, getTrimStart(), previewDuration);

    playing = true;

    playBtn.textContent = "■";

    const start =
      performance.now();

    const loop = (now) => {
      if (!playing) return;

      const elapsed =
        (now - start) / 1000;

      if (elapsed >= previewDuration) {
        stop();
        draw(now, .08);

        if (previewTime) {
          previewTime.textContent =
            `${fmt(previewDuration)} / ${fmt(previewDuration)}`;
        }

        if (progress) {
          progress.style.width = "100%";
        }

        return;
      }

      draw(
        now,
        getEnergy()
      );

      if (progress) {
        progress.style.width =
          (
            elapsed /
            previewDuration *
            100
          ) + "%";
      }

      if (previewTime) {
        previewTime.textContent =
          `${fmt(elapsed)} / ${fmt(previewDuration)}`;
      }

      animationId =
        requestAnimationFrame(loop);
    };

    animationId =
      requestAnimationFrame(loop);
  }

  function download(blob) {
    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    const name =
      (
        title.value ||
        "music-visualizer"
      )
        .replace(/[^\w\- ]/g, "")
        .trim() ||
      "music-visualizer";

    a.href = url;
    a.download = `${name}.webm`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      60000
    );
  }

  const exportLockControls = [
    audioInput,
    artist,
    title,
    subtitle,
    animationSelect,
    paletteSelect,
    backgroundSelect,
    fontSelect,
    positionSelect,
    intensitySelect,
    formatSelect,
    playBtn,
    muteBtn,
    randomStyleButton,
    advancedToggle,
    trimStartInput,
    trimEndInput
  ];

  function setExportLock(locked) {
    exportLockControls.forEach((control) => {
      if (control) {
        control.disabled = locked;
      }
    });

    // EXPORT se mantiene clicable cuando está bloqueado para abrir el aviso de compra.
    exportBtn.disabled = locked || !buffer;
    exportBtn.textContent = hasAccess() ? "EXPORTAR VIDEO" : "🔒 EXPORTAR VIDEO";
  }


  // WebM generado por MediaRecorder puede no incluir una duración utilizable
  // para reproductores externos (por ejemplo VLC). Esta función añade/actualiza
  // el elemento EBML Duration dentro de Info sin cambiar el vídeo ni el audio.
  // Finaliza el WebM generado por MediaRecorder para que reproductores
  // externos puedan conocer la duración y hacer seek correctamente.
  //
  // MediaRecorder/Chrome puede generar Segment y Cluster con tamaño EBML
  // "unknown". VLC puede reproducirlos secuencialmente, pero sin Cues
  // (índice temporal) el seek puede fallar. Aquí no se recodifica nada:
  // solamente se corrige el contenedor y se añade un índice Cues.
  async function patchWebMDuration(blob, durationSeconds) {
    const input = await blob.arrayBuffer();
    const bytes = new Uint8Array(input);

    function readVint(pos, forSize = true) {
      if (pos >= bytes.length) return null;

      const first = bytes[pos];
      let mask = 0x80;
      let length = 1;

      while (length <= 8 && !(first & mask)) {
        mask >>= 1;
        length++;
      }

      if (length > 8 || pos + length > bytes.length) return null;

      let value = first & (mask - 1);

      for (let i = 1; i < length; i++) {
        value = value * 256 + bytes[pos + i];
      }

      if (forSize && value === Math.pow(2, 7 * length) - 1) {
        value = -1;
      }

      return { length, value };
    }

    function readId(pos) {
      if (pos >= bytes.length) return null;

      const first = bytes[pos];
      let mask = 0x80;
      let length = 1;

      while (length <= 4 && !(first & mask)) {
        mask >>= 1;
        length++;
      }

      if (length > 4 || pos + length > bytes.length) {
        return null;
      }

      let value = first;

      for (let i = 1; i < length; i++) {
        value = value * 256 + bytes[pos + i];
      }

      return { length, value };
    }

    function findElement(parentStart, parentEnd, wantedId) {
      let pos = parentStart;

      while (pos + 2 <= parentEnd) {
        const id = readId(pos);
        if (!id) break;

        const size = readVint(pos + id.length, true);
        if (!size) break;

        const dataStart =
          pos + id.length + size.length;

        // Unknown-sized elements cannot be walked by generic EBML parsing.
        // The special Cluster handling below deals with those separately.
        if (size.value < 0) break;

        const dataEnd =
          dataStart + size.value;

        if (
          dataEnd > parentEnd ||
          dataEnd < dataStart
        ) {
          break;
        }

        if (id.value === wantedId) {
          return {
            start: pos,
            idLength: id.length,
            sizeLength: size.length,
            dataStart,
            dataEnd,
            size: size.value
          };
        }

        pos = dataEnd;
      }

      return null;
    }

    function encodeVintSize(value, forcedLength = null) {
      const firstLength =
        forcedLength || 1;

      if (forcedLength) {
        const max =
          Math.pow(2, 7 * forcedLength) - 2;

        if (
          value < 0 ||
          value > max
        ) {
          return null;
        }

        const out =
          new Uint8Array(forcedLength);

        let v = value;

        for (
          let i = forcedLength - 1;
          i >= 0;
          i--
        ) {
          out[i] = v & 0xff;
          v = Math.floor(v / 256);
        }

        out[0] |=
          1 << (8 - forcedLength);

        return out;
      }

      for (
        let length = firstLength;
        length <= 8;
        length++
      ) {
        const max =
          Math.pow(2, 7 * length) - 2;

        if (value <= max) {
          return encodeVintSize(
            value,
            length
          );
        }
      }

      return null;
    }

    function uintBytes(value) {
      value = Math.max(
        0,
        Math.floor(value)
      );

      let length = 1;

      while (
        value >= Math.pow(256, length) &&
        length < 8
      ) {
        length++;
      }

      const out =
        new Uint8Array(length);

      let v = value;

      for (
        let i = length - 1;
        i >= 0;
        i--
      ) {
        out[i] = v & 0xff;
        v = Math.floor(v / 256);
      }

      return out;
    }

    function element(idBytes, payload) {
      const size =
        encodeVintSize(payload.length);

      if (!size) return null;

      const out =
        new Uint8Array(
          idBytes.length +
          size.length +
          payload.length
        );

      out.set(idBytes, 0);
      out.set(
        size,
        idBytes.length
      );
      out.set(
        payload,
        idBytes.length +
        size.length
      );

      return out;
    }

    function concatParts(parts) {
      const total =
        parts.reduce(
          (sum, part) =>
            sum + part.length,
          0
        );

      const out =
        new Uint8Array(total);

      let offset = 0;

      for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
      }

      return out;
    }

    // Locate Segment even when its size is unknown.
    let segment = null;
    let scan = 0;

    while (scan + 2 < bytes.length) {
      const id = readId(scan);

      if (!id) break;

      const size =
        readVint(
          scan + id.length,
          true
        );

      if (!size) break;

      const dataStart =
        scan +
        id.length +
        size.length;

      if (id.value === 0x18538067) {
        segment = {
          start: scan,
          idLength: id.length,
          sizeLength: size.length,
          dataStart,
          dataEnd:
            size.value < 0
              ? bytes.length
              : Math.min(
                  bytes.length,
                  dataStart + size.value
                ),
          size: size.value
        };

        break;
      }

      if (size.value < 0) break;

      const next =
        dataStart + size.value;

      if (
        next <= scan ||
        next > bytes.length
      ) {
        break;
      }

      scan = next;
    }

    if (!segment) {
      return new Blob(
        [input],
        {
          type:
            blob.type ||
            "video/webm"
        }
      );
    }

    const segmentEnd =
      segment.dataEnd;

    const info =
      findElement(
        segment.dataStart,
        segmentEnd,
        0x1549A966
      );

    if (!info) {
      return new Blob(
        [input],
        {
          type:
            blob.type ||
            "video/webm"
        }
      );
    }

    // TimecodeScale is normally 1,000,000 ns = 1 ms.
    const scaleElement =
      findElement(
        info.dataStart,
        info.dataEnd,
        0x2AD7B1
      );

    let timecodeScale = 1000000;

    if (scaleElement) {
      let scale = 0;

      for (
        let i =
          scaleElement.dataStart;
        i <
          scaleElement.dataEnd;
        i++
      ) {
        scale =
          scale * 256 +
          bytes[i];
      }

      if (scale > 0) {
        timecodeScale = scale;
      }
    }

    // Duration is a float64 in TimecodeScale units.
    const durationValue =
      durationSeconds *
      1000000000 /
      timecodeScale;

    const durationBytes =
      new Uint8Array(8);

    new DataView(
      durationBytes.buffer
    ).setFloat64(
      0,
      durationValue,
      false
    );

    const durationElement =
      element(
        new Uint8Array([
          0x44,
          0x89
        ]),
        durationBytes
      );

    if (!durationElement) {
      return new Blob(
        [input],
        {
          type:
            blob.type ||
            "video/webm"
        }
      );
    }

    const existingDuration =
      findElement(
        info.dataStart,
        info.dataEnd,
        0x4489
      );

    let newInfoPayload;

    if (
      existingDuration &&
      existingDuration.size === 8
    ) {
      newInfoPayload =
        concatParts([
          bytes.slice(
            info.dataStart,
            existingDuration.start
          ),
          durationElement,
          bytes.slice(
            existingDuration.dataEnd,
            info.dataEnd
          )
        ]);
    } else {
      newInfoPayload =
        concatParts([
          bytes.slice(
            info.dataStart,
            info.dataEnd
          ),
          durationElement
        ]);
    }

    const newInfoSize =
      encodeVintSize(
        newInfoPayload.length
      );

    if (!newInfoSize) {
      return new Blob(
        [input],
        {
          type:
            blob.type ||
            "video/webm"
        }
      );
    }

    const rebuiltInfo =
      concatParts([
        bytes.slice(
          info.start,
          info.start + info.idLength
        ),
        newInfoSize,
        newInfoPayload
      ]);

    const infoDelta =
      rebuiltInfo.length -
      (info.dataEnd - info.start);

    // MediaRecorder may use unknown-sized Clusters.
    // Find every Cluster ID and use its actual next Cluster boundary
    // as the payload boundary. We validate each candidate by requiring
    // a valid Cluster size VINT and a Cluster Timecode element.
    const clusterId =
      new Uint8Array([
        0x1f,
        0x43,
        0xb6,
        0x75
      ]);

    const clusterPositions = [];

    for (
      let pos =
        info.dataEnd;
      pos + 12 <= segmentEnd;
      pos++
    ) {
      if (
        bytes[pos] !== clusterId[0] ||
        bytes[pos + 1] !== clusterId[1] ||
        bytes[pos + 2] !== clusterId[2] ||
        bytes[pos + 3] !== clusterId[3]
      ) {
        continue;
      }

      const size =
        readVint(
          pos + 4,
          true
        );

      if (!size) continue;

      const clusterDataStart =
        pos + 4 + size.length;

      // A valid cluster should contain a Timecode shortly after
      // its header. Search only a small bounded area.
      let hasTimecode = false;

      const searchEnd =
        Math.min(
          segmentEnd,
          clusterDataStart + 256
        );

      let p =
        clusterDataStart;

      while (p + 2 <= searchEnd) {
        const childId =
          readId(p);

        if (!childId) break;

        const childSize =
          readVint(
            p + childId.length,
            true
          );

        if (!childSize) break;

        const childDataStart =
          p +
          childId.length +
          childSize.length;

        if (
          childSize.value < 0
        ) {
          break;
        }

        const childDataEnd =
          childDataStart +
          childSize.value;

        if (
          childDataEnd >
          searchEnd
        ) {
          break;
        }

        if (
          childId.value ===
          0xE7
        ) {
          hasTimecode = true;
          break;
        }

        p = childDataEnd;
      }

      if (hasTimecode) {
        clusterPositions.push({
          start: pos,
          sizeLength:
            size.length,
          size:
            size.value,
          dataStart:
            clusterDataStart
        });
      }
    }

    if (!clusterPositions.length) {
      // Duration is still useful even if a browser emitted an unusual
      // WebM layout. Return the corrected Info-only file.
      const before =
        bytes.slice(
          0,
          info.start
        );

      const after =
        bytes.slice(
          info.dataEnd
        );

      const result =
        concatParts([
          before,
          rebuiltInfo,
          after
        ]);

      return new Blob(
        [result],
        {
          type:
            blob.type ||
            "video/webm"
        }
      );
    }

    // Determine each Cluster's true end.
    const clusters = [];

    for (
      let i = 0;
      i < clusterPositions.length;
      i++
    ) {
      const cluster =
        clusterPositions[i];

      const next =
        i + 1 <
        clusterPositions.length
          ? clusterPositions[i + 1].start
          : segmentEnd;

      const payloadLength =
        next -
        cluster.dataStart;

      clusters.push({
        ...cluster,
        end: next,
        payloadLength
      });
    }

    // If Cues already exist after the last cluster, don't append a second
    // Cues element. The current MediaRecorder output normally has none.
    const cuesIdBytes =
      new Uint8Array([
        0x1c,
        0x53,
        0xbb,
        0x6b
      ]);

    let existingCues = false;

    for (
      let i =
        clusters[clusters.length - 1].end;
      i + 4 <= segmentEnd;
      i++
    ) {
      if (
        bytes[i] === cuesIdBytes[0] &&
        bytes[i + 1] === cuesIdBytes[1] &&
        bytes[i + 2] === cuesIdBytes[2] &&
        bytes[i + 3] === cuesIdBytes[3]
      ) {
        existingCues = true;
        break;
      }
    }

    const parts = [];

    // Everything before Info.
    parts.push(
      bytes.slice(
        0,
        info.start
      )
    );

    // Rebuilt Info.
    parts.push(
      rebuiltInfo
    );

    // Everything between Info and first Cluster.
    parts.push(
      bytes.slice(
        info.dataEnd,
        clusters[0].start
      )
    );

    // Rebuild every unknown-sized Cluster with a real size.
    for (const cluster of clusters) {
      const clusterPayload =
        bytes.slice(
          cluster.dataStart,
          cluster.end
        );

      const clusterSize =
        encodeVintSize(
          clusterPayload.length,
          cluster.sizeLength
        );

      if (!clusterSize) {
        return new Blob(
          [input],
          {
            type:
              blob.type ||
              "video/webm"
          }
        );
      }

      parts.push(
        clusterId
      );

      parts.push(
        clusterSize
      );

      parts.push(
        clusterPayload
      );
    }

    // Preserve any data after the final Cluster, except that we don't
    // duplicate an already-present Cues element.
    const lastClusterEnd =
      clusters[clusters.length - 1].end;

    if (
      lastClusterEnd <
      segmentEnd
    ) {
      parts.push(
        bytes.slice(
          lastClusterEnd,
          segmentEnd
        )
      );
    }

    // Build Cues for the video track (MediaRecorder's video track is track 1).
    // CueClusterPosition is relative to Segment data start.
    if (!existingCues) {
      const cuePoints = [];

      for (const cluster of clusters) {
        // Info grew by infoDelta, so every Cluster after Info moved by it.
        const clusterPosition =
          (
            cluster.start +
            infoDelta
          ) -
          segment.dataStart;

        // Read Cluster Timecode.
        const searchEnd =
          Math.min(
            cluster.end,
            cluster.dataStart + 512
          );

        let timecode = 0;
        let p =
          cluster.dataStart;

        while (
          p + 2 <= searchEnd
        ) {
          const childId =
            readId(p);

          if (!childId) break;

          const childSize =
            readVint(
              p + childId.length,
              true
            );

          if (!childSize) break;

          const childDataStart =
            p +
            childId.length +
            childSize.length;

          if (
            childSize.value < 0
          ) {
            break;
          }

          const childDataEnd =
            childDataStart +
            childSize.value;

          if (
            childDataEnd >
            searchEnd
          ) {
            break;
          }

          if (
            childId.value ===
            0xE7
          ) {
            for (
              let i =
                childDataStart;
              i <
                childDataEnd;
              i++
            ) {
              timecode =
                timecode * 256 +
                bytes[i];
            }

            break;
          }

          p = childDataEnd;
        }

        const cueTrack =
          element(
            new Uint8Array([
              0xF7
            ]),
            uintBytes(1)
          );

        const cueClusterPosition =
          element(
            new Uint8Array([
              0xF1
            ]),
            uintBytes(
              clusterPosition
            )
          );

        const cueTrackPositions =
          element(
            new Uint8Array([
              0xB7
            ]),
            concatParts([
              cueTrack,
              cueClusterPosition
            ])
          );

        const cuePoint =
          element(
            new Uint8Array([
              0xBB
            ]),
            concatParts([
              element(
                new Uint8Array([
                  0xB3
                ]),
                uintBytes(timecode)
              ),
              cueTrackPositions
            ])
          );

        cuePoints.push(
          cuePoint
        );
      }

      const cuesPayload =
        concatParts(
          cuePoints
        );

      const cues =
        element(
          cuesIdBytes,
          cuesPayload
        );

      if (cues) {
        parts.push(cues);
      }
    }

    // Rebuild Segment with a known size. Its original VINT was 8 bytes
    // in Chrome's MediaRecorder output; preserve that width.
    const segmentPayload =
      concatParts(
        parts.slice(1)
      );

    const segmentSize =
      encodeVintSize(
        segmentPayload.length,
        segment.sizeLength
      );

    if (!segmentSize) {
      return new Blob(
        [input],
        {
          type:
            blob.type ||
            "video/webm"
        }
      );
    }

    const rebuiltSegment =
      concatParts([
        bytes.slice(
          segment.start,
          segment.start +
          segment.idLength
        ),
        segmentSize,
        segmentPayload
      ]);

    const finalBytes =
      concatParts([
        bytes.slice(
          0,
          segment.start
        ),
        rebuiltSegment
      ]);

    return new Blob(
      [finalBytes],
      {
        type:
          blob.type ||
          "video/webm"
      }
    );
  }

  async function exportVideo() {
    // El editor es gratuito para probar, pero la exportación requiere acceso.
    // La comprobación vive dentro de la función para que el bloqueo no dependa
    // solamente del estado visual del botón.
    if (!hasAccess()) {
      openModal(payModal);
      return;
    }

    if (!buffer) return;

    if (
      !HTMLCanvasElement.prototype.captureStream ||
      !window.MediaRecorder
    ) {
      setStatus(
        "Usa Chrome o Edge para exportar WEBM."
      );

      return;
    }

    stop();

    setExportLock(true);

    exportBtn.classList.add(
      "exporting"
    );

    if (exportFill) {
      exportFill.style.width = "0%";
    }

    const format =
      formats[formatSelect.value];

    canvas.width = format.w;
    canvas.height = format.h;

    const previewWrap =
      document.querySelector(
        ".preview-wrap"
      );

    if (previewWrap) {
      previewWrap.style.aspectRatio =
        `${format.w} / ${format.h}`;
    }

    const AC =
      window.AudioContext ||
      window.webkitAudioContext;

    const ac = new AC();

    await ac.resume();

    const src =
      ac.createBufferSource();

    src.buffer = buffer;

    const analyserExport =
      ac.createAnalyser();

    analyserExport.fftSize = 1024;
    analyserExport.smoothingTimeConstant = .72;

    const audioDestination =
      ac.createMediaStreamDestination();

    src.connect(analyserExport);
    analyserExport.connect(
      audioDestination
    );

    const videoStream =
      canvas.captureStream(FPS);

    const stream =
      new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ]);

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];

    const mime =
      mimeTypes.find(
        (m) =>
          MediaRecorder.isTypeSupported(m)
      );

    if (!mime) {
      setStatus(
        "WEBM no está disponible en este navegador."
      );

      stream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      await ac.close();

      setExportLock(false);

      exportBtn.classList.remove(
        "exporting"
      );

      return;
    }

    const chunks = [];

    const recorder =
      new MediaRecorder(
        stream,
        {
          mimeType: mime,
          videoBitsPerSecond: 12000000,
          audioBitsPerSecond: 192000
        }
      );

    recorder.ondataavailable =
      (event) => {
        if (
          event.data &&
          event.data.size
        ) {
          chunks.push(event.data);
        }
      };

    const stopped =
      new Promise((resolve) =>
        recorder.addEventListener(
          "stop",
          resolve,
          { once: true }
        )
      );

    const trimOffset = getTrimStart();
    const duration = getSelectedDuration();

    if (duration <= 0) {
      setExportLock(false);
      exportBtn.classList.remove("exporting");
      setStatus("Selecciona un tramo de audio válido para exportar.");
      return;
    }

    let startedAt = 0;
    let renderId = 0;

    function renderExport(now) {
      if (!startedAt) {
        startedAt = now;
      }

      const elapsed =
        Math.min(
          duration,
          (now - startedAt) / 1000
        );

      const percent =
        Math.round(
          elapsed /
          duration *
          100
        );

      const data =
        new Uint8Array(
          analyserExport.frequencyBinCount
        );

      analyserExport.getByteFrequencyData(
        data
      );

      let sum = 0;

      for (const value of data) {
        sum += value;
      }

      const exportEnergy =
        Math.min(
          1,
          (sum / data.length) /
          255 *
          2.1
        );

      draw(
        now,
        exportEnergy
      );

      setStatus(
        `EXPORTANDO WEBM · ${percent}% · ${fmt(elapsed)} / ${fmt(duration)}`
      );

      if (elapsed < duration) {
        renderId =
          requestAnimationFrame(
            renderExport
          );
      }
    }

    setStatus(
      `EXPORTANDO WEBM · 0% · 0:00 / ${fmt(duration)}`
    );

    recorder.start(250);

    src.addEventListener(
      "ended",
      () => {
        cancelAnimationFrame(
          renderId
        );

        draw(
          performance.now(),
          .08
        );

        setStatus(
          `EXPORTANDO WEBM · 100% · ${fmt(duration)} / ${fmt(duration)}`
        );

        setTimeout(
          () => {
            if (
              recorder.state !==
              "inactive"
            ) {
              recorder.stop();
            }
          },
          350
        );
      },
      { once: true }
    );

    src.start(0, trimOffset, duration);

    renderId =
      requestAnimationFrame(
        renderExport
      );

    setTimeout(
      () => {
        if (
          recorder.state !==
          "inactive"
        ) {
          cancelAnimationFrame(
            renderId
          );

          recorder.stop();
        }
      },
      (duration + 3) * 1000
    );

    await stopped;

    stream
      .getTracks()
      .forEach((track) =>
        track.stop()
      );

    try {
      await ac.close();
    } catch {}

    let blob =
      new Blob(
        chunks,
        { type: mime }
      );

    // MediaRecorder often leaves WebM without usable duration metadata.
    // Patch only the container metadata so VLC and other players can display
    // the real selected duration and seek through the exported file.
    try {
      blob = await patchWebMDuration(blob, duration);
    } catch (metadataError) {
      console.warn("No se pudo ajustar la metadata de duración del WebM:", metadataError);
    }

    download(blob);

    setStatus(
      `LISTO · 100% · ${format.w}×${format.h} · WEBM · ${(blob.size / 1048576).toFixed(1)} MB`
    );

    setExportLock(false);

    exportBtn.classList.remove(
      "exporting"
    );

    fit();
  }

  // Estado inicial: el recortador ya está visible, pero deshabilitado.
  updateTrimUI();
  syncAccessUI();

  audioInput.addEventListener(
    "change",
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      try {
        const ac =
          audioEngine();

        await ac.resume();

        buffer =
          await ac.decodeAudioData(
            await file.arrayBuffer()
          );

        if (fileLabel) {
          fileLabel.textContent =
            file.name.length > 32
              ? file.name.slice(0, 29) + "…"
              : file.name;
        }

        if (empty) {
          empty.style.display = "none";
        }

        trimStart = 0;
        trimEnd = buffer.duration;
        updateTrimUI();

        playBtn.disabled = false;
        muteBtn.disabled = false;
        exportBtn.disabled = false;

        updatePreviewTime();

        setStatus(
          `Audio listo · ${fmt(buffer.duration)} · revisa el estilo y exporta.`
        );

        fit();

      } catch (error) {
        console.error(error);

        setStatus(
          "No pude leer ese archivo. Prueba con un MP3 o WAV estándar."
        );
      }
    }
  );

  [artist, title, subtitle].forEach(
    (input) =>
      input.addEventListener(
        "input",
        () =>
          draw(
            performance.now(),
            .08
          )
      )
  );

  function handleTrimChange(which, value) {
    if (!buffer) return;
    const duration = buffer.duration;
    const minGap = Math.min(0.1, duration);
    const v = Number(value);

    if (which === "start") {
      trimStart = Math.max(0, Math.min(v, trimEnd - minGap));
    } else {
      trimEnd = Math.min(duration, Math.max(v, trimStart + minGap));
    }

    updateTrimUI();
    stop();
    updatePreviewTime();
    draw(performance.now(), .08);
  }

  if (trimStartInput) {
    trimStartInput.addEventListener("input", (e) => handleTrimChange("start", e.target.value));
  }
  if (trimEndInput) {
    trimEndInput.addEventListener("input", (e) => handleTrimChange("end", e.target.value));
  }

  function bindAdvanced(select, key) {
    select.addEventListener(
      "change",
      () => {
        visual[key] =
          select.value;

        updateSummary();

        draw(
          performance.now(),
          .08
        );
      }
    );
  }

  bindAdvanced(
    animationSelect,
    "animation"
  );

  bindAdvanced(
    paletteSelect,
    "palette"
  );

  bindAdvanced(
    backgroundSelect,
    "background"
  );

  bindAdvanced(
    fontSelect,
    "font"
  );

  bindAdvanced(
    positionSelect,
    "position"
  );

  bindAdvanced(
    intensitySelect,
    "intensity"
  );

  randomStyleButton.addEventListener(
    "click",
    newRandomStyle
  );

  formatSelect.addEventListener(
    "change",
    fit
  );

  playBtn.addEventListener(
    "click",
    () =>
      playing
        ? stop()
        : preview()
  );

  exportBtn.addEventListener(
    "click",
    async () => {
      try {
        await exportVideo();
      } catch (error) {
        console.error(error);
        setExportLock(false);
        exportBtn.classList.remove("exporting");
        setStatus("No se pudo completar la exportación. Prueba nuevamente.");
      }
    }
  );

  muteBtn.addEventListener(
    "click",
    () => {
      muted = !muted;

      muteBtn.textContent =
        muted ? "○" : "◉";

      if (gain) {
        gain.gain.value =
          muted ? 0 : 1;
      }
    }
  );

  [buyButton, modalBuyButton, loginBuyButton].forEach((button) => {
    if (button) button.addEventListener("click", () => {
      closeModal(payModal);
      closeModal(loginModal);
      goToPurchase();
    });
  });

  if (loginButton) loginButton.addEventListener("click", () => {
    if (loginError) loginError.textContent = "";
    openModal(loginModal);
    setTimeout(() => passwordInput?.focus(), 0);
  });

  if (modalLoginButton) modalLoginButton.addEventListener("click", () => {
    closeModal(payModal);
    openModal(loginModal);
    setTimeout(() => passwordInput?.focus(), 0);
  });

  if (loginSubmit) loginSubmit.addEventListener("click", tryLogin);
  if (passwordInput) passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") tryLogin();
  });

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      closeModal(payModal);
      closeModal(loginModal);
    });
  });

  advancedToggle.addEventListener(
    "click",
    () => {
      const open =
        advancedToggle.getAttribute(
          "aria-expanded"
        ) === "true";

      advancedToggle.setAttribute(
        "aria-expanded",
        String(!open)
      );

      advancedPanel.hidden =
        open;
    }
  );

  window.addEventListener(
    "resize",
    () => {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          fit,
          120
        );
    }
  );

  // Siempre arrancamos con una combinación nueva,
  // nunca con un preset fijo.
  applyVisual(
    randomVisualStyle(),
    false
  );

  fit();

  draw(
    performance.now(),
    .08
  );
})();
