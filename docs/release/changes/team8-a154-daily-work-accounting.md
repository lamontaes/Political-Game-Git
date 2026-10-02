---
id: team8-a154-daily-work-accounting
impact: patch
section: Fixed
title: Saved staff labor keeps its daily job-hour limit through Continue and reload
---

Staff tasks bound to a recorded job share its daily labor allowance. The
canonical clock retains spent minutes through saved progress records and records
separate date checkpoints, so another task, short advance, or reload cannot
restore the same day's hours. Unbound legacy tasks retain their existing scope.
