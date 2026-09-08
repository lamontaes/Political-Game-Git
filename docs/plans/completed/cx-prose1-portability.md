# CX-PROSE1 — Codex civic-prose portability

Status: implemented and locally verified; independent review pending; leave unmerged.
Base: live origin/main `1a91101ab4f5369aeec21c6e9f32c21114794c81`.
Worktree: `/private/tmp/pg-cx-prose1`; branch: `codex/cx-prose1-portability`.

Port the accepted Claude skill byte-identically and adapt only agent provider
configuration and skill paths. Claude remains editorial authority. Preserve
separate writer/reviewer sessions, output contracts, holdout hygiene, and the
no-runtime-LLM boundary. No source prose, runtime, Claude, or AGENTS.md edits.

1. Copy skill and create read-only Codex custom agents.
2. Add automatically discovered portability regressions.
3. Validate with the installed Codex reader and fresh non-holdout writer and
   independent reviewer sessions; document any named-agent surface limitation.
4. Run prose probes/hygiene, focused tests, full validation, required art
   commands, diff check, and exact-head CI. Open a draft PR and leave unmerged.

Official conventions checked 2026-09-07:

- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/agent-configuration/subagents

Architecture check: development tooling only; D-010 and the pure simulation
boundary remain intact. No new persistent domain concept or stage gate change.

## Implementation and verification

The entire skill tree (8 files) is copied byte-identically, with no editorial
adaptation. Two TOML agents retain the accepted role bodies with skill path
adaptation; Claude-only launch advice and model metadata are replaced by
Codex session configuration. Writer loading is explicit. Neither agent pins a
model or effort. Four portability tests protect inventory, bytes, role bodies,
valid constrained TOML syntax, and Codex holdout hygiene. The existing hygiene
CLI now scans the Codex trees; package.json and AGENTS.md are unchanged.

Codex CLI 0.153.4: the bundled skill validator passes; app-server skills/list
reports civic-prose enabled with repo scope and no skill errors. config/read
succeeds. Both TOML files parse with tomli. More decisively, actual named-agent
launches load each exact developer instruction body into separate child
sessions, with the expected agentRole, read-only sandbox, GPT-6 Astra, and low
effort. The model/effort came from this test session, not the checked-in files.
See [agent reader evidence](../../agent/evidence/cx-prose1/codex-agent-validation.json).

Three fresh writer runs use packet-only extracts from the existing synthetic
channel-invention, date-invention, and note-plain-passes probes. All three
outputs pass the deterministic gate and fresh independent reviewer sessions.
Eight additional reviewer cases (including the named reviewer) correctly
separate supported candidates from unsupported date/time, delivery, scope,
identity, and surface claims. No malformed verdicts or reviewer rewrites.
See [raw smoke outputs and session IDs](../../agent/evidence/cx-prose1/smoke-results.json).
No holdout source was fetched or incorporated. Smoke outputs are verification
evidence, not added calibration examples or owner-approved prose.

No named-agent loading limitation was found in this build. The compact exec
JSON stream omitted spawn details, but app-server thread history and the child
session records prove loading. The parent initially summarized a valid writer
result into an invalid envelope: consumers must use the raw child result.
The separate-session fallback is also proved with three writer and ten reviewer
sessions and documented in the prose-eval README. It reads the same TOML role
instructions into a fresh read-only Codex session, without writer reasoning.

Checks completed: 21/21 deterministic probes; hygiene over 43 files; four
portability tests; skill/config/agent validation; writer/reviewer smokes;
format, lint, typecheck, source validation (11 domains), byte-identical source
replay, build, deterministic demo, validate:art, inventory:art (322 items),
qa:art, and git diff --check. Initial npm run validate reached 2,460 passed
and four five-second test timeouts under default worker concurrency. A full
suite rerun with two workers retains the original timeout threshold and passes
all 2,464 tests across 139 files. The focused CLI/portability run passes 13/13.
Exact-head CI is recorded in the draft PR. Before publication, origin/main had
advanced to `333eeb12b3df4322aaebe6dfa987a653bf143223`; the original live-main
base remains recorded above.

## LEARN and acceptance

Protect the copied contract with byte/inventory checks rather than a second
editorial specification. Verify custom-agent role and instruction loading from
actual child session records; compact event streams and parent claims are
insufficient. Consume raw result/verdict blocks through the existing fail-closed
gates. These lessons are encoded in the focused tests and invocation guide.

No domain/runtime changes, Claude edits, player-facing source rewrites, or broad
project instruction changes. No owner style acceptance is claimed. Independent
portability review remains pending; draft PR must remain unmerged.
