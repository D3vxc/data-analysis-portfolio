/* A funny-scary pop-up for visitors who open the developer tools.
   Triggers on the usual shortcuts, or when the window's inner size shrinks the way a docked
   devtools panel makes it. Shows once per visit, closes with the button or Esc. Blocks nothing. */
(function () {
  "use strict";
  const KEY = "peek-shown";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let shown = false;
  try { shown = sessionStorage.getItem(KEY) === "1"; } catch (_) {}

  const lines = [
    "dev_mistri=# SELECT * FROM visitors WHERE curious = TRUE;",
    "",
    " visitor | intent        | status",
    "---------+---------------+-----------",
    " you     | inspecting... | SPOTTED",
    "(1 row)",
  ];

  function open() {
    if (shown || document.getElementById("peek")) return;
    shown = true;
    try { sessionStorage.setItem(KEY, "1"); } catch (_) {}

    const el = document.createElement("div");
    el.id = "peek";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "peek-title");
    el.innerHTML = `
      <div class="peek-box">
        <svg class="peek-eye" viewBox="0 0 120 64" aria-hidden="true">
          <path d="M4 32 C 28 4, 92 4, 116 32 C 92 60, 28 60, 4 32 Z" fill="none" stroke="currentColor" stroke-width="3"/>
          <circle class="peek-iris" cx="60" cy="32" r="15" fill="currentColor"/>
          <circle class="peek-pupil" cx="60" cy="32" r="6"/>
          <rect class="peek-lid" x="0" y="0" width="120" height="0"/>
        </svg>
        <h2 id="peek-title" class="peek-title" data-text="I SEE YOU.">I SEE YOU.</h2>
        <pre class="peek-term" aria-hidden="true"></pre>
        <p class="peek-copy">Opening the inspector on a data scientist's portfolio? Bold. Everything here is © Dev Mistri, so look all you like, but please don't copy it.</p>
        <p class="peek-copy peek-small">Your curiosity has been logged. (It hasn't. But it could have been.)</p>
        <div class="peek-actions">
          <button type="button" class="peek-btn" id="peek-close">I was only looking</button>
          <a class="peek-link" href="index.html#contact" id="peek-hire">Actually, I'm hiring</a>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add("peek-open");

    const term = el.querySelector(".peek-term");
    const text = lines.join("\n");
    if (reduce) term.textContent = text;
    else {
      let i = 0;
      const tick = () => { term.textContent = text.slice(0, i); i += 2; if (i <= text.length + 1) setTimeout(tick, 18); };
      setTimeout(tick, 650);
    }

    // The eye follows the cursor, and blinks now and then.
    const iris = el.querySelector(".peek-iris"), pupil = el.querySelector(".peek-pupil"), eye = el.querySelector(".peek-eye");
    const follow = (e) => {
      const r = eye.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
      const x = 60 + (dx / d) * 22 * k, y = 32 + (dy / d) * 9 * k;
      iris.setAttribute("cx", x); iris.setAttribute("cy", y); pupil.setAttribute("cx", x); pupil.setAttribute("cy", y);
    };
    if (!reduce) window.addEventListener("pointermove", follow);
    const lid = el.querySelector(".peek-lid");
    const blink = reduce ? null : setInterval(() => {
      lid.animate([{ height: "0px" }, { height: "64px" }, { height: "0px" }], { duration: 220, easing: "ease-in-out" });
    }, 3200);

    const btn = el.querySelector("#peek-close");
    const close = () => {
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("keydown", onKey, true);
      if (blink) clearInterval(blink);
      el.classList.add("peek-leaving");
      setTimeout(() => { el.remove(); document.documentElement.classList.remove("peek-open"); }, reduce ? 0 : 260);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") { // keep focus inside the dialog
        const f = [btn, el.querySelector("#peek-hire")];
        const i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    };
    btn.addEventListener("click", close);
    el.querySelector("#peek-hire").addEventListener("click", close);
    window.addEventListener("keydown", onKey, true);
    setTimeout(() => btn.focus(), 50);
  }

  // 1. Keyboard shortcuts: F12, Ctrl+Shift+I/J/C, Cmd+Option+I/J/C, Ctrl/Cmd+U (view source)
  window.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "F12" || (mod && (e.shiftKey || e.altKey) && ["i", "j", "c"].includes(k)) || (mod && k === "u")) open();
  });

  // 2. A docked devtools panel shrinks the page but not the window. Desktop only, and it must
  //    persist across two checks, so zooming or a passing resize does not trigger it.
  if (window.matchMedia("(pointer: fine)").matches) {
    const gap = () => Math.max(window.outerWidth - window.innerWidth, window.outerHeight - window.innerHeight);
    const base = gap();
    let strikes = 0;
    setInterval(() => {
      if (shown) return;
      strikes = gap() - base > 160 ? strikes + 1 : 0;
      if (strikes >= 2) open();
    }, 1000);
  }

  window.__peek = open; // handy for testing: __peek()
})();
