---
name: model-effort
description: >
  Use when starting any session or subagent. Pick the lowest model and effort
  level that can do the work — Sonnet Medium for agreed designs, Opus Medium
  for judgment calls — and escalate only if it fails.
---

# Lowest model/effort that works

Every session or delegated task gets a model and an effort level chosen for
the actual work: Sonnet at Medium effort for implementing an already-agreed
design, Opus at Medium (not High) effort for genuine judgment calls — design
tradeoffs, ambiguous scope, risk calls. Default to Medium. Go up a tier only
after the lower one actually fails at the task, not preemptively because the
task sounds important.

## Check your own work

Before requesting a model or effort bump, name the specific way the lower
tier failed — wrong output, missed requirement, timeout. If you can't name a
concrete failure, you don't have grounds to escalate yet.
