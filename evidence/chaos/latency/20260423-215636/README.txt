README

experiment-metadata.txt
Scenario metadata and configured latency settings.

uname.txt, sw-vers.txt, node-version.txt, npm-version.txt
Environment and local tool version information captured before the run.

top-pre.txt, vm-stat-pre.txt, lsof-backend-8080-pre.txt, lsof-frontend-4200-pre.txt
Pre-run system and port snapshots.

top-post.txt, vm-stat-post.txt, lsof-backend-8080-post.txt, lsof-frontend-4200-post.txt
Post-run system and port snapshots.

api-products-probes.csv
Timestamped GET /api/products/all probe results for baseline and post-run phases.

api-login-probes.csv
Timestamped POST /api/auth/login probe results for baseline and post-run phases.

ui-checkout-risk.spec.txt
Playwright output for the checkout risk scenario under the latency setup.

ui-checkout.spec.txt
Playwright output for the main checkout flow under the latency setup.
