# Project notes for Claude Code

Dev Mistri's data science portfolio: seven analyses of real public data plus a static website at https://devmistri.co.uk (GitHub Pages, `main` branch, `/docs` folder; `docs/CNAME` holds the domain, DNS is at GoDaddy).

## Layout

- `01-…07-*/`: one folder per project with `analysis.ipynb` (executed), `README.md`, `images/`, `results/summary.json`. Raw data goes in each project's `data/` folder (gitignored); every notebook downloads its own data on first run.
- `07-credit-default-risk/` is the flagship: XGBoost vs logistic regression, calibration, SHAP reason codes, fairness by sex and age. `results/test_scores.csv` feeds the website's dot animation.
- `docs/`: the website. Plain HTML/CSS/JS, no build step.
  - `index.html`, `resume.html`, `assets/css/style.css`, `assets/css/resume.css`
  - `assets/js/app.js`: Lenis smooth scroll, GSAP ScrollTrigger animations, D3 charts, canvas dot field
  - `assets/js/contact.js` + `assets/js/config.js`: SQL-style contact form posting to a Google Apps Script (`contact-backend/`)
  - `assets/js/peek.js`: the "I see you" pop-up when developer tools are opened (kept at the owner's request)
  - `assets/vendor/`: vendored gsap 3.12.5, lenis 1.1.13, d3 7.9.0 and fonts (see its README)
  - `data/site-data.js` and `data/credit-test.js` are generated; do not edit by hand
- `scripts/build_site_data.py`: rebuilds `docs/data/*.js` from every `results/summary.json` (and the credit test scores). Run it after re-running any notebook.
- `scripts/check_repo.py`: repo checks (executed notebooks, valid summary.json, no em dashes, no broken local links, CNAME). Run before pushing.
- `.github/workflows/checks.yml`: CI on every PR and push to `main`; runs `check_repo.py` and fails if `docs/data` is out of date with the summaries.
- `screenshots/`: images used in the README.

## Conventions

- Every number on the site, README and resume must come from a notebook's `results/summary.json`. If a notebook changes, rerun `python scripts/build_site_data.py` and check the copy in `docs/index.html`, `docs/resume.html` and the READMEs.
- Copy style: plain English, sentence case, no em dashes, no ALL-CAPS labels.
- Charts use blue (`--model`) for the model or the highlighted series and amber (`--risk`) for defaults or bad outcomes; everything else grey.
- Check the site on desktop and at 390px wide, in light and dark mode, and with reduced motion. No horizontal scrolling on phones.
- Work on a branch and merge through a pull request.

## Open items

- `docs/assets/js/config.js`: `CONTACT_ENDPOINT` is empty until the Apps Script web app is deployed (see `contact-backend/SETUP.md`), so the contact form does not send yet.
- The site and resume show a student email address that may expire after graduation; a custom-domain address (e.g. forwarding via ImprovMX) was being considered but is not set up.
- Gaps against graduate data science and AI roles: Google Cloud, LLM/RAG with evaluation, MLOps (CI for the repo exists; model serving, tests and monitoring do not).
