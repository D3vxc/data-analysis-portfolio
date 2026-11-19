/* The front page is static by design: no canvas, no scroll library, no charts. The only
   script work is binding the few numbers in the list to the generated site data, so the
   homepage obeys the same rule as the rest of the site and nothing is typed in by hand. */
(function () {
  "use strict";
  const S = window.SITE_DATA || {};
  const pct = (v, d) => (v * 100).toFixed(d === undefined ? 0 : d) + "%";

  const credit = S.credit || {}, churn = S.churn || {}, nsl = S.nsl || {}, ids = S.ids || {};
  const xgb = credit.models && credit.models.XGBoost;
  const H = ids.headline || {};

  const bind = {
    // The dissertation's finding is that the hybrid ties its own baseline. Showing the +0.020
    // cold-start gain here would read as a win, so the two numbers that make the point go instead.
    idsGain: H.hybrid_auc != null && H.supervised_auc != null
      ? (+H.hybrid_auc).toFixed(4) + " vs " + (+H.supervised_auc).toFixed(4) : null,
    creditCapture: xgb ? pct(xgb.top20_capture) + " caught" : null,
    churnCapture: churn.targeting && churn.targeting.top20_share_of_churners_pct != null
      ? churn.targeting.top20_share_of_churners_pct.toFixed(1) + "%" : null,
    nslUnseen: nsl.recall_unseen_pct != null ? nsl.recall_unseen_pct.toFixed(0) + "% on new" : null,
  };
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const v = bind[el.dataset.bind];
    if (v) el.textContent = v;
  });

  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
