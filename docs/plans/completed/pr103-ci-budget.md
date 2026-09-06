# PR #103 CI budget repair

Scope: workflow budget and cancellation cleanup only; preserve production behavior and all browser coverage.

1. Verify preflight, exact branch heads and timeout annotation.
2. Raise the job ceiling to 30 minutes and preserve available cancellation artifacts.
3. Validate workflow syntax and whitespace, run required art checks, inspect diff, then push the same branch and report exact-head CI state without merging.

Implementation complete. GitHub run 34011115793 at d79fd5b07da35ecdab6d73e207c331be1aa2420b has an explicit 20m0s maximum-execution-time annotation. Repository validation and pinned Chromium installation passed; the 249-test, one-worker suite reached test 230 before cancellation, which is not a passing suite.

Local validation: agent preflight; Prettier YAML syntax/format check; git diff --check; validate:art, inventory:art and qa:art passed. No production, browser configuration, test or dependency changes. Exact-head CI is required after push; semantic/visual audit and owner visual acceptance remain gates even after green.

LEARN: inspect job annotations before diagnosing cancelled browser runs; preserve available cancellation artifacts without promising cleanup after hard termination. The workflow comments encode this bounded rationale.
