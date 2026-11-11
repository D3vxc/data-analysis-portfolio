# Dev Mistri: Data Analysis Portfolio

Data analyst with an MSc in Data and Artificial Intelligence (UWTSD Birmingham) and two years of backend development spent cleaning, validating and querying production data. I work in Python and SQL, and every claim comes with its proof: a notebook you can rerun. Based in Birmingham, UK.

**🌐 Website:** [devmistri.co.uk](https://devmistri.co.uk/) · **📄 Resume:** [online resume](https://devmistri.co.uk/resume.html) · [LinkedIn](https://www.linkedin.com/in/dev-mistri-) · [GitHub](https://github.com/D3vxc)

![Portfolio website](screenshots/website-hero.jpg)

## Contents

- [Projects at a glance](#projects-at-a-glance)
- [Flagship: the MSc dissertation](#flagship-the-msc-dissertation)
- [Credit default risk](#credit-card-default-risk)
- [The analyses, with charts](#the-analyses-with-charts)
- [The website](#the-website)
- [Repository layout](#repository-layout)
- [Run it yourself](#run-it-yourself)

## Projects at a glance

| # | Business problem | Data | Skills | Headline result |
|---|---|---|---|---|
| ★ | [Can a detector catch an attack nobody has labelled yet?](08-hybrid-intrusion-detection) **(MSc dissertation)** | UNSW-NB15 · 257,673 network flows | Autoencoder, Isolation Forest, XGBoost, SHAP, holdout design | The hybrid adds **+0.020** ROC AUC at 50 labels and **-0.0002** at full scale |
| ☆ | [Who will miss next month's credit card payment?](07-credit-default-risk) | UCI credit card default · 30,000 customers | XGBoost, SHAP, calibration, fairness testing | Calling the riskiest 20% reaches **51%** of defaults (ROC AUC 0.781 vs 0.746 baseline) |
| 01 | [Who is about to cancel, and who to call first](04-telecom-customer-churn) | IBM Telco churn · 7,043 customers | Python, logistic regression, segmentation | The riskiest 20% of customers by model score contain **49.9%** of actual churners |
| 02 | [Did moving the paywall gate hurt retention?](05-mobile-game-ab-test) | Cookie Cats A/B test · 90,189 players | A/B testing, z-test, bootstrap, SRM check | 7-day retention fell **0.82 points** (p = 0.002): don't ship |
| 03 | [What late deliveries cost in customer reviews](06-ecommerce-late-deliveries) | Olist marketplace · 99,441 orders | SQL joins, CTEs, window functions | Late orders are 6.8% of deliveries but **36.7%** of one-star reviews |
| 04 | [Where a UK retailer's revenue comes from](01-uk-online-retail) | UCI Online Retail · 541,909 lines | SQL, RFM, cohort retention | **14%** of customers generate **45%** of revenue |
| 05 | [What a 99.9% accurate model is hiding](03-network-traffic-eda) | NSL-KDD · 148,517 connections | EDA, scikit-learn, evaluation design | Accuracy drops from **99.88%** to **76.5%** once attacks are new |
| 06 | [UK house prices since 1953](02-uk-house-prices) | Nationwide HPI · 290 quarters | Time series, data validation | The early-1990s crash took **8.5 years** to recover |

Every project starts from a question a manager would ask, uses real public data, checks data quality before drawing conclusions, and ends with a recommendation and its limitations.

## Flagship: the MSc dissertation

> **Designing and evaluating an AI-powered hybrid intrusion detection system integrating anomaly detection and supervised learning, applying statistical analysis, feature engineering, and model evaluation techniques to network security datasets.**
>
> A detector trained on known attacks is good at known attacks. What does it do when something arrives that nobody has labelled?

- An autoencoder trained on **normal traffic only** reaches ROC AUC **0.9015** without seeing a single attack label, catching 76.3% of attacks at 9.8% false alarms.
- The **hybrid does not beat the supervised model**: 0.9836 against 0.9837. Deleting whole attack families from training does not change that, across eight holdout runs.
- It helps at the **cold start only**: **+0.020** AUC with 50 labelled flows, nothing past 250.
- The supervised model catches unseen families better than expected (Backdoor and Worms at 100%), except **Fuzzers at 21.9%** when held out, where the anomaly detector is no better.
- `recon_error` ranks **2** of 44 by SHAP: the model leans on the anomaly score and still gains nothing, which is redundancy rather than irrelevance.

Full write-up and limitations: [`08-hybrid-intrusion-detection/`](08-hybrid-intrusion-detection).

## Credit card default risk

> A card issuer wants to contact customers before they miss a payment, but can only call one in five. Which customers, why, and is the model fair?

- XGBoost reaches test ROC AUC **0.781** (5-fold CV 0.785 ± 0.005) against **0.746** for logistic regression. Calling the riskiest 20% reaches **51%** of next month's defaults; **56.5%** of those called default, 2.6× the average.
- Calibrated to within 3 points in every score band, so scores can be used as probabilities.
- SHAP reason codes for every flagged customer; repayment history carries 42% of the attribution.
- Sex, age and marital status were left out of the model, and outcomes were still tested by group: men and women are caught at the same rate (51%), but the flag-rate ratio across age bands is **0.80**, right on the four-fifths screening line.

| Cumulative gains | Outcomes by group |
|---|---|
| ![Gains](07-credit-default-risk/images/gains_curve.png) | ![Fairness](07-credit-default-risk/images/fairness_by_group.png) |

| SHAP importance | Reason codes for one customer |
|---|---|
| ![SHAP](07-credit-default-risk/images/shap_importance.png) | ![Reasons](07-credit-default-risk/images/reason_codes.png) |

→ [Notebook](07-credit-default-risk/analysis.ipynb) · [Write-up and limitations](07-credit-default-risk)

## The analyses, with charts

### 01 · Telecom customer churn: who to call first

> Subscription businesses lose customers every month. Which customers are likely to leave, why, and where should a retention team spend its time?

- **26.5%** of customers left, taking **30.5%** of monthly revenue ($1.67m a year).
- Month-to-month customers churn at **42.7%**, against **2.8%** on two-year contracts. In the first six months, churn is **52.9%**.
- A logistic regression (ROC AUC **0.844**) puts **49.9%** of the people who actually left into the riskiest 20% of customers.

| Churn by contract and tenure | Actual churn by predicted risk decile |
|---|---|
| ![Churn by contract and tenure](04-telecom-customer-churn/images/churn_by_contract_tenure.png) | ![Risk deciles](04-telecom-customer-churn/images/risk_deciles.png) |

**Recommendation:** contract upgrades during the first six months, an incentive to move to automatic payment, and tech support bundled with fibre. → [Notebook](04-telecom-customer-churn/analysis.ipynb)

### 02 · Mobile game A/B test: should the paywall gate move?

> *Cookie Cats* tested moving its first gate from level 30 to level 40. Should the change ship?

- 7-day retention fell from **19.02%** to **18.20%** (−0.82 points, 95% CI −1.33 to −0.31, p = 0.002). The bootstrap gives level 30 a **99.9%** chance of being better.
- Day-1 retention points the same way but isn't conclusive (p = 0.074).
- The groups were split 49.56 / 50.44 (chi-square p = 0.009): a **sample ratio mismatch** to investigate before the next test.

| Retention by group (95% CI) | Bootstrap distribution of the difference |
|---|---|
| ![Retention by group](05-mobile-game-ab-test/images/retention_by_group.png) | ![Bootstrap](05-mobile-game-ab-test/images/bootstrap_difference.png) |

**Recommendation:** keep the gate at level 30 and audit the assignment pipeline. → [Notebook](05-mobile-game-ab-test/analysis.ipynb)

### 03 · E-commerce late deliveries: the cost in reviews

> How often do marketplace orders miss the promised date, how much does it hurt reviews, and where and when does it happen?

- **6.8%** of delivered orders arrived late, although the median order arrived **12 days early**.
- Average review: **4.29** stars on time against **2.27** late; 8+ days late averages **1.70**. Late orders cause **36.7%** of all one-star reviews.
- The late rate hit **12.4%** in Black Friday month and **19.0%** in March 2018. Maranhão is late 17.4% of the time; São Paulo 4.5%.

| Review score by lateness | Late rate by month |
|---|---|
| ![Review by lateness](06-ecommerce-late-deliveries/images/review_by_lateness.png) | ![Late by month](06-ecommerce-late-deliveries/images/late_by_month.png) |

![Late rate by state](06-ecommerce-late-deliveries/images/late_by_state.png)

**Recommendation:** set promised dates by state and season, add courier capacity before peaks, and warn customers proactively. → [Notebook](06-ecommerce-late-deliveries/analysis.ipynb) · [SQL](06-ecommerce-late-deliveries/queries.sql)

### 04 · UK online retailer: where the revenue comes from

> How seasonal is the business, and which customers keep coming back?

- **£9.63m** revenue from 18,957 orders; September to November brought in **37.2%** of the year.
- No Saturday trading at all; the busiest window is 10:00 to 16:00, Tuesday to Thursday.
- Champions are **14.1%** of customers and **45.3%** of revenue; **602** at-risk customers worth **£625k** are a win-back target.

| Monthly revenue | RFM segments |
|---|---|
| ![Monthly revenue](01-uk-online-retail/images/monthly_revenue.png) | ![RFM segments](01-uk-online-retail/images/rfm_segments.png) |

| Cohort retention | Revenue by day and hour |
|---|---|
| ![Cohort retention](01-uk-online-retail/images/cohort_retention.png) | ![Day and hour heatmap](01-uk-online-retail/images/day_hour_heatmap.png) |

→ [Notebook](01-uk-online-retail/analysis.ipynb) · [SQL](01-uk-online-retail/queries.sql)

### 05 · Network intrusion data: what accuracy hides

> Which features reveal an attack, and how well does a model catch attacks it has never seen?

- **16.6%** of test traffic is attack types that never appear in training.
- A random forest scores **99.88%** in cross-validation but **76.5%** on the official test set.
- It catches **76.8%** of known attack types but only **22.0%** of new ones.

| Detection rate by attack type | Training vs test traffic mix |
|---|---|
| ![Detection by category](03-network-traffic-eda/images/detection_by_category.png) | ![Class balance](03-network-traffic-eda/images/class_balance.png) |

→ [Notebook](03-network-traffic-eda/analysis.ipynb)

### 06 · UK house prices since 1953: crashes and recoveries

> How deep were past downturns, and how long did prices take to get back to their peak?

- Validated the data first: every published annual change matches a recalculation to within 0.1 points.
- Three downturns of more than 5%: **−20.2%** (1989–93, 8.5 years to recover), **−18.7%** (2007–09, 6.8 years), **−5.5%** (2022–23, not yet recovered by mid-2025).

| Long-run price (log scale) | Annual change |
|---|---|
| ![Long-run price](02-uk-house-prices/images/long_run_price.png) | ![Annual change](02-uk-house-prices/images/yoy_change.png) |

→ [Notebook](02-uk-house-prices/analysis.ipynb)

## The website

The site lives in [`docs/`](docs) and is served by GitHub Pages at [devmistri.co.uk](https://devmistri.co.uk/). It is designed like a press proof that you scroll through like a film edit: paper, black toner and two inks (blue for the model, orange for the risk). It is plain HTML, CSS and JavaScript with no build step, and no stock or generated images: all the artwork is drawn in code.

**The headline is made of the data.** "Data analyst" is printed as a halftone of the credit model's 6,000 real test customers; the orange dots are the ones who defaulted. As you scroll, the same dots fly out of the headline into a chart.

![Dots leaving the headline](screenshots/website-dots-flying.jpg)

**Then the model sorts them.** The dots are ranked by score, the riskiest 20% are boxed, and they split by age band to show who gets flagged.

| Ranked, top 20% boxed | Split by age band |
|---|---|
| ![Ranked](screenshots/website-credit-ranked.jpg) | ![Fairness](screenshots/website-credit-fairness.jpg) |

**The evidence underneath:** gains curve (drawn as you scroll), model comparison, calibration, SHAP and a reason-code card.

![Evidence](screenshots/website-credit-evidence.jpg)

**A blade cut, then a film strip.** The page is sliced open along a diagonal, and the other six analyses scroll sideways as frames of film, each with its headline number, a chart from the notebook and a hand-drawn sticker.

| The slice | The film strip |
|---|---|
| ![Slice](screenshots/website-slice.jpg) | ![Film strip](screenshots/website-film-strip.jpg) |

**Kinetic type, stamps and tape.** Section titles are fitted to the page with the display font's width axis and stretch into place as you scroll; each working rule gets a rubber stamp; the toolkit runs on two strips of tape.

| How I check my own work | Toolkit and about |
|---|---|
| ![Method](screenshots/website-method.jpg) | ![About](screenshots/website-about.jpg) |

**A contact form written as an SQL query.** A Google Apps Script saves each message to a Google Sheet and emails me ([setup guide](contact-backend/SETUP.md)).

![Contact form](screenshots/website-contact.jpg)

**An online resume** with tap-to-call, email links and a *Save as PDF* button that prints a two-page A4 resume.

![Resume page](screenshots/resume-page.jpg)

**Phones too.** On narrow screens the film strip becomes a stack, and with reduced motion turned on every animation is replaced by its final state.

![Phone views](screenshots/website-mobile.jpg)

Built with [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) (scroll timing), [Lenis](https://github.com/darkroomengineering/lenis) (smooth scrolling) and [D3](https://d3js.org/) (charts), set in Anybody and Newsreader. Libraries and fonts are vendored in `docs/assets/vendor`.

## Repository layout

```
01-…07-*/              one folder per project: analysis.ipynb, README.md, images/, results/summary.json
docs/                  the website (index.html, resume.html, assets/, assets/vendor/, data/)
contact-backend/       Google Apps Script for the contact form, plus SETUP.md
scripts/               build_site_data.py copies each analysis's results into the website
screenshots/           the images used in this README
```

## Run it yourself

```bash
git clone https://github.com/D3vxc/data-analysis-portfolio
cd data-analysis-portfolio
pip install -r requirements.txt
jupyter notebook          # each notebook downloads its own data on first run
```

After re-running a notebook, refresh the website's numbers with `python scripts/build_site_data.py`. To preview the site, open `docs/index.html` in a browser.

## Data sources

Default of Credit Card Clients (Yeh & Lien, 2009; UCI, CC BY 4.0) · IBM Telco Customer Churn sample · Cookie Cats A/B test (Tactile Entertainment, via DataCamp) · Olist Brazilian e-commerce public dataset (CC BY-NC-SA 4.0) · UCI Online Retail (Chen, Sain & Guo, 2012) · NSL-KDD (Canadian Institute for Cybersecurity) · Nationwide House Price Index (via datasets/house-prices-uk, ODC-PDDL).
