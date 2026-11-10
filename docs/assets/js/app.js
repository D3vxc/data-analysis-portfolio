/* Dev Mistri portfolio. The page behaves like an edit you scrub by scrolling:
   - the headline is a halftone printed with the credit model's 6,000 test customers (canvas),
     and those same dots fly into the chart and get ranked, boxed and split by age;
   - banner lines are fitted to the full width with the display font's width axis (kinetic type);
   - the page is sliced open into a film strip of the other six cases.
   Libraries: GSAP + ScrollTrigger (scroll timing), Lenis (smooth scroll), D3 (charts). No images. */
(function () {
  "use strict";
  const S = window.SITE_DATA || {};
  const T = window.CREDIT_TEST;
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const pct = (v, d = 1) => (100 * v).toFixed(d) + "%";
  const fmtInt = (v) => Math.round(v).toLocaleString("en-GB");
  const c01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (p, a, b) => c01((p - a) / (b - a));
  const smooth = (v) => v * v * (3 - 2 * v);
  const outCubic = (v) => 1 - Math.pow(1 - v, 3);
  const year = $("#year"); if (year) year.textContent = new Date().getFullYear();

  /* ---------- A note for anyone who opens the developer console ---------- */
  console.log("%cHold on.", "font: 700 28px system-ui, sans-serif; color: #ff5a1f;");
  console.log("%cThis site and its analyses are © Dev Mistri. Please don't copy the design, code or write-ups into your own portfolio or application.",
    "font: 15px system-ui, sans-serif; line-height: 1.5;");
  console.log("%cIf you're here because you're hiring: hello! The notebooks are linked from each project, and I'd be glad to talk you through them: devmistri.co.uk/#contact",
    "font: 15px system-ui, sans-serif; line-height: 1.5; color: #1e3bff;");

  if (hasGsap) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, instant) => {
    if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: !!instant, force: true }); } // resize first: the pinned sections have just changed the page height
    else window.scrollTo({ top: y, behavior: instant || reduce ? "auto" : "smooth" });
  };

  /* A short, stepped camera shake for impact moments. */
  function hit(el, k = 1) {
    if (!motion || !el) return;
    gsap.fromTo(el, { x: 0, y: 0 }, { keyframes: { x: [0, -5 * k, 4 * k, -2 * k, 0], y: [0, 3 * k, -2 * k, 1 * k, 0], ease: "sine.inOut" }, duration: 0.5, ease: "none", overwrite: true });
  }

  /* ---------- Kinetic banners: fit every line to the full width ---------- */
  function fitLine(line, W, cap) {
    line.style.fontSize = cap + "px"; line.style.fontStretch = "100%";
    let w = line.offsetWidth; if (!w) return; // offsetWidth ignores the transform the line may be carrying
    let wd = Math.max(50, Math.min(150, (100 * W) / w));
    line.style.fontStretch = wd + "%"; w = line.offsetWidth;
    wd = Math.max(50, Math.min(150, (wd * W) / w));
    line.style.fontStretch = wd + "%"; w = line.offsetWidth;
    line.style.fontSize = Math.max(cap * 0.45, Math.min(cap * 1.4, (cap * W) / w)) + "px";
    line.dataset.wd = wd.toFixed(1);
  }
  const innerW = (el) => { const cs = getComputedStyle(el); return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
  function fitBanners() {
    $$("[data-banner]").forEach((b) => {
      const W = innerW(b); if (W <= 0) return;
      const cap = Math.min(window.innerHeight * (+b.dataset.cap || 0.2), W * 0.34);
      $$(".bl", b).forEach((l) => fitLine(l, W, cap));
    });
    const ct = $(".cut-title");
    if (ct) { const W = innerW(ct); if (W > 0) { const cap = Math.min(window.innerHeight * 0.3, W * 0.36); $$("span", ct).forEach((l) => fitLine(l, W, cap)); } }
  }
  /* The line is squeezed sideways and released. A transform only, so the browser never re-lays out text while you scroll. */
  function setStretch(line, p) {
    line.style.transform = `scaleX(${(0.5 + 0.5 * p).toFixed(4)})`;
  }

  /* ---------- The dots: 6,000 real test customers ---------- */
  const credit = S.credit || {};
  const Dots = (function () {
    let canvas = $("#dots");
    const title = $("#hero-title"), frame = $("#dots-frame"), readout = $("#dots-readout"), visual = $(".story-visual");
    if (!T || !canvas || !title || !frame || !window.d3) return null;
    // The dots are drawn by the graphics card (WebGL) where possible, so 6,000 moving dots cost almost nothing per frame. A 2D canvas is the fallback.
    let gl = null, ctx = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (_) {}
    if (!gl) ctx = canvas.getContext("2d");
    const n = T.score.length, COLS = 100, TAU = Math.PI * 2;
    const idx = d3.range(n);
    const ranked = idx.slice().sort((a, b) => T.score[b] - T.score[a]);
    const k = Math.round(n * 0.2);
    const flagged = new Uint8Array(n); ranked.slice(0, k).forEach((i) => (flagged[i] = 1));
    const ys = Uint8Array.from(T.y, Number);
    const defaults = d3.sum(ys), caught = d3.sum(ranked.slice(0, k), (i) => ys[i]);
    const groups = T.ages.map((label, g) => {
      const members = idx.filter((i) => +T.age[i] === g);
      return { label, members, flagRate: d3.mean(members, (i) => flagged[i]) };
    });
    const rates = groups.map((g) => g.flagRate);
    const stats = { n, defaults, base: defaults / n, capture: caught / defaults, precision: caught / k, ageRatio: d3.min(rates) / d3.max(rates) };

    const rng = d3.randomLcg(7);
    const shuffled = d3.shuffler(rng)(d3.range(n));
    const slotA = new Uint16Array(n), slotB = new Uint16Array(n);
    shuffled.forEach((i, s) => (slotA[i] = s)); ranked.forEach((i, s) => (slotB[i] = s));
    const posD = new Float32Array(n * 2), namePos = new Float32Array(n * 2);
    const delay = new Float32Array(n), jit = new Float32Array(n * 2), scat = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { delay[i] = rng(); jit[2 * i] = rng() * 2 - 1; jit[2 * i + 1] = rng() * 2 - 1; scat[2 * i] = rng() * 1.3 - 0.15; scat[2 * i + 1] = rng() * 1.3 - 0.15; }
    const bucket = [[], [], [], []]; // paid, paid + flagged, defaulted, defaulted + flagged
    for (let i = 0; i < n; i++) bucket[(ys[i] ? 2 : 0) + (flagged[i] ? 1 : 0)].push(i);

    const st = { intro: 1, fly: 0, t: 0, boil: 0, mx: -9999, my: -9999, tx: -9999, ty: -9999 };
    let dpr = 1, nameDirty = true, frameDirty = true;
    // The box around the riskiest 20% and the age-band labels are ordinary elements inside the chart frame.
    const box = document.createElement("b"); box.className = "dots-box"; frame.appendChild(box);
    const bands = groups.map((g) => { const el = document.createElement("span"); el.className = "dots-band"; el.textContent = `${g.label}: ${pct(g.flagRate)} flagged`; frame.appendChild(el); return el; });
    let VW = 0, VH = 0, nameD = 4, nameW = 0, nameReady = false, cell = 0, rowsTotal = 0, bandTops = [], offAB = 0, dirty = true, orange = "#ff5a1f", lastSay = "";

    /* Headline: two lines, each scaled to the full width; the width keywords are chosen so the block has the right height. */
    const KW = ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded"];
    const LINES = ["DATA", "ANALYST"];
    const mcv = document.createElement("canvas"), mctx = mcv.getContext("2d", { willReadFrequently: true });
    const setFont = (c, size, kw) => { c.font = `900 ${kw} ${size}px Anybody, "Arial Black", sans-serif`; if ("fontStretch" in c) c.fontStretch = kw; };
    // Not every browser lets a canvas choose a font width. Where it can't, the same shapes are made by scaling the normal width sideways.
    const SQUEEZE = [0.56, 0.66, 0.76, 0.88, 1, 1.14, 1.3, 1.5];
    const measure = (txt, kw, sx) => { setFont(mctx, 200, kw); const m = mctx.measureText(txt);
      return { kw, sx, w: ((m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 200) * sx, l: (m.actualBoundingBoxLeft / 200) * sx, a: m.actualBoundingBoxAscent / 200, d: m.actualBoundingBoxDescent / 200 }; };
    function layoutName() {
      const W = title.clientWidth; if (!W) return;
      nameW = W;
      const target = Math.max(150, Math.min(560, window.innerHeight * (W < 620 ? 0.38 : 0.47)));
      const widthAxis = Math.abs(measure("DATA", KW[0], 1).w - measure("DATA", KW[KW.length - 1], 1).w) > 0.05;
      const meas = LINES.map((txt) => (widthAxis ? KW.map((kw) => measure(txt, kw, 1)) : SQUEEZE.map((sx) => measure(txt, "normal", sx))));
      let best = null;
      meas[0].forEach((a) => meas[1].forEach((b) => {
        const s1 = W / a.w, s2 = W / b.w, h = s1 * (a.a + a.d) + s2 * (b.a + b.d), gap = h * 0.055;
        const score = Math.abs(h + gap - target) + Math.max(0, Math.max(s1 / s2, s2 / s1) - 1.9) * 80;
        if (!best || score < best.score) best = { score, a, b, s1, s2, gap, h: h + gap };
      }));
      const H = Math.ceil(best.h), ms = W < 700 ? 2 : 1;
      mcv.width = Math.ceil(W * ms); mcv.height = Math.ceil(H * ms);
      mctx.setTransform(ms, 0, 0, ms, 0, 0); mctx.clearRect(0, 0, W, H); mctx.fillStyle = "#000"; mctx.textBaseline = "alphabetic";
      let y = 0;
      [[LINES[0], best.a, best.s1], [LINES[1], best.b, best.s2]].forEach(([txt, m, s], li) => {
        setFont(mctx, s, m.kw); y += m.a * s;
        mctx.save(); mctx.scale(m.sx, 1); mctx.fillText(txt, (m.l * s) / m.sx, y); mctx.restore();
        y += m.d * s + (li === 0 ? best.gap : 0);
      });
      const img = mctx.getImageData(0, 0, mcv.width, mcv.height).data, mw = mcv.width, mh = mcv.height;
      const inked = (x, yy) => { const px = Math.round(x * ms), py = Math.round(yy * ms); return px >= 0 && py >= 0 && px < mw && py < mh && img[(py * mw + px) * 4 + 3] > 110; };
      const collect = (s, out) => { // hexagonal halftone screen
        let c = 0; const sy = s * 0.866;
        for (let r = 0, yy = sy / 2; yy < H; r++, yy += sy) for (let x = r % 2 ? s : s / 2; x < W; x += s) if (inked(x, yy)) { if (out) out.push(x, yy); c++; }
        return c;
      };
      let lo = 0.8, hi = 40;
      for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (collect(mid) >= n) lo = mid; else hi = mid; }
      const pts = []; collect(lo, pts);
      const m = pts.length / 2; if (!m) return;
      const order = d3.shuffler(d3.randomLcg(3))(d3.range(m));
      for (let i = 0; i < n; i++) { const j = order[i % m]; namePos[2 * i] = pts[2 * j]; namePos[2 * i + 1] = pts[2 * j + 1]; }
      nameD = lo * 0.8; nameDirty = true;
      root.style.setProperty("--name-h", H + "px");
      root.classList.add("dots-on");
      nameReady = true;
    }

    function layoutFrame() {
      const W = frame.clientWidth; if (!W) return;
      cell = W / COLS;
      const gapRows = Math.ceil(22 / cell) + 1;
      const bandRows = groups.map((g) => Math.ceil(g.members.length / COLS));
      rowsTotal = Math.max(Math.ceil(n / COLS), d3.sum(bandRows) + gapRows * groups.length);
      offAB = Math.floor((rowsTotal - Math.ceil(n / COLS)) / 2);
      bandTops = [];
      let row = 0;
      groups.forEach((g, gi) => {
        row += gapRows; bandTops.push(row);
        g.members.slice().sort((a, b) => T.score[b] - T.score[a]).forEach((i, s) => { posD[2 * i] = s % COLS; posD[2 * i + 1] = row + Math.floor(s / COLS); });
        row += bandRows[gi];
      });
      root.style.setProperty("--frame-h", (rowsTotal * cell).toFixed(1) + "px");
      frameDirty = true;
      const rows = Math.ceil(k / COLS), pad = 4;
      box.style.cssText = `left:${-pad}px;top:${(offAB * cell - pad).toFixed(1)}px;width:${(W + pad * 2 - cell * 0.26).toFixed(1)}px;height:${(rows * cell + pad * 2 - cell * 0.26).toFixed(1)}px;opacity:${box.style.opacity || 0}`;
      bands.forEach((el, gi) => { el.style.top = (bandTops[gi] * cell - 6).toFixed(1) + "px"; });
      frame.classList.toggle("is-small", W < 480);
    }

    function size() {
      VW = window.innerWidth; VH = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, VW < 900 ? 1.5 : 2); // phones: fewer pixels to fill, and the dots' soft edges hide the difference
      canvas.style.width = VW + "px"; canvas.style.height = VH + "px";
      canvas.width = Math.round(VW * dpr); canvas.height = Math.round(VH * dpr);
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height); else ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      orange = css("--orange") || orange;
    }
    function layout(force) {
      size();
      if (force || title.clientWidth !== nameW) layoutName();
      layoutFrame();
      dirty = true;
    }

    /* WebGL: each dot's whole journey (headline, shuffled grid, ranked grid, age bands) is worked out in the vertex shader. */
    const GLR = gl ? (function () {
      const order = bucket[0].concat(bucket[1], bucket[2], bucket[3]); // paid first, defaulters drawn on top
      const VS = `precision highp float;
        attribute vec2 aName, aScat, aJit, aA, aB, aD, aMisc;
        uniform vec2 uView, uHero, uFrame, uMouse;
        uniform float uDpr, uCell, uOff, uFly, uIntro, uAb, uHi, uCd, uNameD, uGs, uAmp, uRepel;
        uniform vec3 uOrange;
        varying vec4 vCol; varying float vSq, vHalf, vQ;
        float sm(float v) { v = clamp(v, 0.0, 1.0); return v * v * (3.0 - 2.0 * v); }
        void main() {
          float delay = aMisc.x; float isDef = step(1.5, aMisc.y); float isFlag = mod(aMisc.y, 2.0);
          vec2 p = uHero + aName + aJit * uAmp;
          if (uIntro < 1.0) { float q = clamp(uIntro * 1.7 - delay * 0.7, 0.0, 1.0); q = 1.0 - pow(1.0 - q, 3.0); p = mix(aScat * uView, p, q); }
          if (uRepel > 0.5) { vec2 d = p - uMouse; float L = length(d); if (L < 120.0 && L > 0.1) { float f = 1.0 - L / 120.0; p += d / L * f * f * 38.0; } }
          float size = uNameD; vSq = 0.0;
          if (uFly > 0.0) {
            float pr = uFly >= 1.0 ? 1.0 : sm((uFly - delay * 0.5) / 0.5);
            vec2 g = mix(aA, aB, uAb); g.y += uOff; g = mix(g, aD, uCd);
            p = mix(p, uFrame + g * uCell + uGs * 0.5, pr);
            size = mix(uNameD, uGs, pr); vSq = step(0.6, pr);
          }
          if (size < 2.6) vSq = 1.0;
          float aGrid = (isDef > 0.5 ? 1.0 : 0.5) * (isFlag > 0.5 ? 1.0 : 1.0 - 0.7 * uHi);
          float alpha = 1.0 + (aGrid - 1.0) * clamp(uFly * 1.4, 0.0, 1.0);
          vCol = vec4((isDef > 0.5 ? uOrange : vec3(0.0)) * alpha, alpha);
          gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
          float px = max(1.0, size * uDpr); vHalf = px * 0.5; vQ = px + 2.0; // one spare pixel all round for a soft edge
          gl_PointSize = vQ;
        }`;
      const FS = `precision mediump float;
        varying vec4 vCol; varying float vSq, vHalf, vQ;
        void main() {
          vec2 d = abs(gl_PointCoord - 0.5) * vQ; // distance from the dot's centre, in device pixels
          float a = vSq < 0.5 ? clamp(vHalf - length(d) + 0.5, 0.0, 1.0) : clamp(vHalf - d.x + 0.5, 0.0, 1.0) * clamp(vHalf - d.y + 0.5, 0.0, 1.0);
          if (a <= 0.0) discard;
          gl_FragColor = vCol * a;
        }`;
      const loc = {}, tmp = new Float32Array(n * 2);
      let bName, bD;
      const shader = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
      function init() {
        const prog = gl.createProgram();
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        ["uView", "uHero", "uFrame", "uMouse", "uDpr", "uCell", "uOff", "uFly", "uIntro", "uAb", "uHi", "uCd", "uNameD", "uGs", "uAmp", "uRepel", "uOrange"].forEach((u) => (loc[u] = gl.getUniformLocation(prog, u)));
        const at = (name, stride, off) => { const l = gl.getAttribLocation(prog, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, stride, off); };
        // Per-dot data that never changes: scatter, jitter, shuffled slot, ranked slot, (delay, group)
        const S = new Float32Array(n * 10);
        order.forEach((i, v) => { const o = v * 10, a = slotA[i], b = slotB[i];
          S[o] = scat[2 * i]; S[o + 1] = scat[2 * i + 1]; S[o + 2] = jit[2 * i]; S[o + 3] = jit[2 * i + 1];
          S[o + 4] = a % COLS; S[o + 5] = (a / COLS) | 0; S[o + 6] = b % COLS; S[o + 7] = (b / COLS) | 0;
          S[o + 8] = delay[i]; S[o + 9] = (ys[i] ? 2 : 0) + (flagged[i] ? 1 : 0); });
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, S, gl.STATIC_DRAW);
        at("aScat", 40, 0); at("aJit", 40, 8); at("aA", 40, 16); at("aB", 40, 24); at("aMisc", 40, 32);
        bName = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bName); gl.bufferData(gl.ARRAY_BUFFER, n * 8, gl.DYNAMIC_DRAW); at("aName", 0, 0);
        bD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bD); gl.bufferData(gl.ARRAY_BUFFER, n * 8, gl.DYNAMIC_DRAW); at("aD", 0, 0);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
        gl.viewport(0, 0, canvas.width, canvas.height);
        nameDirty = frameDirty = true;
      }
      const upload = (buf, src) => { order.forEach((i, v) => { tmp[2 * v] = src[2 * i]; tmp[2 * v + 1] = src[2 * i + 1]; }); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, tmp); };
      function pass(hr, fr, fly, intro, t) {
        if (nameDirty) { upload(bName, namePos); nameDirty = false; }
        if (frameDirty) { upload(bD, posD); frameDirty = false; }
        const c = d3.color(orange) || { r: 255, g: 90, b: 31 };
        gl.uniform2f(loc.uView, VW, VH); gl.uniform2f(loc.uHero, hr.left, hr.top); gl.uniform2f(loc.uFrame, fr.left, fr.top);
        gl.uniform2f(loc.uMouse, st.mx, st.my); gl.uniform1f(loc.uRepel, fly <= 0 && intro >= 1 && st.mx > -999 ? 1 : 0);
        gl.uniform1f(loc.uDpr, dpr); gl.uniform1f(loc.uCell, cell); gl.uniform1f(loc.uOff, offAB); gl.uniform1f(loc.uFly, fly); gl.uniform1f(loc.uIntro, intro);
        gl.uniform1f(loc.uAb, smooth(seg(t, 0.3, 0.8))); gl.uniform1f(loc.uHi, smooth(seg(t, 1.2, 1.6))); gl.uniform1f(loc.uCd, smooth(seg(t, 2.15, 2.65)));
        gl.uniform1f(loc.uNameD, nameD); gl.uniform1f(loc.uGs, Math.max(1.6, cell * 0.74)); gl.uniform1f(loc.uAmp, Math.min(1.1, nameD * 0.16));
        gl.uniform3f(loc.uOrange, c.r / 255, c.g / 255, c.b / 255);
        gl.drawArrays(gl.POINTS, 0, n);
      }
      try { init(); } catch (e) { console.warn("WebGL dots unavailable, falling back to a 2D canvas.", e); return null; }
      canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
      canvas.addEventListener("webglcontextrestored", () => { try { init(); lastSig = ""; dirty = true; } catch (_) {} });
      return { pass };
    })() : null;
    if (gl && !GLR) { // the context was created but could not be used: swap in a fresh canvas for 2D drawing
      const fresh = canvas.cloneNode(false); canvas.replaceWith(fresh); canvas = fresh; gl = null; ctx = canvas.getContext("2d");
    }
    const clear = () => { if (gl) gl.clear(gl.COLOR_BUFFER_BIT); else ctx.clearRect(0, 0, VW, VH); };

    /* 2D fallback: one pass draws every dot, lerping from the headline to its place in the chart. */
    function pass2d(hr, fr, fly, intro, t) {
      const ab = smooth(seg(t, 0.3, 0.8)), hi = smooth(seg(t, 1.2, 1.6)), cd = smooth(seg(t, 2.15, 2.65));
      const gs = Math.max(1.6, cell * 0.74), kb = st.boil, amp = Math.min(1.1, nameD * 0.16);
      const repel = fly <= 0 && intro >= 1 && st.mx > -999, R = 120, R2 = R * R;
      for (let g = 0; g < 4; g++) {
        const isDef = g >= 2, isFlag = g & 1;
        const aGrid = (isDef ? 1 : 0.5) * (isFlag ? 1 : 1 - 0.7 * hi);
        ctx.globalAlpha = 1 + (aGrid - 1) * c01(fly * 1.4);
        ctx.fillStyle = isDef ? orange : "#000";
        ctx.beginPath();
        const list = bucket[g];
        for (let q = 0; q < list.length; q++) {
          const i = list[q], j = (i + kb * 977) % n;
          let x = hr.left + namePos[2 * i] + jit[2 * j] * amp, y = hr.top + namePos[2 * i + 1] + jit[2 * j + 1] * amp;
          if (intro < 1) { const p = outCubic(c01(intro * 1.7 - delay[i] * 0.7)); const sx = scat[2 * i] * VW, sy = scat[2 * i + 1] * VH; x = sx + (x - sx) * p; y = sy + (y - sy) * p; }
          if (repel) { const dx = x - st.mx, dy = y - st.my, d2 = dx * dx + dy * dy; if (d2 < R2 && d2 > 0.01) { const d = Math.sqrt(d2), f = 1 - d / R; x += (dx / d) * f * f * 38; y += (dy / d) * f * f * 38; } }
          let sz = nameD, square = false;
          if (fly > 0) {
            const p = fly >= 1 ? 1 : smooth(c01((fly - delay[i] * 0.5) / 0.5));
            const a = slotA[i];
            let gx = a % COLS, gy = offAB + ((a / COLS) | 0);
            if (ab > 0) { const b = slotB[i]; gx += ((b % COLS) - gx) * ab; gy += (offAB + ((b / COLS) | 0) - gy) * ab; }
            if (cd > 0) { gx += (posD[2 * i] - gx) * cd; gy += (posD[2 * i + 1] - gy) * cd; }
            x += (fr.left + gx * cell + gs / 2 - x) * p; y += (fr.top + gy * cell + gs / 2 - y) * p;
            sz += (gs - sz) * p; square = p > 0.6;
          }
          if (y < -8 || y > VH + 8 || x < -8 || x > VW + 8) continue;
          if (square || sz < 2.6) ctx.rect(x - sz / 2, y - sz / 2, sz, sz);
          else { ctx.moveTo(x + sz / 2, y); ctx.arc(x, y, sz / 2, 0, TAU); }
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const pass = GLR ? GLR.pass : pass2d;
    let lastBox = -1, lastBand = -1;
    function overlays(t) {
      const hi = smooth(seg(t, 1.2, 1.6)), cd = smooth(seg(t, 2.15, 2.65));
      const a = +(hi * (1 - cd)).toFixed(2), c = +cd.toFixed(2);
      if (a !== lastBox) { lastBox = a; box.style.opacity = a; }
      if (c !== lastBand) { lastBand = c; bands.forEach((el) => { el.style.opacity = c; }); }
    }
    function say() {
      if (!readout) return;
      const t = motion ? st.t : 2;
      const text = motion && st.fly < 1 ? "Printing the test set" : t < 0.55 ? `${fmtInt(defaults)} of ${fmtInt(n)} defaulted` : t < 1.4 ? "Highest score at the top" : t < 2.3 ? `Top 20% holds ${pct(stats.capture, 0)} of defaults` : `Flag-rate ratio by age: ${stats.ageRatio.toFixed(2)}`;
      if (text !== lastSay) { readout.textContent = text; lastSay = text; }
    }
    let shownNow = true, lastSig = "";
    const show = (on) => { if (on !== shownNow) { shownNow = on; canvas.style.visibility = on ? "visible" : "hidden"; if (!on) { clear(); lastSig = ""; } } };
    const r1 = (v) => Math.round(v * 2) / 2;
    function draw() {
      if (!nameReady || !cell) return show(false);
      const hr = title.getBoundingClientRect(), fr = frame.getBoundingClientRect();
      const heroOn = hr.bottom > -80 && hr.top < VH + 80, frameOn = fr.bottom > -80 && fr.top < VH + 80;
      const fly = motion ? st.fly : 0;
      // Nothing of the dots is on screen: hide the canvas so the rest of the page scrolls without it.
      if (motion ? (fly <= 0 && !heroOn) || (fly >= 1 && !frameOn) : !heroOn && !frameOn) return show(false);
      // Skip the frame if it would look exactly like the last one (for example while a step's text scrolls past the pinned chart).
      const sig = motion
        ? (fly >= 1 ? `f|${r1(fr.left)}|${r1(fr.top)}|${st.t.toFixed(3)}` : `h|${r1(hr.left)}|${r1(hr.top)}|${fly > 0 ? r1(fr.left) + "|" + r1(fr.top) : ""}|${fly.toFixed(4)}|${st.intro.toFixed(3)}|${st.t.toFixed(3)}|${st.mx > -999 ? r1(st.mx) + "|" + r1(st.my) : ""}`)
        : `s|${r1(hr.top)}|${r1(fr.top)}|${r1(fr.left)}`;
      if (sig === lastSig) return;
      lastSig = sig; show(true);
      clear();
      if (!motion) { // static: the headline and the ranked chart are two separate prints
        if (heroOn) pass(hr, fr, 0, 1, 0);
        if (frameOn) pass(hr, fr, 1, 1, 2);
        overlays(2);
        return;
      }
      pass(hr, fr, fly, st.intro, st.t);
      overlays(fly >= 1 ? st.t : 0);
    }
    function tick() {
      if (st.tx > -999) {
        if (st.mx < -999) { st.mx = st.tx; st.my = st.ty; dirty = true; }
        const dx = st.tx - st.mx, dy = st.ty - st.my;
        if (Math.abs(dx) + Math.abs(dy) > 0.4) { st.mx += dx * 0.2; st.my += dy * 0.2; dirty = true; }
      }
      if (dirty) { dirty = false; draw(); }
    }
    const request = () => { dirty = true; };

    size(); layoutFrame(); say();
    window.addEventListener("scroll", request, { passive: true });
    if (hasGsap) gsap.ticker.add(tick); else (function loop() { tick(); requestAnimationFrame(loop); })();

    if (motion) {
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        window.addEventListener("pointermove", (e) => { st.tx = e.clientX; st.ty = e.clientY; }, { passive: true });
        document.addEventListener("pointerleave", () => { st.tx = st.mx = -9999; dirty = true; });
      }
      const stickyTop = () => (parseFloat(getComputedStyle(visual).top) || 0) + (parseFloat(getComputedStyle(visual).paddingTop) || 0);
      ScrollTrigger.create({ trigger: frame, start: "top bottom", end: () => "top " + Math.round(stickyTop()) + "px", scrub: true, invalidateOnRefresh: true,
        onUpdate: (s) => { st.fly = s.progress; dirty = true; say(); } });
      ScrollTrigger.create({ trigger: ".steps", start: () => (window.innerWidth <= 900 ? "top top" : "top 55%"), end: () => (window.innerWidth <= 900 ? "bottom bottom" : "bottom 75%"), scrub: 0.7, invalidateOnRefresh: true,
        // Timed so each arrangement is settled while its step's text is on screen (steps are centred on wide screens, bottom-aligned on narrow ones).
        onUpdate: (s) => { st.t = window.innerWidth <= 900 ? 2.493 * s.progress + 0.225 : Math.max(0, 3.285 * s.progress - 0.412); dirty = true; say(); } });
      $$(".step").forEach((step) => ScrollTrigger.create({ trigger: step, start: "top 60%", end: "bottom 40%", toggleClass: { targets: step, className: "is-active" } }));
    } else {
      $$(".step").forEach((s) => s.classList.add("is-active"));
    }

    return {
      stats, layout, request,
      intro(duration) { if (!motion) return; st.intro = 0; dirty = true; gsap.to(st, { intro: 1, duration, ease: "none", onUpdate: request }); },
    };
  })();

  /* Numbers in the copy come from the same data the dots are drawn from. */
  if (Dots) {
    const st = Dots.stats, xgb = credit.models && credit.models.XGBoost;
    const bind = {
      base: pct(st.base),
      capture: pct(xgb ? xgb.top20_capture : st.capture, 0),
      precision: pct(xgb ? xgb.top20_precision : st.precision, 1),
      lift: ((xgb ? xgb.top20_precision : st.precision) / st.base).toFixed(1),
      ageRatio: st.ageRatio.toFixed(2),
      shap3: credit.shap_top3_share_pct ? Math.round(credit.shap_top3_share_pct) + "%" : null,
    };
    $$("[data-bind]").forEach((el) => { const v = bind[el.dataset.bind]; if (v) el.textContent = v; });
  }

  /* ---------- Chart helpers (D3) ---------- */
  function svgFor(el, w, h) {
    el.innerHTML = "";
    return d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img");
  }
  function onEnter(el, fn) {
    if (!motion) return;
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: fn });
  }
  function playBars(sel, horizontal) {
    sel.each(function (d, i) {
      const b = d3.select(this);
      if (horizontal) { const w = +b.attr("data-w"); b.attr("width", 0).transition().duration(950).delay(i * 80).ease(d3.easeCubicOut).attr("width", w); }
      else { const h = +b.attr("data-h"), y = +b.attr("data-y"); b.attr("height", 0).attr("y", y + h).transition().duration(950).delay(i * 55).ease(d3.easeCubicOut).attr("height", h).attr("y", y); }
    });
  }
  function playLine(path) {
    const L = path.node().getTotalLength();
    path.attr("stroke-dasharray", L).attr("stroke-dashoffset", L).transition().duration(1300).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0).on("end", () => path.attr("stroke-dasharray", null));
  }
  function hbars(el, rows, opt) {
    const narrow = el.clientWidth > 0 && el.clientWidth < 430; // phones: draw at close to 1:1 so the labels stay readable
    const w = narrow ? Math.min(opt.w || 440, 400) : opt.w || 440, rowH = opt.rowH || 32, labelW = narrow ? Math.min(opt.labelW || 150, 190) : opt.labelW || 150, h = rows.length * rowH + 6;
    const svg = svgFor(el, w, h).attr("aria-label", opt.aria);
    const x = d3.scaleLinear().domain([0, opt.max || d3.max(rows, (r) => r.v)]).range([0, w - labelW - 70]);
    const g = svg.selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${i * rowH})`);
    g.append("text").attr("class", "lbl").attr("x", 0).attr("y", rowH / 2).attr("dy", "0.35em").text((d) => d.label);
    const bars = g.append("rect").attr("class", (d) => d.cls || "bar").attr("x", labelW).attr("y", rowH / 2 - 9).attr("height", 18)
      .attr("width", (d) => Math.max(1, x(d.v))).attr("data-w", (d) => Math.max(1, x(d.v)));
    g.append("text").attr("class", "val").attr("x", (d) => labelW + x(d.v) + 8).attr("y", rowH / 2).attr("dy", "0.35em").text((d) => opt.fmt(d.v));
    return () => playBars(bars, true);
  }

  /* ---------- Credit evidence ---------- */
  if (credit.models && window.d3) {
    const M = credit.models, names = ["XGBoost", "Logistic regression"];
    $("#model-rows").innerHTML = names.map((nm) => {
      const m = M[nm];
      return `<tr><td><i class="key" style="background:${nm === "XGBoost" ? "var(--blue)" : "#000"}"></i>${nm}</td><td>${m.test_auc.toFixed(3)}</td><td>${m.cv_auc_mean.toFixed(3)} ± ${m.cv_auc_sd.toFixed(3)}</td><td>${m.ks.toFixed(3)}</td><td>${m.brier.toFixed(3)}</td></tr>`;
    }).join("");

    // Gains curve, drawn as you scroll
    const el = $("#c-gains"), small = el.clientWidth < 520, w = small ? Math.max(330, el.clientWidth) : 760, h = small ? 300 : 340, m = { t: 14, r: small ? 16 : 140, b: 40, l: 46 };
    const svg = svgFor(el, w, h).attr("aria-label", `Cumulative gains: calling the riskiest 20% reaches ${pct(M.XGBoost.top20_capture, 0)} of defaults with XGBoost and ${pct(M["Logistic regression"].top20_capture, 0)} with logistic regression.`);
    const x = d3.scaleLinear([0, 1], [m.l, w - m.r]), y = d3.scaleLinear([0, 1], [h - m.b, m.t]);
    const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
    svg.append("g").attr("class", "grid").selectAll("line").data(ticks).join("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").selectAll("text").data(ticks).join("text").attr("x", m.l - 8).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").text((d) => d * 100 + "%");
    svg.append("g").selectAll("text").data(ticks).join("text").attr("x", x).attr("y", h - m.b + 20).attr("text-anchor", "middle").text((d) => d * 100 + "%");
    svg.append("text").attr("x", (m.l + w - m.r) / 2).attr("y", h - 2).attr("text-anchor", "middle").text("Customers called, riskiest first");
    svg.append("line").attr("class", "ln-rand").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(1)).attr("y2", y(1));
    const xs = d3.range(11).map((i) => i / 10);
    const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1])).curve(d3.curveMonotoneX);
    const paths = [["Logistic regression", "ln-base"], ["XGBoost", "ln-model"]].map(([nm, cls]) => svg.append("path").attr("class", cls).attr("d", line(xs.map((v, i) => [v, credit.gains[nm][i]]))));
    const cap = M.XGBoost.top20_capture;
    svg.append("line").attr("class", "marker").attr("x1", x(0.2)).attr("x2", x(0.2)).attr("y1", y(0)).attr("y2", y(cap)).attr("stroke-dasharray", "2 3");
    const capDot = svg.append("circle").attr("cx", x(0.2)).attr("cy", y(cap)).attr("r", 6).style("fill", "var(--orange)");
    const capText = svg.append("text").attr("class", "val").attr("x", x(0.2) + 12).attr("y", y(cap) + 20).text(`20% called, ${pct(cap, 0)} of defaults reached`);
    svg.append("text").attr("class", "lbl").attr("x", x(0.5) - 14).attr("y", y(credit.gains.XGBoost[5]) - 14).attr("text-anchor", "end").style("fill", "var(--blue)").style("font-weight", 800).text("XGBoost");
    svg.append("text").attr("class", "lbl").attr("x", small ? x(1) : x(0.8) + 4).attr("text-anchor", small ? "end" : "start").attr("y", y(credit.gains["Logistic regression"][8]) + 24).text("Logistic regression");
    if (!small) svg.append("text").attr("class", "lbl").attr("x", x(0.66)).attr("y", y(0.5)).text("Random");
    if (motion) {
      const lens = paths.map((p) => p.node().getTotalLength());
      paths.forEach((p, i) => p.attr("stroke-dasharray", lens[i]).attr("stroke-dashoffset", lens[i]));
      capDot.style("opacity", 0); capText.style("opacity", 0);
      let shown = false;
      ScrollTrigger.create({
        trigger: el, start: "top 80%", end: "top 30%", scrub: 0.5,
        onUpdate: (self) => {
          paths.forEach((p, i) => p.attr("stroke-dashoffset", lens[i] * (1 - self.progress)));
          const show = self.progress > 0.35;
          if (show !== shown) { shown = show; capDot.style("opacity", show ? 1 : 0); capText.style("opacity", show ? 1 : 0); if (show) gsap.fromTo(capDot.node(), { attr: { r: 16 } }, { attr: { r: 6 }, duration: 0.5, ease: "power3.out" }); }
        },
      });
    }

    // Calibration
    const ce = $("#c-calib"), cw = 380, ch = 340, cm = { t: 10, r: 14, b: 40, l: 46 };
    const cs = svgFor(ce, cw, ch).attr("aria-label", "Calibration: predicted and actual default rates fall close to the diagonal in all ten bands.");
    const cx = d3.scaleLinear([0, 0.8], [cm.l, cw - cm.r]), cy = d3.scaleLinear([0, 0.8], [ch - cm.b, cm.t]);
    const ct = [0, 0.2, 0.4, 0.6, 0.8];
    cs.append("g").attr("class", "grid").selectAll("line").data(ct).join("line").attr("x1", cm.l).attr("x2", cw - cm.r).attr("y1", cy).attr("y2", cy);
    cs.append("g").selectAll("text").data(ct).join("text").attr("x", cm.l - 8).attr("y", cy).attr("dy", "0.35em").attr("text-anchor", "end").text((d) => Math.round(d * 100) + "%");
    cs.append("g").selectAll("text").data(ct).join("text").attr("x", cx).attr("y", ch - cm.b + 20).attr("text-anchor", "middle").text((d) => Math.round(d * 100) + "%");
    cs.append("text").attr("x", (cm.l + cw - cm.r) / 2).attr("y", ch - 2).attr("text-anchor", "middle").text("Predicted risk");
    cs.append("line").attr("class", "ln-rand").attr("x1", cx(0)).attr("y1", cy(0)).attr("x2", cx(0.8)).attr("y2", cy(0.8));
    const cpts = cs.append("path").attr("class", "ln-model").attr("d", d3.line().x((d) => cx(d.predicted)).y((d) => cy(d.actual))(credit.calibration));
    const cdots = cs.append("g").selectAll("circle").data(credit.calibration).join("circle").attr("class", "dot").attr("r", 5.5).attr("cx", (d) => cx(d.predicted)).attr("cy", (d) => cy(d.actual));
    cdots.append("title").text((d) => `Predicted ${pct(d.predicted)}, actual ${pct(d.actual)}`);
    onEnter(ce, () => { playLine(cpts); cdots.attr("r", 0).transition().delay((d, i) => 200 + i * 90).duration(450).ease(d3.easeBackOut.overshoot(2.2)).attr("r", 5.5); });

    // SHAP importance
    const shapPlay = hbars($("#c-shap"), credit.shap_top.slice(0, 6).map((d, i) => ({ label: d.feature.replace(" (months)", ""), v: d.importance, cls: i < 3 ? "bar" : "bar-mute" })),
      { w: 520, labelW: 236, fmt: (v) => v.toFixed(2), aria: "SHAP importance: last month's repayment status, worst delay and months late matter most.", rowH: 34 });
    onEnter($("#c-shap"), shapPlay);

    // Reason card
    const ex = credit.reason_example;
    if (ex) {
      const sayReason = (r) => {
        const f = r.feature, v = r.value;
        if (f.startsWith("Worst delay")) return `Worst delay in the last six months: ${v} months`;
        if (f.startsWith("Months late")) return `Late in ${v} of the last six months`;
        if (f.startsWith("Payment,")) return `${f.replace("Payment, ", "Paid ")}: NT$${fmtInt(v)}`;
        if (f.startsWith("Repayment status")) return `${f.replace("Repayment status, ", "Status ")}: ${v > 0 ? v + " month" + (v > 1 ? "s" : "") + " late" : v === 0 ? "paid the minimum" : "paid in full"}`;
        return `${f}: ${fmtInt(v)}`;
      };
      const maxS = d3.max(ex.reasons, (r) => Math.abs(r.shap));
      $("#reason-card").innerHTML = `
        <header><span class="who">Customer ${ex.customer_id}</span><span class="score">Score ${pct(ex.score, 0)}, flagged for a call</span></header>
        <ul>${ex.reasons.slice(0, 5).map((r) => {
          const up = r.shap > 0;
          return `<li class="${up ? "up" : "down"}"><span class="dir" aria-hidden="true">${up ? "+" : "−"}</span><span class="txt">${sayReason(r)} <span class="sr-only">${up ? "raises" : "lowers"} risk</span></span><span class="w" style="width:${Math.round(68 * Math.abs(r.shap) / maxS)}px"></span></li>`;
        }).join("")}</ul>
        <p class="note">+ raises the risk, − lowers it. Bar length is the size of the effect.</p>`;
    }
  }

  /* ---------- Mini charts for the six cases. Each returns a function that replays its entrance. ---------- */
  const minis = {
    churn(el) {
      const d = S.churn.deciles, w = 440, h = 210, m = { t: 26, b: 30, l: 4, r: 4 };
      const svg = svgFor(el, w, h).attr("aria-label", "Churn rate falls from 73% in the riskiest decile to under 5% in the safest.");
      const x = d3.scaleBand(d.map((r) => r.decile), [m.l, w - m.r]).padding(0.26), y = d3.scaleLinear([0, 80], [h - m.b, m.t]);
      const bars = svg.selectAll("rect").data(d).join("rect").attr("class", (r) => (r.decile <= 2 ? "bar-risk" : "bar-mute"))
        .attr("x", (r) => x(r.decile)).attr("width", x.bandwidth()).attr("y", (r) => y(r.churn_rate)).attr("height", (r) => y(0) - y(r.churn_rate))
        .attr("data-y", (r) => y(r.churn_rate)).attr("data-h", (r) => y(0) - y(r.churn_rate));
      svg.selectAll(".v").data(d.filter((r) => r.decile <= 2)).join("text").attr("class", "val").attr("text-anchor", "middle")
        .attr("x", (r) => x(r.decile) + x.bandwidth() / 2).attr("y", (r) => y(r.churn_rate) - 7).text((r) => Math.round(r.churn_rate) + "%");
      svg.selectAll(".t").data(d).join("text").attr("text-anchor", "middle").attr("x", (r) => x(r.decile) + x.bandwidth() / 2).attr("y", h - 10).text((r) => r.decile);
      return () => playBars(bars, false);
    },
    ab(el) {
      const rows = S.ab.retention.filter((r) => r.metric === "retention_7"), w = 440, h = 160, m = { l: 122, r: 52 };
      const svg = svgFor(el, w, h).attr("aria-label", "7-day retention: 19.0% with the gate at level 30, 18.2% at level 40; the confidence intervals do not overlap.");
      const x = d3.scaleLinear([17.5, 19.75], [m.l, w - m.r]);
      const ticks = [17.5, 18, 18.5, 19, 19.5];
      svg.append("g").attr("class", "grid").selectAll("line").data(ticks).join("line").attr("x1", x).attr("x2", x).attr("y1", 10).attr("y2", h - 30);
      svg.append("g").selectAll("text").data(ticks).join("text").attr("x", x).attr("y", h - 10).attr("text-anchor", "middle").text((d) => d + "%");
      const g = svg.selectAll(".r").data(rows).join("g").attr("transform", (d, i) => `translate(0,${40 + i * 50})`);
      const col = (d) => (d.version === "gate_30" ? "var(--c-val)" : "var(--orange)");
      g.append("text").attr("class", "lbl").attr("y", 0).attr("dy", "0.35em").text((d) => (d.version === "gate_30" ? "Gate at level 30" : "Gate at level 40"));
      const ci = g.append("line").style("stroke", col).attr("stroke-width", 4).attr("x1", (d) => x(d.ci_low_pct)).attr("x2", (d) => x(d.ci_high_pct));
      g.append("circle").attr("r", 7).attr("cx", (d) => x(d.rate_pct)).style("fill", col);
      g.append("text").attr("class", "val").attr("x", (d) => x(d.ci_high_pct) + 9).attr("dy", "0.35em").text((d) => d.rate_pct.toFixed(1) + "%");
      return () => ci.attr("x2", (d) => x(d.rate_pct)).attr("x1", (d) => x(d.rate_pct)).transition().duration(950).ease(d3.easeCubicOut).attr("x1", (d) => x(d.ci_low_pct)).attr("x2", (d) => x(d.ci_high_pct));
    },
    deliveries(el) {
      return hbars(el, S.deliveries.by_band.map((r, i) => ({ label: r.band, v: r.avg_review, cls: i === 0 ? "bar" : "bar-risk" })),
        { max: 5, labelW: 146, fmt: (v) => v.toFixed(2) + " stars", aria: "Average review falls from 4.29 stars on time to 1.70 stars when eight or more days late." });
    },
    retail(el) {
      return hbars(el, S.retail.rfm_segments.slice(0, 5).map((r, i) => ({ label: r.segment, v: r.revenue_share_pct, cls: i === 0 ? "bar-risk" : "bar-mute" })),
        { labelW: 160, fmt: (v) => v.toFixed(0) + "%", aria: "Champions are 14% of customers and 45% of revenue." });
    },
    nsl(el) {
      const r = S.nsl.recall_by_category_pct;
      return hbars(el, [["Denial of service", r.DoS], ["Probing", r.Probe], ["Remote to local", r.R2L], ["User to root", r.U2R]].map(([label, v], i) => ({ label, v, cls: i < 2 ? "bar" : "bar-risk" })),
        { max: 100, labelW: 146, fmt: (v) => v.toFixed(0) + "%", aria: "Detection rate by attack type: high for denial of service and probing, very low for remote-to-local and user-to-root." });
    },
    house(el) {
      const yr = (q) => +q.slice(0, 4) + (+q.slice(-1) - 1) / 4;
      const d = S.house.series.map((p) => ({ year: yr(p.q), price: p.price }));
      const w = 440, h = 216, m = { t: 10, r: 10, b: 28, l: 54 };
      const svg = svgFor(el, w, h).attr("aria-label", "UK average house price on a log scale from about £1,900 in 1953 to about £270,000.");
      const x = d3.scaleLinear(d3.extent(d, (p) => p.year), [m.l, w - m.r]), y = d3.scaleLog([1000, 400000], [h - m.b, m.t]);
      const yt = [1000, 10000, 100000];
      (S.house.downturns || []).forEach((dt) => {
        const end = /^\d{4} Q\d$/.test(dt.recovered || "") ? yr(dt.recovered) : d[d.length - 1].year;
        svg.append("rect").attr("class", "shade").attr("x", x(yr(dt.peak))).attr("width", Math.max(2, x(end) - x(yr(dt.peak)))).attr("y", m.t).attr("height", h - m.b - m.t);
      });
      svg.append("g").attr("class", "grid").selectAll("line").data(yt).join("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y);
      svg.append("g").selectAll("text").data(yt).join("text").attr("x", m.l - 8).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").text((v) => "£" + d3.format("~s")(v));
      svg.append("g").selectAll("text").data([1960, 1980, 2000, 2020]).join("text").attr("x", x).attr("y", h - 8).attr("text-anchor", "middle").text((v) => v);
      const p = svg.append("path").attr("class", "ln-model").attr("d", d3.line().x((v) => x(v.year)).y((v) => y(v.price))(d));
      return () => playLine(p);
    },
  };
  const frames = $$(".frame").map((el) => {
    const chartEl = $("[data-mini]", el); let play = null;
    try { if (chartEl && window.d3) play = minis[chartEl.dataset.mini](chartEl); } catch (e) { console.warn("chart", chartEl && chartEl.dataset.mini, e); }
    return { el, play, done: false };
  });
  function countUp(el) {
    const v = +el.dataset.count, dec = +el.dataset.dec || 0, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "", o = { x: 0 };
    gsap.to(o, { x: v, duration: 1.2, ease: "power2.out", onUpdate: () => { el.textContent = pre + o.x.toFixed(dec) + suf; }, onComplete: () => { el.textContent = pre + v.toFixed(dec) + suf; } });
  }
  function activate(f) {
    if (f.done || !motion) return; f.done = true;
    if (f.play) f.play();
    const num = $("[data-count]", f.el); if (num) countUp(num);
    const art = $(".sticker-art", f.el);
    if (art) gsap.fromTo(art, { scale: 0, rotate: -50 }, { scale: 1, rotate: f.el.matches(":nth-of-type(even)") ? -8 : 9, duration: 0.4, ease: "back.out(2.6)", delay: 0.25, onComplete: () => hit($(".frame-fig", f.el), 0.5) });
  }

  /* ---------- The slice: paper is cut along a diagonal and slides apart ---------- */
  (function () {
    const el = $("#cut"); if (!el || !motion) return;
    el.classList.add("cut-live");
    const stage = $(".cut-stage", el), a = $(".cut-a", el), b = $(".cut-b", el), blade = $(".cut-blade", el), flash = $(".cut-flash", el), lines = $$(".cut-title span", el), sub = $(".cut-sub", el);
    let W = 1, H = 1, ang = 0, fired = false;
    const EXT = 60; // the halves overhang the stage sideways so the slip never shows an edge
    const measure = () => { W = stage.clientWidth; H = stage.clientHeight; const dy = 0.24 * (H + 2), dx = W + EXT * 2; ang = Math.atan2(-dy, dx); blade.style.width = Math.hypot(dx, dy) + "px"; };
    measure(); ScrollTrigger.addEventListener("refreshInit", measure);
    ScrollTrigger.create({
      trigger: el, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate(self) {
        const p = self.progress, bl = seg(p, 0.14, 0.22), slip = seg(p, 0.22, 0.27), open = smooth(seg(p, 0.27, 0.8));
        const ux = Math.cos(ang), uy = Math.sin(ang);
        blade.style.transform = `rotate(${ang}rad) scaleX(${bl})`; blade.style.opacity = 1 - seg(p, 0.27, 0.36);
        a.style.transform = `translate(${-ux * 18 * slip - W * 0.05 * open}px, ${-uy * 18 * slip - H * 0.7 * open}px) rotate(${-2.5 * open}deg)`;
        b.style.transform = `translate(${ux * 7 * slip + W * 0.05 * open}px, ${uy * 7 * slip + H * 0.7 * open}px) rotate(${2 * open}deg)`;
        lines.forEach((l, i) => setStretch(l, smooth(c01(open * 1.3 - i * 0.18))));
        sub.style.opacity = seg(p, 0.6, 0.85);
        if (p >= 0.22 && !fired) { fired = true; if (self.direction > 0) { gsap.fromTo(flash, { opacity: 0.75 }, { opacity: 0, duration: 0.45, ease: "power2.out" }); hit(stage, 1.2); } }
        if (p < 0.12) fired = false;
      },
    });
  })();

  /* ---------- Film strip: sideways on wide screens, stacked otherwise ---------- */
  const Strip = (function () {
    const work = $("#work"), pin = $("#strip-pin"), view = $("#strip-view"), strip = $("#strip"), counter = $("#strip-n");
    if (!pin || !strip) return { goTo: () => false };
    const wide = window.matchMedia("(min-width: 901px)").matches;
    if (!motion || !wide) {
      if (motion) frames.forEach((f) => ScrollTrigger.create({ trigger: f.el, start: "top 75%", once: true, onEnter: () => activate(f) }));
      return { goTo: () => false };
    }
    work.classList.add("strip-h");
    const dist = () => Math.max(0, strip.scrollWidth - view.clientWidth);
    const setHeight = () => { pin.style.height = window.innerHeight + dist() + "px"; };
    setHeight(); ScrollTrigger.addEventListener("refreshInit", setHeight);
    const trig = ScrollTrigger.create({
      trigger: pin, start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true,
      onUpdate(self) {
        const x = -dist() * self.progress, vw = view.clientWidth;
        strip.style.transform = `translate3d(${x}px,0,0)`;
        let current = 0;
        frames.forEach((f, i) => { const left = f.el.offsetLeft + x; if (left < vw * 0.7) activate(f); if (left < vw * 0.5) current = i; });
        if (counter) counter.textContent = String(current + 1).padStart(2, "0");
      },
    });
    // Activate the first frame as soon as the strip is on screen.
    ScrollTrigger.create({ trigger: pin, start: "top 60%", once: true, onEnter: () => activate(frames[0]) });
    const yFor = (f) => trig.start + Math.min(dist(), Math.max(0, f.offsetLeft - view.clientWidth * 0.05));
    // Keyboard focus inside an off-screen frame: bring that frame in properly instead of letting the browser side-scroll the view.
    view.addEventListener("scroll", () => { view.scrollLeft = 0; });
    view.addEventListener("focusin", (e) => { const f = e.target.closest(".frame"); if (f) { view.scrollLeft = 0; const r = f.getBoundingClientRect(); if (r.left < 0 || r.right > window.innerWidth) scrollToY(yFor(f), true); } });
    return { goTo(id, instant) { const f = document.getElementById(id); if (!f || !f.classList.contains("frame")) return false; scrollToY(yFor(f), instant); return true; } };
  })();

  /* ---------- In-page links ---------- */
  function goHash(hash, instant) {
    if (!hash || hash.length < 2) return false;
    const id = decodeURIComponent(hash.slice(1));
    if (Strip.goTo(id, instant)) return true;
    const target = document.getElementById(id); if (!target) return false;
    const y = target.getBoundingClientRect().top + window.scrollY - (id === "top" ? 0 : 20);
    scrollToY(Math.max(0, y), instant);
    return true;
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const hash = a.getAttribute("href");
    if (goHash(hash)) { e.preventDefault(); history.replaceState(null, "", hash); }
  }));

  /* ---------- Banners, stamps, marker strokes, tapes ---------- */
  function setupKinetic() {
    if (!motion) return;
    $$("[data-banner]").forEach((b) => {
      const lines = $$(".bl", b);
      lines.forEach((l) => setStretch(l, 0));
      const last = !!b.closest(".foot"); // the footer can never scroll up the page, so it finishes as it arrives
      ScrollTrigger.create({ trigger: b, start: last ? "top bottom" : "top 96%", end: last ? "bottom bottom" : "top 38%", scrub: 0.6, onUpdate: (self) => lines.forEach((l, i) => setStretch(l, smooth(c01(self.progress * 1.25 - i * 0.14)))) });
    });
    $$(".rule").forEach((rule, i) => {
      const stamp = $(".stamp", rule), rot = i % 2 ? 5 : -7;
      gsap.set(stamp, { opacity: 0 });
      ScrollTrigger.create({ trigger: rule, start: "top 76%", once: true, onEnter: () => gsap.fromTo(stamp, { opacity: 1, scale: 2.6, rotate: rot - 16 }, { scale: 1, rotate: rot, duration: 0.36, ease: "power3.in", onComplete: () => hit(rule, 0.5) }) });
    });
    $$(".mark path").forEach((p) => {
      const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      if (p.closest(".hero-note")) { gsap.to(p, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut", delay: 2.1 }); return; }
      ScrollTrigger.create({ trigger: p.closest(".step") || p, start: "top 62%", once: true, onEnter: () => gsap.to(p, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut", delay: 0.15 }) });
    });
  }
  (function () {
    const runs = $$(".tape-run"); if (!runs.length) return;
    const items = runs.map((run) => {
      const text = run.textContent.trim() + " ";
      run.innerHTML = `<span>${text}</span>`;
      const unit = run.firstChild.offsetWidth || 600, reps = Math.ceil((window.innerWidth * 1.4) / unit) + 2;
      run.innerHTML = `<span>${text}</span>`.repeat(reps);
      return { run, unit, dir: +run.dataset.speed || 1, x: 0 };
    });
    if (!motion) return;
    let onScreen = false;
    ScrollTrigger.create({ trigger: ".tapes", start: "top bottom", end: "bottom top", onToggle: (self) => { onScreen = self.isActive; } });
    gsap.ticker.add(() => {
      if (!onScreen) return;
      const v = lenis ? lenis.velocity || 0 : 0;
      items.forEach((it) => {
        it.x -= it.dir * (0.7 + v * 0.35);
        it.x = ((it.x % it.unit) - it.unit) % it.unit; // keep within one repeat
        it.run.style.transform = `translate3d(${it.x}px,0,0)`;
      });
    });
  })();

  /* ---------- Slate: scene name, timecode, progress ---------- */
  (function () {
    const sceneEl = $("#slate-scene"), tc = $("#slate-tc"), bar = $("#slate-bar"), scenes = $$("[data-scene]");
    if (!sceneEl || !hasGsap) return;
    scenes.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: "top 55%", end: "bottom 55%", onToggle: (self) => { if (self.isActive) sceneEl.textContent = String(i + 1).padStart(2, "0") + " " + s.dataset.scene; } }));
    const two = (v) => String(v).padStart(2, "0");
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => {
      const f = Math.round(self.progress * 96 * 24);
      tc.textContent = `${two(Math.floor(f / 1440))}:${two(Math.floor(f / 24) % 60)}:${two(f % 24)}`;
      bar.style.transform = `scaleX(${self.progress})`;
    } });
  })();

  /* ---------- Header: steps out of the way while reading down, comes back on the way up ---------- */
  (function () {
    const top = $(".top"); if (!top || !hasGsap) return;
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => { const y = self.scroll(); top.classList.toggle("is-away", self.direction > 0 && y > window.innerHeight * 0.5); top.classList.toggle("is-solid", y > 24); } });
  })();

  /* ---------- Registration-mark cursor ---------- */
  (function () {
    const c = $(".cursor");
    if (!c || !motion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let x = 0, y = 0, tx = 0, ty = 0, on = false;
    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; x = tx; y = ty; c.classList.add("is-on"); }
      c.classList.toggle("is-link", !!(e.target.closest && e.target.closest("a, button, input, select, textarea")));
    }, { passive: true });
    document.addEventListener("pointerleave", () => { on = false; c.classList.remove("is-on"); });
    gsap.ticker.add(() => { x += (tx - x) * 0.24; y += (ty - y) * 0.24; c.style.transform = `translate3d(${x}px,${y}px,0)`; });
  })();

  /* ---------- Start: wait for the display font, lay everything out, then run the scan ---------- */
  let lastW = window.innerWidth;
  function layoutAll(force) { fitBanners(); if (Dots) Dots.layout(force); }
  if (hasGsap) ScrollTrigger.addEventListener("refreshInit", () => layoutAll(false));
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastW) { if (Dots) Dots.layout(false); return; } // height-only change (mobile address bar)
    lastW = window.innerWidth;
    if (!hasGsap) layoutAll(false);
  });

  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([Promise.all([document.fonts.load('900 100px "Anybody"'), document.fonts.load('900 condensed 100px "Anybody"')]), new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve();
  fontReady.then(() => {
    layoutAll(true);
    setupKinetic();
    if (hasGsap) ScrollTrigger.refresh();
    const deep = goHash(location.hash, true);
    if (deep) { // the browser re-applies its own jump to the #anchor until the page has finished loading, so ours goes last
      const again = () => requestAnimationFrame(() => goHash(location.hash, true));
      if (document.readyState === "complete") again(); else window.addEventListener("load", again, { once: true });
      setTimeout(again, 350);
    }
    const scan = $("#scan");
    let seen = false; try { seen = sessionStorage.getItem("scan") === "1"; sessionStorage.setItem("scan", "1"); } catch (_) {}
    if (!motion || deep || window.scrollY > 40) { if (scan) scan.classList.add("is-done"); if (Dots) Dots.request(); return; }
    if (seen) { scan.classList.add("is-done"); if (Dots) Dots.intro(1.1); return; }
    // The photocopier pass: a bar of light travels down the page and the print appears behind it.
    const mask = $("b", scan), bar = $("i", scan), o = { p: 0 };
    if (Dots) Dots.intro(1.9);
    gsap.to(o, { p: 1, duration: 1.05, ease: "power2.inOut", delay: 0.1,
      onUpdate: () => { mask.style.clipPath = `inset(${o.p * 100}% 0 0 0)`; bar.style.transform = `translateY(${o.p * (window.innerHeight + bar.offsetHeight) - bar.offsetHeight}px)`; },
      onComplete: () => scan.classList.add("is-done") });
  });
})();
