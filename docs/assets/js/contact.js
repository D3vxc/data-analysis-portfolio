/* SQL-console contact form. Sends the message to a Google Apps Script web app,
   which stores it in a Google Sheet and emails Dev. */
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const cfg = window.SITE_CONFIG || {};
  const out = document.getElementById("output");
  const btn = document.getElementById("run-btn");
  const fields = { name: form.elements.name, email: form.elements.email, topic: form.elements.topic, message: form.elements.message, website: form.elements.website };
  let startedAt = 0, cooldownUntil = 0;

  const say = (text, kind) => { out.textContent = text; out.className = "output" + (kind ? " " + kind : ""); };
  form.addEventListener("focusin", () => { if (!startedAt) startedAt = Date.now(); });
  form.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : submit(e); } });

  function validate(v) {
    if (v.name.length < 2) return ["name", 'ERROR:  null value in column "name"\nHINT:  Please tell me your name.'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return ["email", 'ERROR:  invalid input for column "email"\nHINT:  That email address doesn\'t look right, so I couldn\'t reply to it.'];
    if (v.message.length < 10) return ["message", 'ERROR:  value too short for column "message"\nHINT:  Write at least a sentence so I know how to help.'];
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const v = {
      name: fields.name.value.trim(), email: fields.email.value.trim(), topic: fields.topic.value,
      message: fields.message.value.trim(), website: fields.website.value,
    };
    const problem = validate(v);
    if (problem) { say(problem[1], "err"); fields[problem[0]].focus(); return; }
    if (Date.now() < cooldownUntil) { say("-- Already sent. Give it a moment before sending another.", ""); return; }

    if (cfg.DEMO_MODE) {
      say(`INSERT 0 1\n-- Preview only: on the live site this saves your message to Dev's inbox and emails him.`, "ok");
      return;
    }
    if (!cfg.CONTACT_ENDPOINT) {
      say("-- The inbox isn't connected yet.\n-- Please message me on LinkedIn for now: " + (cfg.LINKEDIN_URL || ""), "err");
      return;
    }

    btn.disabled = true; btn.textContent = "Running…";
    say("-- Running query…", "");
    try {
      const res = await fetch(cfg.CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // simple request: no CORS preflight
        body: JSON.stringify({ ...v, elapsedMs: startedAt ? Date.now() - startedAt : 0, page: location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "HTTP " + res.status);
      say(`INSERT 0 1\n-- Saved. Thanks, ${v.name.split(" ")[0]}. I've just been emailed and will reply to ${v.email}, usually within two days.`, "ok");
      form.reset(); startedAt = 0; cooldownUntil = Date.now() + 30000;
    } catch (err) {
      const msg = String(err.message || err);
      say(msg === "rate_limited"
        ? "ERROR:  too many messages from this address\nHINT:  Please wait an hour, or message me on LinkedIn."
        : "ERROR:  could not reach the inbox (" + msg + ")\nHINT:  Please try again in a minute, or message me on LinkedIn.", "err");
    } finally {
      btn.disabled = false; btn.textContent = "▶ Run query";
    }
  }
  form.addEventListener("submit", submit);
})();
