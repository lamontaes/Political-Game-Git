---
name: model-effort
description: >
  Use when starting any session, subagent or package. Codex builds at medium
  (high only with a stated reason); a separate Claude session finishes (Sonnet
  high for agreed designs and checks, Opus high only for judgment calls).
  Balance usage and effectiveness, leaning toward thrift.
---

# Who builds, who finishes, and at what effort (owner, Oct 10, 2026)

The owner pays for every session. Balance usage against effectiveness:
normally lean toward saving usage (about 60–65% thrift, 35–40% raw power);
near or right after a usage reset, about even or tilted toward effectiveness.
Not the cheapest possible, never the top level by default, and state the
reason in the package.

- **Codex (GPT-6.1 Sol) builds** modules, ports, data and tests on draft PRs.
  Default effort: **medium**. Use **high** only for core architecture, money
  conservation or rules every port depends on, and say so. Use extra-high only
  after high failed at a named task.
- **A separate Claude session finishes.** **Sonnet at high** checks agreed
  designs, tests and tooling, and plays features in the bench. **Opus at
  high** is for judgment calls: core design, people modeling, disputed
  results. **Max** only after high failed at a named task. Medium for small,
  clear fixes.
- **Helpers:** none by default; at most two for Codex and three for Claude,
  only when the work splits cleanly. Each is bounded and read-only unless the
  package says otherwise.
- **One package per session.** Start fresh for the next package.

## Check your own work

Before asking for a bigger model or more effort, name the specific way the
current one failed: wrong output, a missed requirement, a timeout. Without a
concrete failure there are no grounds to escalate.
