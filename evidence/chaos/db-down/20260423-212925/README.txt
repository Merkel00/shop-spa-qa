README

experiment-metadata.txt
Scenario metadata and configured runtime values.

uname.txt, sw-vers.txt, node-version.txt, npm-version.txt, k6-version.txt
Environment and tool version information captured before the experiment.

top-pre.txt, vm-stat-pre.txt, lsof-db-port-5432-pre.txt, lsof-backend-port-8080-pre.txt
Pre-fault system and port snapshots.

top-post.txt, vm-stat-post.txt, lsof-db-port-5432-post.txt, lsof-backend-port-8080-post.txt
Post-fault system and port snapshots.

api-products-probes.csv
Timestamped GET /api/products/all probe results across baseline, downtime, and recovery phases.

api-login-probes.csv
Timestamped POST /api/auth/login probe results across baseline, downtime, and recovery phases.

api-register-probes.csv
Timestamped POST /api/auth/register probe results across baseline, downtime, and recovery phases.

db-down-runner.log
Console output from the db-down helper invoked by this runner.

recovery-summary.txt
High-level note describing whether the recovery probes fully succeeded within the recovery window.

ui-login.spec.txt, ui-checkout-risk.spec.txt
Optional Playwright probe outputs when RUN_UI_PROBES=true.
