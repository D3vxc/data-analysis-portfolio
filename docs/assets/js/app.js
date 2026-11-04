/* Portfolio interactions: smooth scroll (Lenis), scroll-driven animation (GSAP ScrollTrigger),
   charts (D3) and the scroll-scrubbed dot field for the credit model (canvas). */
(function () {
  "use strict";
  const S = window.SITE_DATA || {};
  const T = window.CREDIT_TEST;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const pct = (v, d = 1) => (100 * v).toFixed(d) + "%";
  const fmtInt = (v) => Math.round(v).toLocaleString("en-GB");
  $("#year").textContent = new Date().getFullYear();

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (!reduce && hasGsap && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -64 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  }));

  /* ---------- Reading progress ---------- */
  if (hasGsap) {
    gsap.to("#progress-bar", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.2 } });
  }

  /* ---------- Hero: the one page-load moment ---------- */
  if (hasGsap && !reduce) {
    gsap.from(".hero-title .line > span", { yPercent: 108, duration: 1.1, ease: "power4.out", stagger: 0.12 });
    gsap.from(".hero-foot", { opacity: 0, y: 16, duration: 0.9, delay: 0.55, ease: "power2.out" });
  }

  /* ---------- Credit model: numbers computed from the test set ---------- */
  const credit = S.credit || {};
  let stats = null;
  if (T) {
    const n = T.score.length;
    const idx = d3.range(n);
    const ranked = idx.slice().sort((a, b) => T.score[b] - T.score[a]);
    const k = Math.round(n * 0.2);
    const flagged = new Uint8Array(n);
    ranked.slice(0, k).forEach((i) => (flagged[i] = 1));
    const ys = Array.from(T.y, Number);
    const defaults = d3.sum(ys);
    const caught = d3.sum(ranked.slice(0, k), (i) => ys[i]);
    const groups = T.ages.map((label, g) => {
      const members = idx.filter((i) => +T.age[i] === g);
      return { label, members, flagRate: d3.mean(members, (i) => flagged[i]) };
    });
    const rates = groups.map((g) => g.flagRate);
    stats = {
      n, ranked, k, flagged, ys, defaults, groups,
      base: defaults / n, capture: caught / defaults, precision: caught / k,
      ageRatio: d3.min(rates) / d3.max(rates),
    };
    const bind = {
      base: pct(stats.base), capture: pct(credit.models ? credit.models.XGBoost.top20_capture : stats.capture, 0),
      precision: pct(credit.models ? credit.models.XGBoost.top20_precision : stats.precision, 1),
      lift: ((credit.models ? credit.models.XGBoost.top20_precision : stats.precision) / stats.base).toFixed(1), ageRatio: stats.ageRatio.toFixed(2),
      shap3: credit.shap_top3_share_pct ? Math.round(credit.shap_top3_share_pct) + "%" : null,
    };
    $$("[data-bind]").forEach((el) => { const v = bind[el.dataset.bind]; if (v) el.textContent = v; });
  }

  /* ---------- Dot field ---------- */
  const canvas = $("#dots");
  if (canvas && stats) {
    const ctx = canvas.getContext("2d");
    const COLS = 100;
    const rng = d3.randomLcg(7);
    const shuffled = d3.shuffler(rng)(d3.range(stats.n));
    const slotA = new Uint16Array(stats.n), slotB = new Uint16Array(stats.n);
    shuffled.forEach((i, s) => (slotA[i] = s));
    stats.ranked.forEach((i, s) => (slotB[i] = s));
    const posD = new Float32Array(stats.n * 2);
    let W = 0, H = 0, cell = 0, rowsTotal = 0, bandTops = [], offAB = 0;
    let colors = {};
    let t = 0; // 0..3 scroll state

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.parentElement.clientWidth;
      cell = W / COLS;
      const gapRows = Math.ceil(20 / cell) + 1;
      const bandRows = stats.groups.map((g) => Math.ceil(g.members.length / COLS));
      rowsTotal = Math.max(Math.ceil(stats.n / COLS), d3.sum(bandRows) + gapRows * stats.groups.length);
      offAB = Math.floor((rowsTotal - Math.ceil(stats.n / COLS)) / 2);
      bandTops = [];
      let row = 0;
      stats.groups.forEach((g, gi) => {
        row += gapRows; bandTops.push(row);
        g.members.slice().sort((a, b) => T.score[b] - T.score[a]).forEach((i, s) => {
          posD[2 * i] = s % COLS; posD[2 * i + 1] = row + Math.floor(s / COLS);
        });
        row += bandRows[gi];
      });
      H = rowsTotal * cell;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      colors = { risk: css("--risk"), base: css("--base"), ink: css("--ink"), ink2: css("--ink-2"), model: css("--model") };
      draw();
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const ease = (v) => v * v * (3 - 2 * v);
    const readout = $("#dots-readout");
    let lastReadout = "";

    function draw() {
      const ab = ease(clamp01((t - 0.3) / 0.5));
      const hi = ease(clamp01((t - 1.2) / 0.4));
      const cd = ease(clamp01((t - 2.05) / 0.5));
      ctx.clearRect(0, 0, W, H);
      const size = Math.max(1.6, cell * 0.74);
      for (const pass of [0, 1]) { // grey first, amber on top
        ctx.fillStyle = pass ? colors.risk : colors.base;
        for (let i = 0; i < stats.n; i++) {
          const isDefault = stats.ys[i] === 1;
          if (isDefault !== !!pass) continue;
          const ax = slotA[i] % COLS, ay = offAB + Math.floor(slotA[i] / COLS);
          const bx = slotB[i] % COLS, by = offAB + Math.floor(slotB[i] / COLS);
          let x = ax + (bx - ax) * ab, y = ay + (by - ay) * ab;
          x += (posD[2 * i] - x) * cd; y += (posD[2 * i + 1] - y) * cd;
          let a = isDefault ? 1 : 0.42;
          if (!stats.flagged[i]) a *= 1 - 0.68 * hi;
          ctx.globalAlpha = a;
          ctx.fillRect(x * cell, y * cell, size, size);
        }
      }
      ctx.globalAlpha = 1;
      // Box around the riskiest 20%
      const boxA = hi * (1 - cd);
      if (boxA > 0.01) {
        const rows = Math.ceil(stats.k / COLS);
        ctx.globalAlpha = boxA; ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5;
        ctx.strokeRect(-3, offAB * cell - 3, W + 6 - cell * 0.26, rows * cell + 6 - cell * 0.26);
        ctx.globalAlpha = 1;
      }
      // Age band labels
      if (cd > 0.01) {
        ctx.globalAlpha = cd; ctx.fillStyle = colors.ink2;
        ctx.font = `500 ${W < 480 ? 11.5 : 13}px "Public Sans", system-ui, sans-serif`;
        ctx.textBaseline = "bottom";
        stats.groups.forEach((g, gi) => {
          ctx.fillText(`${g.label}: ${pct(g.flagRate)} flagged`, 0, bandTops[gi] * cell - 5);
        });
        ctx.globalAlpha = 1;
      }
      const text = t < 0.55 ? `${fmtInt(stats.defaults)} of ${fmtInt(stats.n)} defaulted`
        : t < 1.4 ? "Highest score at the top"
        : t < 2.3 ? `Top 20% holds ${pct(stats.capture, 0)} of defaults`
        : `Flag-rate ratio by age: ${stats.ageRatio.toFixed(2)}`;
      if (text !== lastReadout) { readout.textContent = text; lastReadout = text; }
    }

    layout();
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { layout(); if (hasGsap) ScrollTrigger.refresh(); }, 120); });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", layout);

    const steps = $$(".step");
    if (hasGsap && !reduce) {
      ScrollTrigger.create({
        // On narrow screens each step's text sits at the bottom of its block, below the sticky chart.
        trigger: ".steps", start: () => (innerWidth <= 860 ? "top top" : "top 55%"), end: () => (innerWidth <= 860 ? "bottom bottom" : "bottom 75%"), scrub: 0.4, invalidateOnRefresh: true,
        onUpdate: (self) => { t = self.progress * 3.2; draw(); },
      });
      steps.forEach((step) => ScrollTrigger.create({
        trigger: step, start: "top 60%", end: "bottom 40%",
        toggleClass: { targets: step, className: "is-active" },
      }));
    } else {
      t = 2; draw(); // reduced motion: show the ranked view with the top 20% marked
      steps.forEach((s) => s.classList.add("is-active"));
    }
  }

  /* ---------- Chart helpers (D3) ---------- */
  function svgFor(el, w, h) {
    el.innerHTML = "";
    return d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img");
  }
  function onEnter(el, fn) {
    if (!hasGsap || reduce) { fn(true); return; }
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => fn(false) });
  }
  function growBars(sel, horizontal, instant) {
    sel.each(function () {
      const b = d3.select(this);
      const full = horizontal ? +b.attr("width") : +b.attr("height");
      if (instant) return;
      if (horizontal) b.attr("width", 0).transition().duration(900).ease(d3.easeCubicOut).delay((d, i) => i * 60).attr("width", full);
      else {
        const y = +b.attr("y");
        b.attr("height", 0).attr("y", y + full).transition().duration(900).ease(d3.easeCubicOut).delay((d, i) => i * 50).attr("height", full).attr("y", y);
      }
    });
  }
  function drawLine(path, instant) {
    const node = path.node(); const L = node.getTotalLength();
    if (instant) return;
    path.attr("stroke-dasharray", L).attr("stroke-dashoffset", L).transition().duration(1400).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0)
      .on("end", () => path.attr("stroke-dasharray", null));
  }
  function hbars(el, rows, opt) {
    const w = opt.w || 440, rowH = opt.rowH || 30, labelW = opt.labelW || 150, h = rows.length * rowH + 6;
    const svg = svgFor(el, w, h).attr("aria-label", opt.aria);
    const x = d3.scaleLinear().domain([0, opt.max || d3.max(rows, (r) => r.v)]).range([0, w - labelW - 64]);
    const g = svg.selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${i * rowH})`);
    g.append("text").attr("class", "lbl").attr("x", 0).attr("y", rowH / 2).attr("dy", "0.35em").text((d) => d.label);
    const bars = g.append("rect").attr("class", (d) => d.cls || "bar").attr("x", labelW).attr("y", rowH / 2 - 8).attr("height", 16).attr("rx", 2)
      .attr("width", (d) => Math.max(1, x(d.v)));
    g.append("text").attr("class", "val").attr("x", (d) => labelW + x(d.v) + 8).attr("y", rowH / 2).attr("dy", "0.35em").text((d) => opt.fmt(d.v));
    onEnter(el, (instant) => growBars(bars, true, instant));
  }

  /* ---------- Credit evidence ---------- */
  if (credit.models) {
    const M = credit.models, names = ["XGBoost", "Logistic regression"];
    $("#model-rows").innerHTML = names.map((nm) => {
      const m = M[nm];
      return `<tr><td><i class="key" style="background:var(${nm === "XGBoost" ? "--model" : "--base"})"></i>${nm}</td><td>${m.test_auc.toFixed(3)}</td><td>${m.cv_auc_mean.toFixed(3)} ± ${m.cv_auc_sd.toFixed(3)}</td><td>${m.ks.toFixed(3)}</td><td>${m.brier.toFixed(3)}</td></tr>`;
    }).join("");

    // Gains curve, drawn as you scroll
    const el = $("#c-gains"), small = el.clientWidth < 520, w = small ? Math.max(330, el.clientWidth) : 720, h = small ? 300 : 330, m = { t: 12, r: small ? 16 : 132, b: 40, l: 44 };
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
    const paths = [["Logistic regression", "ln-base"], ["XGBoost", "ln-model"]].map(([nm, cls]) => {
      const pts = xs.map((v, i) => [v, credit.gains[nm][i]]);
      const p = svg.append("path").attr("class", cls).attr("d", line(pts));
      const endY = y(pts[pts.length - 1][1]);
      return { p, nm, cls, pts };
    });
    const cap = M.XGBoost.top20_capture;
    svg.append("line").attr("class", "marker").attr("x1", x(0.2)).attr("x2", x(0.2)).attr("y1", y(0)).attr("y2", y(cap)).attr("stroke-dasharray", "2 3");
    const capDot = svg.append("circle").attr("class", "dot").attr("cx", x(0.2)).attr("cy", y(cap)).attr("r", 4.5);
    const capText = svg.append("text").attr("class", "val").attr("x", x(0.2) + 10).attr("y", y(cap) + 18).text(`20% called, ${pct(cap, 0)} of defaults reached`);
    svg.append("text").attr("class", "lbl").attr("x", x(0.5) - 14).attr("y", y(credit.gains.XGBoost[5]) - 14).attr("text-anchor", "end").style("fill", "var(--model)").style("font-weight", 600).text("XGBoost");
    svg.append("text").attr("class", "lbl").attr("x", small ? x(1) : x(0.8) + 4).attr("text-anchor", small ? "end" : "start").attr("y", y(credit.gains["Logistic regression"][8]) + 24).text("Logistic regression");
    if (!small) svg.append("text").attr("class", "lbl").attr("x", x(0.66)).attr("y", y(0.5)).text("Random");
    if (hasGsap && !reduce) {
      paths.forEach(({ p }) => { const L = p.node().getTotalLength(); p.attr("stroke-dasharray", L).attr("stroke-dashoffset", L); });
      gsap.set([capDot.node(), capText.node()], { opacity: 0 });
      ScrollTrigger.create({
        trigger: el, start: "top 80%", end: "top 30%", scrub: 0.5,
        onUpdate: (self) => {
          paths.forEach(({ p }) => { const L = p.node().getTotalLength(); p.attr("stroke-dashoffset", L * (1 - self.progress)); });
          const show = self.progress > 0.35 ? 1 : 0;
          capDot.style("opacity", show); capText.style("opacity", show);
        },
      });
    }

    // Calibration
    const ce = $("#c-calib"), cw = 360, ch = 330, cm = { t: 10, r: 14, b: 40, l: 44 };
    const cs = svgFor(ce, cw, ch).attr("aria-label", "Calibration: predicted and actual default rates fall close to the diagonal in all ten bands.");
    const cx = d3.scaleLinear([0, 0.8], [cm.l, cw - cm.r]), cy = d3.scaleLinear([0, 0.8], [ch - cm.b, cm.t]);
    const ct = [0, 0.2, 0.4, 0.6, 0.8];
    cs.append("g").attr("class", "grid").selectAll("line").data(ct).join("line").attr("x1", cm.l).attr("x2", cw - cm.r).attr("y1", cy).attr("y2", cy);
    cs.append("g").selectAll("text").data(ct).join("text").attr("x", cm.l - 8).attr("y", cy).attr("dy", "0.35em").attr("text-anchor", "end").text((d) => Math.round(d * 100) + "%");
    cs.append("g").selectAll("text").data(ct).join("text").attr("x", cx).attr("y", ch - cm.b + 20).attr("text-anchor", "middle").text((d) => Math.round(d * 100) + "%");
    cs.append("text").attr("x", (cm.l + cw - cm.r) / 2).attr("y", ch - 2).attr("text-anchor", "middle").text("Predicted risk");
    cs.append("line").attr("class", "ln-rand").attr("x1", cx(0)).attr("y1", cy(0)).attr("x2", cx(0.8)).attr("y2", cy(0.8));
    const cpts = cs.append("path").attr("class", "ln-model").attr("d", d3.line().x((d) => cx(d.predicted)).y((d) => cy(d.actual))(credit.calibration));
    const dots = cs.append("g").selectAll("circle").data(credit.calibration).join("circle").attr("class", "dot").attr("r", 4.5)
      .attr("cx", (d) => cx(d.predicted)).attr("cy", (d) => cy(d.actual));
    dots.append("title").text((d) => `Predicted ${pct(d.predicted)}, actual ${pct(d.actual)}`);
    onEnter(ce, (instant) => { drawLine(cpts, instant); if (!instant) dots.attr("r", 0).transition().delay((d, i) => 200 + i * 90).duration(400).attr("r", 4.5); });

    // SHAP importance
    hbars($("#c-shap"), credit.shap_top.slice(0, 6).map((d, i) => ({ label: d.feature.replace(" (months)", ""), v: d.importance, cls: i < 3 ? "bar" : "bar-mute" })),
      { w: 520, labelW: 230, fmt: (v) => v.toFixed(2), aria: "SHAP importance: last month's repayment status, worst delay and months late matter most.", rowH: 32 });

    // Reason card
    const ex = credit.reason_example;
    if (ex) {
      const say = (r) => {
        const f = r.feature, v = r.value;
        if (f.startsWith("Worst delay")) return `Worst delay in the last six months: ${v} months`;
        if (f.startsWith("Months late")) return `Late in ${v} of the last six months`;
        if (f.startsWith("Payment,")) return `${f.replace("Payment, ", "Paid ")}: NT$${fmtInt(v)}`;
        if (f.startsWith("Repayment status")) return `${f.replace("Repayment status, ", "Status ")}: ${v > 0 ? v + " month" + (v > 1 ? "s" : "") + " late" : v === 0 ? "paid the minimum" : "paid in full"}`;
        return `${f}: ${fmtInt(v)}`;
      };
      const maxS = d3.max(ex.reasons, (r) => Math.abs(r.shap));
      const reasons = ex.reasons.slice(0, 5);
      $("#reason-card").innerHTML = `
        <header><span class="who">Customer ${ex.customer_id}</span><span class="score">Score ${pct(ex.score, 0)}, flagged for a call</span></header>
        <ul>${reasons.map((r) => {
          const up = r.shap > 0;
          return `<li class="${up ? "up" : "down"}"><span class="dir" aria-hidden="true">${up ? "+" : "−"}</span><span style="color:var(--ink)">${say(r)} <span class="sr-only">${up ? "raises" : "lowers"} risk</span></span><span class="w" style="width:${Math.round(64 * Math.abs(r.shap) / maxS)}px"></span></li>`;
        }).join("")}</ul>
        <p style="font-size:14px;color:var(--ink-3)">+ raises the risk, − lowers it. Bar length is the size of the effect.</p>`;
    }
  }

  /* ---------- Mini charts for other work ---------- */
  const minis = {
    churn(el) {
      const d = S.churn.deciles, w = 440, h = 200, m = { t: 22, b: 30, l: 4, r: 4 };
      const svg = svgFor(el, w, h).attr("aria-label", "Churn rate falls from 73% in the riskiest decile to under 5% in the safest.");
      const x = d3.scaleBand(d.map((r) => r.decile), [m.l, w - m.r]).padding(0.28), y = d3.scaleLinear([0, 80], [h - m.b, m.t]);
      const bars = svg.selectAll("rect").data(d).join("rect").attr("class", (r) => (r.decile <= 2 ? "bar" : "bar-mute"))
        .attr("x", (r) => x(r.decile)).attr("width", x.bandwidth()).attr("y", (r) => y(r.churn_rate)).attr("height", (r) => y(0) - y(r.churn_rate)).attr("rx", 2);
      svg.selectAll(".v").data(d.filter((r) => r.decile <= 2)).join("text").attr("class", "val").attr("text-anchor", "middle")
        .attr("x", (r) => x(r.decile) + x.bandwidth() / 2).attr("y", (r) => y(r.churn_rate) - 6).text((r) => Math.round(r.churn_rate) + "%");
      svg.selectAll(".t").data(d).join("text").attr("text-anchor", "middle").attr("x", (r) => x(r.decile) + x.bandwidth() / 2).attr("y", h - 10).text((r) => r.decile);
      onEnter(el, (i) => growBars(bars, false, i));
    },
    ab(el) {
      const rows = S.ab.retention.filter((r) => r.metric === "retention_7"), w = 440, h = 150, m = { l: 112, r: 50 };
      const svg = svgFor(el, w, h).attr("aria-label", "7-day retention: 19.0% with the gate at level 30, 18.2% at level 40; the confidence intervals do not overlap.");
      const x = d3.scaleLinear([17.5, 19.75], [m.l, w - m.r]);
      const ticks = [17.5, 18, 18.5, 19, 19.5];
      svg.append("g").attr("class", "grid").selectAll("line").data(ticks).join("line").attr("x1", x).attr("x2", x).attr("y1", 10).attr("y2", h - 30);
      svg.append("g").selectAll("text").data(ticks).join("text").attr("x", x).attr("y", h - 10).attr("text-anchor", "middle").text((d) => d + "%");
      const g = svg.selectAll(".r").data(rows).join("g").attr("transform", (d, i) => `translate(0,${36 + i * 46})`);
      g.append("text").attr("class", "lbl").attr("y", 0).attr("dy", "0.35em").text((d) => (d.version === "gate_30" ? "Gate at level 30" : "Gate at level 40"));
      const ci = g.append("line").attr("stroke", (d) => (d.version === "gate_30" ? "var(--model)" : "var(--base)")).attr("stroke-width", 2.5)
        .attr("x1", (d) => x(d.ci_low_pct)).attr("x2", (d) => x(d.ci_high_pct));
      g.append("circle").attr("r", 5.5).attr("cx", (d) => x(d.rate_pct)).style("fill", (d) => (d.version === "gate_30" ? "var(--model)" : "var(--base)"));
      g.append("text").attr("class", "val").attr("x", (d) => x(d.ci_high_pct) + 8).attr("dy", "0.35em").text((d) => d.rate_pct.toFixed(1) + "%");
      onEnter(el, (instant) => { if (!instant) ci.attr("x2", (d) => x(d.rate_pct)).attr("x1", (d) => x(d.rate_pct)).transition().duration(800).attr("x1", (d) => x(d.ci_low_pct)).attr("x2", (d) => x(d.ci_high_pct)); });
    },
    deliveries(el) {
      hbars(el, S.deliveries.by_band.map((r, i) => ({ label: r.band, v: r.avg_review, cls: i === 0 ? "bar-mute" : "bar-risk" })),
        { max: 5, labelW: 140, fmt: (v) => v.toFixed(2) + " stars", aria: "Average review falls from 4.29 stars on time to 1.70 stars when eight or more days late." });
    },
    retail(el) {
      hbars(el, S.retail.rfm_segments.slice(0, 5).map((r, i) => ({ label: r.segment, v: r.revenue_share_pct, cls: i === 0 ? "bar" : "bar-mute" })),
        { labelW: 150, fmt: (v) => v.toFixed(0) + "%", aria: "Champions are 14% of customers and 45% of revenue." });
    },
    nsl(el) {
      const r = S.nsl.recall_by_category_pct;
      hbars(el, [["Denial of service", r.DoS], ["Probing", r.Probe], ["Remote to local", r.R2L], ["User to root", r.U2R]].map(([label, v], i) => ({ label, v, cls: i < 2 ? "bar" : "bar-risk" })),
        { max: 100, labelW: 140, fmt: (v) => v.toFixed(0) + "%", aria: "Detection rate by attack type: high for denial of service and probing, very low for remote-to-local and user-to-root." });
    },
    house(el) {
      const d = S.house.series.map((p) => ({ year: +p.q.slice(0, 4) + (+p.q.slice(-1) - 1) / 4, price: p.price }));
      const w = 440, h = 210, m = { t: 10, r: 10, b: 28, l: 52 };
      const svg = svgFor(el, w, h).attr("aria-label", "UK average house price on a log scale from about £1,900 in 1953 to about £270,000.");
      const x = d3.scaleLinear(d3.extent(d, (p) => p.year), [m.l, w - m.r]), y = d3.scaleLog([1000, 400000], [h - m.b, m.t]);
      const yt = [1000, 10000, 100000];
      svg.append("g").attr("class", "grid").selectAll("line").data(yt).join("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y);
      svg.append("g").selectAll("text").data(yt).join("text").attr("x", m.l - 8).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").text((v) => "£" + d3.format("~s")(v).replace("k", "k"));
      svg.append("g").selectAll("text").data([1960, 1980, 2000, 2020]).join("text").attr("x", x).attr("y", h - 8).attr("text-anchor", "middle").text((v) => v);
      (S.house.downturns || []).forEach((dt) => {
        const yr = (q) => +q.slice(0, 4) + (+q.slice(-1) - 1) / 4;
        const end = /^\d{4} Q\d$/.test(dt.recovered || "") ? yr(dt.recovered) : d[d.length - 1].year;
        svg.insert("rect", ":first-child").attr("x", x(yr(dt.peak))).attr("width", x(end) - x(yr(dt.peak))).attr("y", m.t).attr("height", h - m.b - m.t)
          .style("fill", "var(--risk)").style("opacity", 0.14);
      });
      const p = svg.append("path").attr("class", "ln-model").attr("d", d3.line().x((v) => x(v.year)).y((v) => y(v.price))(d));
      onEnter(el, (instant) => drawLine(p, instant));
    },
  };
  $$("[data-mini]").forEach((el) => { try { minis[el.dataset.mini](el); } catch (e) { console.warn("chart", el.dataset.mini, e); } });

  if (hasGsap) window.addEventListener("load", () => ScrollTrigger.refresh());
})();
