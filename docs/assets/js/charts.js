/* Small SVG chart helpers: vertical bars (grouped, with optional error bars),
   paired horizontal bars, and a line chart (linear or log). Colours come from CSS tokens,
   so charts follow the light/dark theme. Every mark has a hover tooltip. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const color = (c) => (c && c.startsWith("--") ? css(c) : c);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const text = (parent, x, y, str, attrs = {}) => { const t = el("text", { x, y, ...attrs }, parent); t.textContent = str; return t; };

  /* tooltip */
  const tip = document.getElementById("tip");
  function showTip(html, x, y) {
    if (!tip) return;
    tip.innerHTML = html; tip.classList.add("on");
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y - r.height - 12;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 18;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  const hideTip = () => tip && tip.classList.remove("on");
  function bindTip(node, html) {
    node.addEventListener("pointermove", (e) => showTip(typeof html === "function" ? html() : html, e.clientX, e.clientY));
    node.addEventListener("pointerleave", hideTip);
  }
  window.addEventListener("scroll", hideTip, { passive: true });

  function niceTicks(max, n = 4) {
    const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((s) => s * p).find((s) => s >= raw);
    const out = []; for (let v = 0; v <= max + step * 1e-6; v += step) out.push(+v.toFixed(10));
    if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + step).toFixed(10));
    return out;
  }
  function topRounded(svg, x, y, w, h, fill) {
    if (h <= 0) return null;
    const r = Math.min(4, w / 2, h);
    return el("path", { d: `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`, fill }, svg);
  }
  function rightRounded(svg, x, y, w, h, fill) {
    if (w <= 0) return null;
    const r = Math.min(4, h / 2, w);
    return el("path", { d: `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`, fill }, svg);
  }
  function frame(box, height) {
    box.innerHTML = "";
    const W = Math.max(280, Math.round(box.clientWidth));
    const svg = el("svg", { viewBox: `0 0 ${W} ${height}`, width: W, height }, box);
    return { svg, W, H: height };
  }

  /**
   * Vertical bars.
   * opts: categories[], series[{name, values[], color, errors?:[[lo,hi]]}], height, yMax?, yTicks?,
   *       fmt(v), tickFmt(v), valueLabels: "all"|"max"|"none", barColors?(i, si) , tooltip(i, si),
   *       ref?: {value, label}, labelEvery?, groups?: [{from, to, label}] , gapAfter?: index
   */
  function bars(box, o) {
    const { svg, W, H } = frame(box, o.height || 230);
    const m = { t: 22, r: 8, b: o.groups ? 40 : 26, l: o.left || 48 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const all = o.series.flatMap((s) => s.values.concat((s.errors || []).map((e) => e[1])));
    const ticks = o.yTicks || niceTicks((o.yMax || Math.max(...all)) * 1.05);
    const ymax = ticks[ticks.length - 1];
    const y = (v) => m.t + ih - (v / ymax) * ih;
    const fmt = o.fmt || ((v) => v), tickFmt = o.tickFmt || fmt;
    ticks.forEach((t) => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: css("--grid") }, svg);
      text(svg, m.l - 8, y(t) + 4, tickFmt(t), { "text-anchor": "end" });
    });
    const n = o.categories.length, gap = o.gapAfter != null ? 18 : 0;
    const band = (iw - gap) / n;
    const ns = o.series.length;
    const groupW = Math.min(band - 8, (o.maxBar || 56) * ns);
    const bw = groupW / ns;
    const every = o.labelEvery ? o.labelEvery(W) : 1;
    let maxI = 0, maxV = -Infinity;
    o.series[0].values.forEach((v, i) => { if (v > maxV) { maxV = v; maxI = i; } });
    const cx = (i) => m.l + i * band + (o.gapAfter != null && i > o.gapAfter ? gap : 0) + band / 2;
    o.categories.forEach((cat, i) => {
      o.series.forEach((s, si) => {
        const v = s.values[i];
        const x = cx(i) - groupW / 2 + si * bw + 1;
        const fill = color(o.barColor ? o.barColor(i, si) : s.color);
        topRounded(svg, x, y(v), bw - 2, m.t + ih - y(v), fill);
        if (s.errors) {
          const [lo, hi] = s.errors[i], ex = x + (bw - 2) / 2;
          el("line", { x1: ex, x2: ex, y1: y(lo), y2: y(hi), stroke: css("--ink-2"), "stroke-width": 1.2 }, svg);
          el("line", { x1: ex - 4, x2: ex + 4, y1: y(hi), y2: y(hi), stroke: css("--ink-2"), "stroke-width": 1.2 }, svg);
          el("line", { x1: ex - 4, x2: ex + 4, y1: y(lo), y2: y(lo), stroke: css("--ink-2"), "stroke-width": 1.2 }, svg);
        }
        const show = o.valueLabels === "all" || (o.valueLabels === "max" && si === 0 && i === maxI);
        if (show) text(svg, x + (bw - 2) / 2, y(s.errors ? s.errors[i][1] : v) - 6, fmt(v), { "text-anchor": "middle", class: "val" });
      });
      if (i % every === 0 || i === maxI) text(svg, cx(i), H - (o.groups ? 22 : 8), cat, { "text-anchor": "middle" });
      if (o.tooltip) {
        const hit = el("rect", { x: cx(i) - band / 2, y: m.t, width: band, height: ih, fill: "transparent" }, svg);
        bindTip(hit, o.tooltip(i));
      }
    });
    if (o.ref) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(o.ref.value), y2: y(o.ref.value), stroke: css("--series-2"), "stroke-width": 1.5, "stroke-dasharray": "5 4" }, svg);
      text(svg, W - m.r, y(o.ref.value) - 6, o.ref.label, { "text-anchor": "end", class: "val" });
    }
    (o.groups || []).forEach((g) => text(svg, (cx(g.from) + cx(g.to)) / 2, H - 4, g.label, { "text-anchor": "middle", style: "font-size:10.5px" }));
    el("line", { x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih, stroke: css("--ink-3") }, svg);
  }

  /** Paired horizontal bars: rows[{label, a, b}] , a/b colours, tooltip(i), xMax */
  function pairs(box, o) {
    const W0 = Math.max(280, Math.round(box.clientWidth));
    const row = 30, m = { t: 6, r: 48, b: 22, l: W0 < 440 ? 118 : 138 };
    const { svg, W, H } = frame(box, m.t + m.b + row * o.rows.length);
    const iw = W - m.l - m.r, x = (v) => m.l + (v / o.xMax) * iw;
    for (let t = 0; t <= o.xMax; t += o.xStep) {
      el("line", { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, stroke: css("--grid") }, svg);
      text(svg, x(t), H - 6, t + "%", { "text-anchor": "middle" });
    }
    const bh = 10;
    o.rows.forEach((r, i) => {
      const yc = m.t + i * row + row / 2;
      text(svg, m.l - 10, yc + 4, r.label, { "text-anchor": "end", class: "cat" });
      rightRounded(svg, m.l, yc - bh - 1, Math.max(1, x(r.a) - m.l), bh, color(o.colorA));
      rightRounded(svg, m.l, yc + 1, Math.max(1, x(r.b) - m.l), bh, color(o.colorB));
      if (i === 0) {
        text(svg, x(r.a) + 6, yc - 2, r.a + "%", { class: "val" });
        text(svg, x(r.b) + 6, yc + bh, r.b + "%", { class: "val" });
      }
      const hit = el("rect", { x: 0, y: m.t + i * row, width: W, height: row, fill: "transparent" }, svg);
      bindTip(hit, o.tooltip(i));
    });
    el("line", { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, stroke: css("--ink-3") }, svg);
  }

  /**
   * Line chart. points[{x:number, y:number, label}], log?: bool, yMin, yMax, yTicks[], tickFmt,
   * xTicks[{x, label}], shades[{from, to}], tooltip(p), endLabel?, startLabel?, markers?: bool, annotate?: [indices]
   */
  function line(box, o) {
    const { svg, W, H } = frame(box, o.height || 250);
    const m = { t: 18, r: 12, b: 26, l: o.left || 50 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const xs = o.points.map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const x = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * iw;
    const f = o.log ? Math.log10 : (v) => v;
    const lo = f(o.yMin), hi = f(o.yMax);
    const y = (v) => m.t + ih - ((f(v) - lo) / (hi - lo)) * ih;
    (o.shades || []).forEach((s) => el("rect", { x: x(s.from), y: m.t, width: Math.max(2, x(s.to) - x(s.from)), height: ih, fill: css("--shade") }, svg));
    o.yTicks.forEach((t) => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: css("--grid") }, svg);
      text(svg, m.l - 8, y(t) + 4, o.tickFmt(t), { "text-anchor": "end" });
    });
    const xt = typeof o.xTicks === "function" ? o.xTicks(W) : o.xTicks;
    xt.forEach((t) => {
      text(svg, x(t.x), H - 7, t.label, { "text-anchor": "middle" });
      el("line", { x1: x(t.x), x2: x(t.x), y1: m.t + ih, y2: m.t + ih + 4, stroke: css("--ink-3") }, svg);
    });
    el("line", { x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih, stroke: css("--ink-3") }, svg);
    const d = o.points.map((p, i) => (i ? "L" : "M") + x(p.x).toFixed(1) + "," + y(p.y).toFixed(1)).join("");
    el("path", { d, fill: "none", stroke: css("--series-1"), "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
    if (o.markers) o.points.forEach((p) => el("circle", { cx: x(p.x), cy: y(p.y), r: 3, fill: css("--series-1") }, svg));
    (o.annotate || []).forEach((i) => {
      const p = o.points[i];
      el("circle", { cx: x(p.x), cy: y(p.y), r: 4.5, fill: css("--series-1"), stroke: css("--panel"), "stroke-width": 2 }, svg);
      text(svg, x(p.x), y(p.y) - 10, o.annotateFmt(p), { "text-anchor": "middle", class: "val" });
    });
    if (o.endLabel) {
      const p = o.points[o.points.length - 1];
      el("circle", { cx: x(p.x), cy: y(p.y), r: 4, fill: css("--series-1"), stroke: css("--panel"), "stroke-width": 2 }, svg);
      text(svg, x(p.x) - 6, y(p.y) + 18, o.endLabel(p), { "text-anchor": "end", class: "val" });
    }
    if (o.startLabel) {
      const p = o.points[0];
      text(svg, x(p.x) + 4, y(p.y) - 8, o.startLabel(p), { class: "val" });
    }
    const vline = el("line", { y1: m.t, y2: m.t + ih, stroke: css("--ink-3"), "stroke-dasharray": "3 3", opacity: 0 }, svg);
    const dot = el("circle", { r: 4.5, fill: css("--series-1"), stroke: css("--panel"), "stroke-width": 2, opacity: 0 }, svg);
    const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
      const t = x0 + ((px - m.l) / iw) * (x1 - x0);
      let best = o.points[0];
      for (const p of o.points) if (Math.abs(p.x - t) < Math.abs(best.x - t)) best = p;
      vline.setAttribute("x1", x(best.x)); vline.setAttribute("x2", x(best.x)); vline.setAttribute("opacity", 1);
      dot.setAttribute("cx", x(best.x)); dot.setAttribute("cy", y(best.y)); dot.setAttribute("opacity", 1);
      showTip(o.tooltip(best), e.clientX, e.clientY);
    });
    hit.addEventListener("pointerleave", () => { hideTip(); vline.setAttribute("opacity", 0); dot.setAttribute("opacity", 0); });
  }

  window.Charts = { bars, pairs, line };
})();
