---
id: elections-measures-from-the-world
title: "Ballot measures reach the ballot from the world's own legislatures and petitions, not only the 2026 list"
area: elections
lead: wire-elections
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "Traits lead, Oct 28 (traits-decisions-fire-in-play)"
after:
standard: 2
model: opus
effort: high
root: rc1-world-outside-town
checked: fable 2026-11-10
---

**What.** Every ballot measure in play comes from `src/core2/data/elections/ballot-measures.json`: 17 measures in 11 states, all on the 2026 ballot. A place in the other 45 jurisdictions never votes on a measure, and after 2026 no place does, so the voter's measure decision (`ballot-measures.vote`) and the campaigns for and against a measure stop. The owner ruled measures in for early access (Oct 14: the player votes on them and campaigns for or against them). The world should put measures on the ballot the way states do: a legislature refers an amendment or a law where the state's constitution requires a public vote, and a petition qualifies an initiative or referendum where the state's law allows one, read from the state's law rows. Seen: ballot measures on your ballot after 2026 and in every state, which you vote on and campaign for or against (owner, Oct 14).

**Cause.** Design: owner ruling Oct 14 that measures are in for early access, and the Oct 27 "realistic, not real" ruling (both in `docs/coordination/OWNER-DECISIONS.md`). Found in code: `src/core2/modules/ballot-measures.ts` imports the 2026 list at line 19 and nothing else produces a measure row.

**Fix.** Let the legislature engine refer an amendment or a law where the state's constitution requires a public vote, and let the petition engine qualify an initiative or referendum where the state's law allows one. Each writes a measure row that the ballot-measures module reads; whether a state allows either comes from state law rows in data (the starting-law research files under `data/research/laws` name initiatives), never a state in logic.

**Time box.** 8 hours for one opus session.

**Rules.** Realistic, not real (owner, Oct 27): the 2026 list calibrates the opening and the per-world rate; later measures come from the simulation, so one save's ballot differs from another's. One engine per mechanic: the legislature engine's referral and the existing petition engine (recalls and filing petitions) produce the measure row; the ballot-measures module reads it, with no second measure engine. One rule, all 56 places: whether a state allows initiatives or requires a vote is data, never a state named in logic. Wire to the world and An effect is a read: a measure row counts only when the voter decision and the campaigns read it.

**Done when.** A second session plays a year of `buildBenchWorld` (two-level, every module) in a place drawn from all 56 whose state's law allows a measure, with a seed the builder did not choose and the window covering a general election after 2026. At least one measure reaches the ballot from a legislature's referral or a qualified petition, named by its measure record id and the bill or petition record id it came from, and `ballot-measures.vote` shows calls above zero in `scripts/traits/trait-wiring-audit.ts` with `TRAIT_AUDIT_ELECTION=1`. The ballot on election day and the campaign screens' measure fights show it. A test fails when the producer is removed.

**Waits on.** Nothing.

**Files.** src/core2/modules/ballot-measures.ts, src/core2/modules/legislature.ts, src/core2/data/elections/ballot-measures.json, src/core2/data/laws, scripts/traits/trait-wiring-audit.ts

**Notes.** Filed Oct 28 by the traits lead: in place 2474560, seed 092b17e0e593 (election window December 3, 2025 to December 3, 2026) the measure vote had no calls because that state has none on the list. Look-first: `OWNER-DECISIONS.md` (Oct 14, measures in early access; writing one is not), `DECISION-REGISTER.md` line 36 and line 1198 (a pending measure starts not in force).
