# SKILL-OPS1 — project skills and delegation controls

Status: implementation complete on `codex/skill-ops1`; leave one draft PR open
and unmerged.

## Authority and baseline

- Current-control packet: `CODEX-TRANSFER-01`, section I — SKILL-OPS1.
- Base and initial upstream: `origin/main` at
  `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.
- Isolated worktree: `/private/tmp/pg-skill-ops1`.
- Installed supported interface: Codex CLI `0.153.4`; `multi_agent` and
  `skill_search` are enabled. The bundled model catalog includes
  `gpt-5.6-sol` with `medium` reasoning.
- Official contracts: `https://learn.chatgpt.com/docs/build-skills`,
  `https://learn.chatgpt.com/docs/agent-configuration/subagents`, and the
  Codex configuration reference.
- DEV-LAB2 interface is consumed, not copied: `npm run dev:identified`, exact
  `/__dev/identity`, unique port/run/artifact/cache settings, and the existing
  Playwright harness. DEV-LAB2 owns its scripts and tests.
- VERSION-AUTO1-R1 retains ownership of release/security work. Root instruction
  edits here are limited to a short skills/delegation pointer.

## Bounded implementation

1. Add five small repository skill entrypoints: operations
   preflight/recovery/handoff; prose corpus and anchor-ledger reconciliation;
   browser/visual acceptance; source-to-runtime tracing; asset/scene admission.
2. Reuse existing workflows, system documents, scripts, and tests. Add no
   parallel validator and no feature-specific skill.
3. Permit concise, grounded context or recap in civic prose while continuing to
   reject redundant reintroduction and invented exposition. Preserve exact
   `.agents`/`.claude` skill mirrors and provider-adapted custom-agent bodies.
4. Add a trusted-project `.codex/config.toml` with the supported concurrent
   helper ceiling of two. Keep the default planned helper count at zero in
   instructions; do not set a project-wide default model/effort or weaken
   sandbox/approval settings.
5. Add focused discovery, trigger/nontrigger, link, config, portability, and
   prose-orientation regressions. Verify the real installed CLI via strict config,
   `skills/list`, `config/read`, model catalog, and focused tests.
6. Run the required repository gates on the exact delivered tree, re-fetch
   immediately before publication, publish one draft PR, observe exact-head CI
   once, and stop without merging or monitoring.

## Enforcement boundary

- The config ceiling is runtime-enforced for fresh trusted-project sessions.
- Trigger descriptions, zero-helper default, deliverable/rationale requirements,
  read-only preference, no-recursion rule, and parent integration are
  instruction-enforced. No claim will present them as a sandbox.
- Already-running sessions do not retroactively adopt new project config or
  newly discovered skill instructions; fresh sessions from a trusted checkout
  do. Skill file changes may be rediscovered by a current CLI scan, but that is
  not equivalent to reconfiguring an active parent session.

## Verification record

- Installed Codex `0.153.4` accepted `.codex/config.toml` under
  `--strict-config`. App-server `config/read` from this trusted checkout reported
  `max_concurrent_threads_per_session: 2`, no helper model/effort defaults,
  active `gpt-5.6-sol`/`medium`, and unchanged `on-request` approval plus
  `workspace-write` sandbox settings.
- A fresh `debug prompt-input` scan discovered `civic-prose` and all five bounded
  project skills from the repository `.agents/skills` root.
- One necessary ephemeral read-only routing probe used `gpt-5.6-sol`/`medium` to
  distinguish the five positive workflow cases, two nontriggers, and the
  existing civic-prose trigger. It made no file changes and spawned no team.
- `npm run test:skill-ops` passed 77 tests covering discovery metadata,
  trigger/nontrigger wording, linked interfaces, delegation config/root rules,
  civic orientation, DEV-LAB2 consumption, portability, and grounding.
- `npm run prose:eval -- probes` passed 23/23, including the new supported and
  invented-orientation probes. `npm run prose:eval -- hygiene` passed across 45
  skill/agent files. Repetitive orientation remains a semantic style boundary,
  backed by instructions/examples and independent review rather than falsely
  claimed as deterministic enforcement.

Final full-tree validation, the explicit art trio, publication SHA, and one
exact-head CI observation belong in the PR/completion report so this plan does
not require a post-validation source edit.

## Stop conditions

Stop on ambiguous ownership, unsupported config keys, source/ledger identity
conflict, changed server identity, missing provenance/rights/measurements, failed
visual acceptance, or an upstream movement that cannot be reconciled normally.
No global/personal config edits, helper team, recursive delegation, force push,
self-merge, automatic resumption, or recurring monitor.
