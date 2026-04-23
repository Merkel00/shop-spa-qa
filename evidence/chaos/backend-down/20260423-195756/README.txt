README

experiment-metadata.txt
Scenario metadata and configured runtime values.

uname.txt, sw-vers.txt, node-version.txt, npm-version.txt, k6-version.txt
Environment and tool version information captured before the experiment.

top-pre.txt, vm-stat-pre.txt, lsof-port-8080-pre.txt
Pre-fault system and port snapshots.

top-post.txt, vm-stat-post.txt, lsof-port-8080-post.txt
Post-fault system and port snapshots.

api-products-probes.csv
Timestamped GET /api/products/all probe results across baseline, downtime, and recovery phases.

api-login-probes.csv
Timestamped POST /api/auth/login probe results across baseline, downtime, and recovery phases.

backend-down-runner.log
Console output from the backend-down helper invoked by this runner.

ui-login.spec.txt, ui-checkout-risk.spec.txt
Optional Playwright probe outputs when RUN_UI_PROBES=true.
