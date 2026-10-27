# Data Analysis Portfolio: Dev Mistri

Data analyst with an MSc in Data and Artificial Intelligence (UWTSD Birmingham) and two years of backend development work cleaning, validating and querying production data. Based in Birmingham, UK.

**Website:** <https://d3vxc.github.io/data-analysis-portfolio/> · [LinkedIn](https://www.linkedin.com/in/dev-mistri-) · [GitHub](https://github.com/D3vxc)

## Analyses

| # | Business problem | Data | Skills | Headline result |
|---|---|---|---|---|
| 01 | [Who is about to cancel, and who to call first](04-telecom-customer-churn) | IBM Telco churn, 7,043 customers | Python, logistic regression, segmentation | The riskiest 20% of customers by model score contain 49.9% of actual churners |
| 02 | [Did moving the paywall gate hurt retention?](05-mobile-game-ab-test) | Cookie Cats A/B test, 90,189 players | A/B testing, z-test, bootstrap, SRM check | 7-day retention fell 0.82 points (p = 0.002): don't ship |
| 03 | [What late deliveries cost in customer reviews](06-ecommerce-late-deliveries) | Olist marketplace, 99,441 orders | SQL joins, window functions | Late orders are 6.8% of deliveries but 36.7% of one-star reviews |
| 04 | [Where a UK retailer's revenue comes from](01-uk-online-retail) | UCI Online Retail, 541,909 lines | SQL, RFM, cohort retention | 14% of customers generate 45% of revenue |
| 05 | [What a 99.9% accurate model is hiding](03-network-traffic-eda) | NSL-KDD, 148,517 connections | EDA, scikit-learn, evaluation | Accuracy drops from 99.88% to 76.5% once attacks are new |
| 06 | [UK house prices since 1953](02-uk-house-prices) | Nationwide HPI, 290 quarters | Time series, validation | The early-1990s crash took 8.5 years to recover |

Each folder has a notebook that runs top to bottom (it downloads its own data), a README with the findings, and the charts.

## Repository layout

```
01-…06-*/              one folder per analysis: analysis.ipynb, README.md, images/, results/summary.json
docs/                  the website (plain HTML, CSS and JavaScript), served by GitHub Pages
contact-backend/       Google Apps Script for the contact form (saves to a Google Sheet, emails me)
scripts/               build_site_data.py: copies each analysis's results into the website
```

## Run the analyses

```bash
git clone https://github.com/D3vxc/data-analysis-portfolio
cd data-analysis-portfolio
pip install -r requirements.txt
jupyter notebook
```

After re-running a notebook, update the website's numbers with `python scripts/build_site_data.py`.

## Website and contact form

The site in `docs/` has no build step. Open `docs/index.html` in a browser to preview it locally.
The contact form posts to a Google Apps Script that stores each message in a Google Sheet and emails me; see [`contact-backend/SETUP.md`](contact-backend/SETUP.md).
