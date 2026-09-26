---
id: model-call-walk-has-room
impact: none
---

The test that reads every file under `src/` to keep model calls out of shipped
play now has thirty seconds instead of the default five. It takes about 2.7
seconds alone and was timing out on busy runners. Nothing in play changes.
