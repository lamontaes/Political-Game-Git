---
name: model-effort
description: >
  Use when starting any session, subagent or package. Codex builds broad and
  data-heavy work at medium, and high only with a stated reason. The Claude
  engineering account builds the critical path at Sonnet high (Opus high for
  judgment-heavy design). A separate Claude session finishes (Sonnet high for
  agreed designs and checks, Opus high only for judgment calls).
  Balance usage and effectiveness, leaning toward thrift.
---

# Who builds, who finishes, and at what effort (owner, Oct 10, 2026)

The owner pays for every session. Balance usage against effectiveness:
normally lean toward saving usage (about 60–65% thrift, 35–40% raw power);
near or right after a usage reset, about even or tilted toward effectiveness.
Not the cheapest possible, never the top level by default, and state the
reason in the package.

## Who does what

- **Codex (GPT-6.1 Sol) builds** modules, ports, data and tests on draft PRs.
  Default effort: **medium**. Use **high** only for core architecture, money
  conservation or rules every port depends on, and say so. Use extra-high only
  after high failed at a named task.
- **The Claude engineering account builds** the critical path and work where
  mistakes cost most: core speed, money, people modeling, and work orders the
  CTO assigns to it (owner, Oct 11). Default effort: **Sonnet at high**;
  **Opus at high** for judgment-heavy design.
- **The pillars** (owner, Oct 11; "The team" in `AGENTS.md`): OPUS-CORE and OPUS-PEOPLE at Opus high, OPUS-GOV, OPUS-PLAY and OPUS-WORLD at Opus medium (Opus 5.5's medium matches the previous Opus at high), FIXER at Sonnet high.
- **A separate Claude session finishes**, never the session that built it. Checks stay light. Checkers play the evening build and file bugs. They never hold builders up. **Sonnet at high** checks agreed
  designs, tests and tooling, and plays features in the bench. **Opus at
  high** is for judgment calls: core design, people modeling, disputed
  results. **Max** only after high failed at a named task. Medium for small,
  clear fixes.
- **Helpers, the 3-2-1 rule (owner, Oct 14, 2026):** each session may run
  three Haiku, or two Sonnet, or one Opus. Only for parallel work or
  research and reading, never to pass the session's own job along. Each is
  bounded and read-only unless the package says otherwise. Codex keeps its
  repository setting of two. **Audit exception:** one Opus session with up to
  ten Haiku agents (one bounded path each) and one Sonnet agent that verifies
  every Haiku claim against the code.
- **One package per session.** Start fresh for the next package.

## Check your own work

Before asking for a bigger model or more effort, name the specific way the
current one failed: wrong output, a missed requirement, a timeout. Without a
concrete failure there are no grounds to escalate.
