-- SQL used in analysis.ipynb (SQLite). Tables: orders, reviews, customers (Olist schema).
-- Each query starts with a "-- name:" line so the notebook can run it by name.

-- name: delivered_orders
-- One row per delivered order with its delivery timing, customer state and latest review score.
WITH latest_review AS (
    SELECT order_id, review_score,
           ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC) AS rn
    FROM reviews
)
SELECT o.order_id,
       c.customer_state,
       DATE(o.order_purchase_timestamp)                                         AS purchase_date,
       JULIANDAY(o.order_delivered_customer_date) - JULIANDAY(o.order_purchase_timestamp) AS days_to_deliver,
       CAST(JULIANDAY(DATE(o.order_delivered_customer_date))
            - JULIANDAY(DATE(o.order_estimated_delivery_date)) AS INTEGER)      AS days_vs_estimate,
       r.review_score
FROM orders o
JOIN customers c        ON c.customer_id = o.customer_id
LEFT JOIN latest_review r ON r.order_id = o.order_id AND r.rn = 1
WHERE o.order_status = 'delivered'
  AND o.order_delivered_customer_date IS NOT NULL;

-- name: late_rate_by_state
-- Late-delivery rate and average delivery time for states with at least 500 delivered orders.
WITH d AS (
    SELECT c.customer_state,
           JULIANDAY(o.order_delivered_customer_date) - JULIANDAY(o.order_purchase_timestamp) AS days_to_deliver,
           CASE WHEN DATE(o.order_delivered_customer_date) > DATE(o.order_estimated_delivery_date) THEN 1 ELSE 0 END AS is_late
    FROM orders o JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.order_status = 'delivered' AND o.order_delivered_customer_date IS NOT NULL
)
SELECT customer_state,
       COUNT(*)                          AS orders,
       ROUND(100.0 * AVG(is_late), 1)    AS late_pct,
       ROUND(AVG(days_to_deliver), 1)    AS avg_days_to_deliver
FROM d
GROUP BY customer_state
HAVING COUNT(*) >= 500
ORDER BY late_pct DESC;
