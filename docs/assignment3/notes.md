## Performance Baseline 01 - Authentication Login

- script: `performance/k6/auth-login.js`
- endpoint: `POST /api/auth/login`
- local target: `http://localhost:8080`
- credentials used: `admin@shop.local / admin`
- virtual users: `5`
- duration: `30s`

Metrics:
- requests: `130`
- failed requests: `0%`
- average response time: `163.29 ms`
- median response time: `135.28 ms`
- p90 response time: `213.9 ms`
- p95 response time: `341.92 ms`
- max response time: `512.74 ms`
- throughput: `4.292621 req/s`

The first authentication performance baseline passed successfully. Thresholds were satisfied, and this run serves as the initial reference point before adding peak, spike, and endurance scenarios.

## Performance Baseline 02 - Checkout / Order Flow

- script: `performance/k6/checkout-order.js`
- flow: `GET /api/products/all -> POST /api/auth/login -> POST /api/cart/items -> POST /api/orders`
- local target: `http://localhost:8080`
- credentials used: `admin@shop.local / admin`
- shipping address used: `Main street 1`
- virtual users: `1`
- total iterations: `3`

Metrics:
- HTTP requests: `12`
- iterations: `3`
- failed requests: `0%`
- average HTTP response time: `59.45 ms`
- median HTTP response time: `49.8 ms`
- p90 HTTP response time: `121.68 ms`
- p95 HTTP response time: `124.71 ms`
- max HTTP response time: `127.62 ms`
- checkout_order_duration average: `38.075667 ms`
- checkout_order_duration median: `17.02 ms`
- checkout_order_duration p90: `69.4808 ms`
- checkout_order_duration p95: `76.0384 ms`
- checkout_order_duration max: `82.596 ms`
- checkout success rate: `100%`
- throughput: `3.222214 req/s`

The baseline checkout/order flow passed successfully. All checks and thresholds passed, and this run confirms that the real authenticated order path is stable enough for further controlled load expansion.

## Performance Run 03 - Isolated Checkout Controlled Load

- script: `performance/k6/checkout-order.js`
- flow: `GET /api/products/all -> POST /api/auth/register -> POST /api/cart/items -> POST /api/orders`
- local target: `http://localhost:8080`
- user model: `unique registered user per iteration`
- shipping address used: `Main street 1`
- scenario: `isolated_checkout_baseline`
- virtual users: `3`
- duration: `1 minute`

Metrics:
- iterations: `159`
- HTTP requests: `636`
- failed requests: `0%`
- checks succeeded: `1431 / 1431`
- average HTTP response time: `35.14 ms`
- median HTTP response time: `5.54 ms`
- p90 HTTP response time: `124.64 ms`
- p95 HTTP response time: `126.02 ms`
- max HTTP response time: `142.46 ms`
- checkout_order_duration average: `5.073717 ms`
- checkout_order_duration median: `4.725 ms`
- checkout_order_duration p90: `6.5956 ms`
- checkout_order_duration p95: `7.2529 ms`
- checkout_order_duration max: `16.86 ms`
- checkout success rate: `100%`
- throughput: `10.501056 req/s`

The isolated-user checkout flow remained stable under controlled concurrent load. All checks and thresholds passed, and using unique registered users avoided shared-cart interference and made the results more reliable for further expansion.

## Performance Run 04 - Checkout Full Scenario Rerun with Shape Validation

- script: `performance/k6/checkout-order.js`
- flow: `GET /api/products/all -> POST /api/auth/register -> POST /api/cart/items -> POST /api/orders`
- scenario set: `normal_load, peak_load, spike_load, endurance`
- local target: `http://localhost:8080`
- user model: `unique registered user per iteration`

Metrics:
- iterations: `1413`
- HTTP requests: `5652`
- failed HTTP requests: `0%`
- average HTTP response time: `36.57 ms`
- median HTTP response time: `5.29 ms`
- p90 HTTP response time: `132.63 ms`
- p95 HTTP response time: `139.68 ms`
- max HTTP response time: `173.65 ms`
- checkout_order_duration average: `4.512105 ms`
- checkout_order_duration median: `3.993 ms`
- checkout_order_duration p90: `6.5138 ms`
- checkout_order_duration p95: `7.7536 ms`
- checkout_order_duration max: `20.855 ms`
- checkout_order_success: `99.36%`
- checkout_order_shape_valid: `99.36%`
- checks succeeded: `12699 / 12717`

The run passed all configured thresholds. However, a small number of order responses again lacked expected fields such as `id` and `total`; because the anomaly repeated across runs, it should be treated as a real response-shape inconsistency under load rather than a one-off event. This is important for the final observed-vs-expected analysis.
