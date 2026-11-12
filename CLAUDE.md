# Project notes for Claude Code

Dev Mistri's data analysis portfolio: the MSc dissertation plus seven analyses of real public data, and a static website at https://devmistri.co.uk (GitHub Pages, `main` branch, `/docs` folder; `docs/CNAME` holds the domain, DNS is at GoDaddy).

## Layout

- `01-…08-*/`: one folder per project with `analysis.ipynb` (executed), `README.md`, `images/`, `results/summary.json`. Raw data goes in each project's `data/` folder (gitignored); every notebook downloads its own data on first run.
- `08-hybrid-intrusion-detection/` is the flagship: the MSc dissertation, rebuilt as a reproducible notebook on UNSW-NB15. Autoencoder on normal traffic + Isolation Forest, anomaly scores added to a supervised XGBoost, then three evaluations (standard split, attack families held out of training, label-scarcity curve). `results/test_scores.csv` feeds the website's dot animation. **Its finding is negative and must stay that way:** the hybrid adds +0.020 AUC at 50 labels and nothing past 250. Do not soften that into "the hybrid works".
- `07-credit-default-risk/` is the second case: XGBoost vs logistic regression, calibration, SHAP reason codes, fairness by sex and age.
- `03-network-traffic-eda/` (NSL-KDD) is the precursor that set up the dissertation's question, and says so in its README. It is not the dissertation.
- `docs/`: the website. Plain HTML/CSS/JS, no build step, no image files (all artwork is SVG, CSS or canvas).
  The one binary is `docs/media/`, which holds the dissertation explainer film and its captions.
  - `index.html`, `resume.html`, `assets/css/style.css`, `assets/css/resume.css`, `assets/css/peek.css`
  - `assets/js/app.js`: everything on the homepage. Lenis smooth scroll, GSAP ScrollTrigger timing, D3 charts, and:
    - the fixed `#dots` canvas (WebGL point sprites, with a 2D fallback): the "UNSEEN ATTACK" headline is a halftone of 6,000 network flows from the dissertation's test half, and the same dots fly into `#dots-frame` and are ranked, boxed and split by what the traffic was as the `.steps` scroll. The data contract is `score[] / y / grp / grps` in `docs/data/ids-test.js`; the four display groups are fixed in `scripts/build_site_data.py`, and the dot timing assumes exactly four `.step`s, so adding one means re-tuning `st.t` in `app.js`;
    - kinetic banners (`[data-banner]` lines fitted to full width with the font's width axis);
    - the slice (`#cut`) and the sideways film strip (`#strip-pin`, wide screens with motion only; stacked otherwise);
    - stamps, tape marquees, marker strokes, the slate (scene name and timecode) and the registration-mark cursor.
  - `assets/js/contact.js` + `assets/js/config.js`: SQL-style contact form posting to a Google Apps Script (`contact-backend/`)
  - `media/dissertation-explainer.mp4` (2:14, 13 MB) and `.vtt`: the explainer film. It is **rendered without
    burned-in captions on purpose** — the subtitles are a real `<track>`, so the viewer can switch them off and
    the words stay selectable. The `.film-cover` is drawn in CSS rather than a poster image, and `app.js` only
    creates the `<video>` on the first click, so the 13 MB is never fetched unless somebody presses play. Keep it
    that way: a plain autoloading `<video>` would put 13 MB on every page view. The sources live outside the repo
    in `/home/claude/dap/video` (script, Kokoro TTS, Playwright frame render, ffmpeg mux);
    `08-hybrid-intrusion-detection/explainer-transcript.md` is the narration in text.
  - `assets/js/peek.js` + `assets/css/peek.css`: the "I see you" pop-up when developer tools are opened (kept at the owner's request)
  - `assets/vendor/`: vendored gsap 3.12.5, lenis 1.1.13, d3 7.9.0 and the Anybody and Newsreader variable fonts (see its README)
  - `data/site-data.js` and `data/ids-test.js` are generated; do not edit by hand
- `scripts/build_site_data.py`: rebuilds `docs/data/*.js` from every `results/summary.json` (and the dissertation's per-flow test scores). Run it after re-running any notebook.
- `screenshots/`: images used in the README.

## Conventions

- Every number on the site, README and resume must come from a notebook's `results/summary.json`. If a notebook changes, rerun `python scripts/build_site_data.py` and check the copy in `docs/index.html`, `docs/resume.html` and the READMEs.
- Positioning: the site and resume say "data analyst" (the owner's choice). The dissertation is the flagship and the hero is framed as a dissertation cover page; the full academic title appears in `.diss-cover` and must stay verbatim.
- Copy style: plain English, sentence case in running text, no em dashes. Display banners are uppercase by design.
- Design: a press proof you scroll through like an edit. One light theme only (no dark mode): paper `--paper`, black, blue `--blue` for the model or highlighted series, orange `--orange` for defaults and bad outcomes. Display type is Anybody, text is Newsreader.
- Motion must be smooth (the owner asked for this after a stepped, hard-cut version felt laggy): eased transitions, no `steps()` easing, no jitter loops.
- Performance rules, learned the hard way: no `mix-blend-mode` and no SVG `filter: url()` on anything large or fixed; animate only `transform` and `opacity` while scrolling (banners are fitted once with `font-stretch`, then moved with `scaleX`); the dots are drawn with WebGL (2D canvas fallback) and the canvas is hidden when no dots are on screen. `perf`-style checks: scroll the page on a throttled CPU and compare frame times before and after a change.
- No generated or stock images and no paid tools: the owner wants the artwork to be original and made in code. Stickers are hand-drawn SVG symbols in `index.html`.
- The explainer film must stay lazy: check that no request for the mp4 happens before the cover is clicked, and
  that `html.no-js` hides `.film-cover` so the `<noscript>` player is not covered by a dead button.
- Check the site on desktop (including 1366x650, 1024x768 and 1280) and at 390px and 360px wide, with reduced motion, and with JavaScript off. No horizontal scrolling at any of them. The `.hl` no-JS fallback sizes are tuned to the exact headline words, so changing the headline means re-measuring them; `html.no-js` gets `overflow-x: hidden` and must not when JS is on, or ScrollTrigger cannot pin. Deep links such as `index.html#housing` must land on the right film frame.
- Work on a branch and merge through a pull request.

## Open items

- `docs/assets/js/config.js`: `CONTACT_ENDPOINT` is empty until the Apps Script web app is deployed (see `contact-backend/SETUP.md`), so the contact form does not send yet.
- The site and resume show a student email address that may expire after graduation; a custom-domain address (e.g. forwarding via ImprovMX) was being considered but is not set up.
- Gaps against graduate data science and AI roles: Google Cloud, LLM/RAG with evaluation, MLOps/CI-CD.
