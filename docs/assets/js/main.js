/* Page wiring: KPI tiles, tables, charts, skill filter. Data comes from data/site-data.js. */
(function () {
  const D = window.SITE_DATA;
  const $ = (s) => document.querySelector(s);
  const gbp = (v) => "£" + Math.round(v).toLocaleString("en-GB");
  const gbpK = (v) => "£" + Math.round(v / 1000).toLocaleString("en-GB") + "k";
  const usd = (v) => "$" + Math.round(v).toLocaleString("en-GB");
  const pct = (v, d = 1) => v.toFixed(d) + "%";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = (ym) => { const [y, m] = ym.split("-"); return MONTHS[+m - 1] + " " + y; };
  const shortMonth = (ym, i) => { const [y, m] = ym.split("-"); return MONTHS[+m - 1] + (m === "01" || i === 0 ? " " + y.slice(2) : ""); };
  const kpis = (sel, items) => { $(sel).innerHTML = items.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join(""); };

  /* ---------- static content ---------- */
  const ck = D.churn.kpis;
  kpis("#churn-kpis", [
    [pct(ck.churn_rate_pct), "of customers left last month"],
    [usd(ck.monthly_revenue_lost), "monthly revenue lost"],
    [D.churn.targeting.auc.toFixed(3), "ROC AUC on held-out customers"],
  ]);

  const rk = D.retail.kpis;
  kpis("#retail-kpis", [
    ["£" + (rk.revenue / 1e6).toFixed(2) + "m", "revenue, 12 months"],
    [rk.orders.toLocaleString("en-GB"), "orders"],
    [rk.customers.toLocaleString("en-GB"), "identified customers"],
    [gbp(rk.median_order_value), "median order"],
  ]);

  const t = D.ab.tests;
  $("#ab-table").innerHTML =
    "<thead><tr><th>Metric</th><th>Difference</th><th>95% CI</th><th>p</th></tr></thead><tbody>" +
    [["Back after 1 day", t.retention_1], ["Back after 7 days", t.retention_7]].map(([name, r]) =>
      `<tr><td>${name}</td><td class="n">${r.diff_pp > 0 ? "+" : ""}${r.diff_pp.toFixed(2)} pp</td><td class="n">${r.ci_low_pp.toFixed(2)} to ${r.ci_high_pp.toFixed(2)}</td><td class="n">${r.p_value < 0.01 ? r.p_value.toFixed(3) : r.p_value.toFixed(3)}</td></tr>`).join("") +
    `<tr><td>Sample ratio (chi-square)</td><td class="n">${D.ab.srm.gate_30_share_pct}% / ${(100 - D.ab.srm.gate_30_share_pct).toFixed(2)}%</td><td>—</td><td class="n">${D.ab.srm.p_value.toFixed(3)}</td></tr></tbody>`;

  const log = D.retail.cleaning_log;
  const stepNames = {
    "Raw data": "Raw invoice lines", "Remove exact duplicate rows": "Exact duplicates", "Set aside cancellations": "Cancellations (kept separately)",
    "Remove postage, fees and manual adjustments": "Postage, fees, manual adjustments", "Remove zero/negative quantity or price": "Zero or negative quantity/price",
  };
  $("#cleanlog").innerHTML = log.map((r, i) =>
    `<tr><td>${stepNames[r.step] || r.step}</td><td>${r.rows_remaining.toLocaleString("en-GB")}</td><td>${i ? "−" + r.rows_removed.toLocaleString("en-GB") : ""}</td></tr>`).join("") +
    `<tr><td>Clean product sales lines</td><td>${log[log.length - 1].rows_remaining.toLocaleString("en-GB")}</td><td></td></tr>`;

  $("#downturns").innerHTML =
    "<thead><tr><th>Peak</th><th>Trough</th><th>Fall</th><th>Back to peak</th></tr></thead><tbody>" +
    D.house.downturns.map((d) => `<tr><td class="n">${d.peak}</td><td class="n">${d.trough}</td><td class="n">${d.fall_pct.toFixed(1)}%</td><td>${
      d.years_to_recover ? `<span class="n">${d.recovered}</span> · ${d.years_to_recover} yrs` : '<span class="pill">not yet</span>'}</td></tr>`).join("") + "</tbody>";

  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- skill filter ---------- */
  const chips = document.querySelectorAll(".chip[data-filter]");
  chips.forEach((chip) => chip.addEventListener("click", () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    document.querySelectorAll("[data-tags]").forEach((node) => {
      node.hidden = f !== "all" && !node.dataset.tags.split(" ").includes(f);
    });
    drawAll();
  }));

  /* ---------- charts ---------- */
  function drawAll() {
    const visible = (id) => { const n = document.getElementById(id); return n && n.offsetParent !== null; };

    if (visible("chart-churn-tenure")) {
      const rows = D.churn.by_tenure;
      Charts.bars($("#chart-churn-tenure"), {
        categories: rows.map((r) => r.group.replace(" months", "m").replace(" years", "y")),
        series: [{ values: rows.map((r) => r.churn_rate), color: "--series-1" }],
        height: 210, yTicks: [0, 20, 40, 60], fmt: (v) => Math.round(v) + "%", valueLabels: "all",
        tooltip: (i) => `<b>${rows[i].group}</b><br>${rows[i].churn_rate}% churned<br>${rows[i].customers.toLocaleString("en-GB")} customers<br>${usd(rows[i].monthly_revenue_lost)} a month lost`,
      });
    }
    if (visible("chart-churn-deciles")) {
      const dec = D.churn.deciles;
      Charts.bars($("#chart-churn-deciles"), {
        categories: dec.map((d) => String(d.decile)),
        series: [{ values: dec.map((d) => d.churn_rate), color: "--series-1" }],
        height: 210, yTicks: [0, 20, 40, 60, 80], fmt: (v) => Math.round(v) + "%", valueLabels: "max", maxBar: 34,
        ref: { value: D.churn.targeting.base_churn_rate_pct, label: "average " + D.churn.targeting.base_churn_rate_pct + "%" },
        tooltip: (i) => `<b>Risk decile ${dec[i].decile}</b><br>${dec[i].churn_rate}% actually churned<br>${dec[i].cum_share}% of all churners found by here`,
      });
    }
    if (visible("chart-ab")) {
      const r = D.ab.retention;
      const get = (metric, v) => r.find((x) => x.metric === metric && x.version === v);
      const series = ["gate_30", "gate_40"].map((v, si) => ({
        name: v, color: si ? "--series-2" : "--series-1",
        values: ["retention_1", "retention_7"].map((m) => get(m, v).rate_pct),
        errors: ["retention_1", "retention_7"].map((m) => [get(m, v).ci_low_pct, get(m, v).ci_high_pct]),
      }));
      Charts.bars($("#chart-ab"), {
        categories: ["Back after 1 day", "Back after 7 days"], series, height: 220, yTicks: [0, 10, 20, 30, 40, 50],
        fmt: (v) => v.toFixed(1) + "%", tickFmt: (v) => v + "%", valueLabels: "all", maxBar: 60,
        tooltip: (i) => { const m = i ? "retention_7" : "retention_1"; const a = get(m, "gate_30"), b = get(m, "gate_40");
          return `<b>${i ? "Back after 7 days" : "Back after 1 day"}</b><br>Level 30: ${a.rate_pct}% (${a.ci_low_pct}–${a.ci_high_pct})<br>Level 40: ${b.rate_pct}% (${b.ci_low_pct}–${b.ci_high_pct})`; },
      });
    }
    if (visible("chart-del-band")) {
      const b = D.deliveries.by_band;
      Charts.bars($("#chart-del-band"), {
        categories: b.map((x) => x.band.replace("On time or early", "On time").replace(" days late", "d late")),
        series: [{ values: b.map((x) => x.avg_review), color: "--series-1" }],
        barColor: (i) => (i ? "--series-2" : "--series-1"),
        height: 210, yTicks: [0, 1, 2, 3, 4, 5], fmt: (v) => v.toFixed(2), tickFmt: (v) => v + "★", valueLabels: "all",
        tooltip: (i) => `<b>${b[i].band}</b><br>${b[i].avg_review.toFixed(2)} stars average<br>${b[i].one_star_pct.toFixed(1)}% one-star<br>${b[i].orders.toLocaleString("en-GB")} reviewed orders`,
      });
    }
    if (visible("chart-del-month")) {
      const mo = D.deliveries.monthly;
      const pts = mo.map((d, i) => ({ x: i, y: d.late_pct, label: d.month, orders: d.orders }));
      const peaks = [mo.findIndex((d) => d.month === "2017-11"), mo.findIndex((d) => d.month === "2018-03")];
      Charts.line($("#chart-del-month"), {
        points: pts, yMin: 0, yMax: 22, yTicks: [0, 5, 10, 15, 20], tickFmt: (v) => v + "%", height: 210, left: 40, markers: true,
        xTicks: (W) => pts.filter((p, i) => i % (W < 520 ? 6 : 3) === 0).map((p) => ({ x: p.x, label: shortMonth(p.label, p.x) })),
        annotate: peaks, annotateFmt: (p) => p.y.toFixed(1) + "%",
        tooltip: (p) => `<b>${monthName(p.label)}</b><br>${p.y.toFixed(1)}% late<br>${p.orders.toLocaleString("en-GB")} delivered orders`,
      });
    }
    if (visible("chart-retail-monthly")) {
      const mo = D.retail.monthly;
      Charts.bars($("#chart-retail-monthly"), {
        categories: mo.map((d, i) => shortMonth(d.month, i)),
        series: [{ values: mo.map((d) => d.revenue), color: "--series-1" }],
        height: 220, left: 54, fmt: gbpK, tickFmt: (v) => (v ? gbpK(v) : "£0"), valueLabels: "max",
        labelEvery: (W) => (W < 520 ? 2 : 1),
        tooltip: (i) => `<b>${monthName(mo[i].month)}</b><br>${gbp(mo[i].revenue)}<br>${mo[i].orders.toLocaleString("en-GB")} orders`,
      });
    }
    if (visible("chart-retail-rfm")) {
      const s = D.retail.rfm_segments;
      Charts.pairs($("#chart-retail-rfm"), {
        rows: s.map((r) => ({ label: r.segment, a: r.customer_share_pct, b: r.revenue_share_pct })),
        xMax: 50, xStep: 10, colorA: "--series-2", colorB: "--series-1",
        tooltip: (i) => `<b>${s[i].segment}</b><br>${s[i].customers.toLocaleString("en-GB")} customers (${s[i].customer_share_pct}%)<br>${gbp(s[i].revenue)} revenue (${s[i].revenue_share_pct}%)<br>median ${s[i].median_orders} orders, last ${Math.round(s[i].median_recency_days)} days ago`,
      });
    }
    if (visible("chart-nsl")) {
      const r = D.nsl.recall_by_category_pct;
      const names = { DoS: "Denial of service", Probe: "Scanning", R2L: "Remote access", U2R: "Privilege escalation" };
      const cats = Object.keys(r).concat(["Seen", "Unseen"]);
      const vals = Object.values(r).concat([D.nsl.recall_seen_pct, D.nsl.recall_unseen_pct]);
      const full = Object.keys(r).map((k) => names[k]).concat(["Attack types seen in training", "Attack types new in the test set"]);
      Charts.bars($("#chart-nsl"), {
        categories: cats, series: [{ values: vals, color: "--series-1" }], barColor: (i) => (i === 5 ? "--series-2" : "--series-1"),
        height: 220, left: 40, yTicks: [0, 25, 50, 75, 100], fmt: (v) => Math.round(v) + "%", tickFmt: (v) => v + "%", valueLabels: "all", gapAfter: 3, maxBar: 52,
        groups: [{ from: 0, to: 3, label: "by category" }, { from: 4, to: 5, label: "by novelty" }],
        tooltip: (i) => `<b>${full[i]}</b><br>${vals[i].toFixed(1)}% detected`,
      });
    }
    if (visible("chart-house")) {
      const tnum = (q) => { const [y, qq] = q.split(" Q"); return +y + (+qq - 1) / 4; };
      const yoy = Object.fromEntries(D.house.yoy.map((d) => [d.q, d.pct]));
      const pts = D.house.series.map((d) => ({ x: tnum(d.q), y: d.price, label: d.q }));
      const last = pts[pts.length - 1].x;
      Charts.line($("#chart-house"), {
        points: pts, log: true, yMin: 1500, yMax: 330000, yTicks: [2000, 5000, 10000, 20000, 50000, 100000, 200000],
        tickFmt: (v) => "£" + v / 1000 + "k", height: 250,
        xTicks: (W) => { const step = W < 520 ? 20 : 10, out = []; for (let y = 1960; y <= 2020; y += step) out.push({ x: y, label: String(y) }); return out; },
        shades: D.house.episodes.map((e) => ({ from: tnum(e.start), to: e.end ? tnum(e.end) : last })),
        startLabel: (p) => gbp(p.y), endLabel: (p) => gbpK(p.y),
        tooltip: (p) => `<b>${p.label}</b><br>${gbp(p.y)}${yoy[p.label] !== undefined ? `<br>${yoy[p.label] > 0 ? "+" : ""}${yoy[p.label].toFixed(1)}% on a year earlier` : ""}`,
      });
    }
  }

  drawAll();
  let lastW = document.documentElement.clientWidth, raf;
  const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawAll); };
  window.addEventListener("resize", () => { const w = document.documentElement.clientWidth; if (w !== lastW) { lastW = w; redraw(); } });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
