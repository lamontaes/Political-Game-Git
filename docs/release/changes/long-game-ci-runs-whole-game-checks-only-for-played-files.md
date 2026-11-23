---
id: long-game-ci-runs-whole-game-checks-only-for-played-files
impact: none
---

The golden path, the played year, paired performance and the new-game check now run on a pull request only when it changes a file each one plays, read from the check's own import graph. Train pull requests, pushes to main, the hourly run and manual runs still run every check.
