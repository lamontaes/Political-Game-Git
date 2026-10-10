---
name: model-effort
description: >
  Use when starting any session, subagent or package. Codex builds; a separate
  Claude session finishes (Opus for judgment calls, Sonnet for agreed designs).
  State the model and effort for every session.
---

# Who builds, who finishes, and at what effort (owner, Oct 10, 2026)

- **Codex (GPT-6.1 Sol) builds** the bulk: modules, ports, data and tests on
  draft PRs, from a package spec. It is relatively cheap, so it does the long
  building runs.
- **A separate Claude session finishes:** Opus for judgment calls (design
  tradeoffs, architecture, ambiguous scope, risk), Sonnet for implementing or
  checking an already agreed design. The finisher never grades its own build.
- **Effort:** high for package-sized judgment work and for finishing core
  changes; medium for agreed, mechanical work. Every package states its model
  and effort.
- **One package per session.** Start a fresh session for the next package
  instead of running one session for days.

## Check your own work

Before asking for a bigger model or more effort, name the specific way the
current one failed: wrong output, a missed requirement, a timeout. Without a
concrete failure there are no grounds to escalate.
