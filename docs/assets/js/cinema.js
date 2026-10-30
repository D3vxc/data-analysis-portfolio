/* Cinematic layer for the portfolio: blade-cut intro, letterbox wipes on in-page jumps,
   and scroll reveals that land with a small settle shake. Styles live in assets/css/cinema.css.
   Skipped entirely for prefers-reduced-motion. The intro plays once per browser session,
   can be skipped with a click or any key, and never plays on a deep link (#section). */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  const root = document.documentElement;
  root.classList.add("cine");

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const shake = (el) => {
    if (!el) return;
    el.classList.remove("cine-shake"); void el.offsetWidth; el.classList.add("cine-shake");
    el.addEventListener("animationend", () => el.classList.remove("cine-shake"), { once: true });
  };
  const hero = document.querySelector(".hero");

  /* ---------- intro ---------- */
  function playIntro() {
    const el = document.createElement("div");
    el.className = "intro";
    el.setAttribute("aria-hidden", "true");
    const title = '<span>Dev Mistri<small>Data Analyst · Birmingham</small></span>';
    el.innerHTML =
      '<i class="intro-bar t"></i><i class="intro-bar b"></i>' +
      '<div class="intro-stage"><div class="intro-half top">' + title + '</div><div class="intro-half bot">' + title + "</div>" +
      '<i class="intro-blade"></i></div><i class="intro-flash"></i>' +
      '<button class="intro-skip" type="button" tabindex="-1">Skip</button>';
    document.body.appendChild(el);
    root.style.overflow = "hidden";

    let done = false;
    const timers = [];
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      el.classList.add("out");
      root.style.overflow = "";
      if (hero) { hero.classList.add("cine-land"); shake(hero); }
      setTimeout(() => el.remove(), 750);
      removeEventListener("keydown", finish);
    };
    timers.push(setTimeout(() => el.classList.add("cut"), 1080));
    timers.push(setTimeout(finish, 1900));
    el.addEventListener("click", finish);
    addEventListener("keydown", finish);
    store.set("cineIntro", "1");
  }

  if (!location.hash && !store.get("cineIntro") && hero) playIntro();

  /* ---------- letterbox wipe on in-page jumps ---------- */
  const lbox = document.createElement("div");
  lbox.className = "lbox"; lbox.setAttribute("aria-hidden", "true");
  lbox.innerHTML = "<i></i><i></i>";
  document.body.appendChild(lbox);
  let busy = false;

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || busy || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = a.getAttribute("href").slice(1);
    const target = id === "top" ? document.body : document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    busy = true;
    lbox.className = "lbox close";
    setTimeout(() => {
      // jump instantly while the screen is covered
      root.style.scrollBehavior = "auto";
      if (id === "top") scrollTo(0, 0); else target.scrollIntoView({ block: "start" });
      root.style.scrollBehavior = "";
      history.pushState(null, "", "#" + id);
      target.querySelectorAll(".reveal").forEach((n) => n.classList.add("in"));
      lbox.className = "lbox open";
      shake(id === "top" ? hero : target);
      const focusable = id === "top" ? null : target;
      if (focusable) { focusable.setAttribute("tabindex", "-1"); focusable.focus({ preventScroll: true }); }
      setTimeout(() => { lbox.className = "lbox"; busy = false; }, 520);
    }, 340);
  });

  /* ---------- scroll reveals ---------- */
  const groups = [
    ".section-head", ".filters", ".case-card", ".case-head", ".case-grid > *",
    ".about .wrap > *", ".resume-band .wrap > *", ".contact .wrap > *",
  ];
  const nodes = document.querySelectorAll(groups.join(","));
  nodes.forEach((n) => n.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) { nodes.forEach((n) => n.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.filter((en) => en.isIntersecting).forEach((en) => {
      const n = en.target;
      io.unobserve(n);
      const delay = Math.min(i++ * 80, 320);
      setTimeout(() => {
        n.classList.add("in");
        // headings land with a small settle; everything else just glides in
        if (n.matches(".case-head, .section-head")) setTimeout(() => shake(n), 420);
      }, delay);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  nodes.forEach((n) => io.observe(n));
})();
