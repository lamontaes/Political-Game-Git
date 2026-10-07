---
id: ci-changed-tests-only
impact: patch
section: Changed
title: GitHub checks run only the tests a change touches
---

Owner decision, October 1, 2026. GitHub no longer runs the full unit suite on every push. The `unit` job runs only the test files a pull request adds or edits, the same rule the local gate uses before a change lands. Checks run on pull requests and on main, not on every team-branch push, and a newer push cancels the older run. The full browser suite runs only when started by hand. Lint, type checks, release checks and the build still run on every pull request.
