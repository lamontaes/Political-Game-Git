---
id: a10-sentence-choice-replay
impact: patch
section: Fixed
title: Pending custody terms preserve the judge's saved choice on replay
---

When a case has a saved sentence choice but no applicable custody range,
repeating prosecution delivery now reuses that actual judge's choice instead
of appending the same decision trace again. The case keeps its original
records through SaveContinue. This does not supply a missing legal range or
classify an unsupported offense.

The changed clemency-unseated-body test file passed all eight cases, including
five drawn-place replay cases. Board appointment and board-decision proof
remain separate work.
