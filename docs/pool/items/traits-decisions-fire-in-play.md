---
id: traits-decisions-fire-in-play
title: "The personality decisions still silent in a played election year fire where their causes happen"
area: people
lead: traits
kind: wiring
priority: 1
size: M
status: claimed
claimed-by: claude/traits-fire-in-play
pr:
blocked-on:
source: "Traits lead restart, Oct 28 (CTO, on the owner's word: \"Same thing with the traits\")"
claimed-at: 2026-10-28T18:40:00.000Z
---

**What.** `traits-decisions-never-run` (done, #5886) gave each silent decision a gap row and taught the audit to play a place's election window, but 13 of 91 personality decisions still never fire in such a year. Measured Oct 28 on main (bf81afcfd) in place 2474560, seed 092b17e0e593, window December 3, 2025 to December 3, 2026 (`TRAIT_AUDIT_ELECTION=1`): corruption.tell, press.tip, recalls.organize, recalls.sign, recalls.vote (integrity chain); appointments.weigh, relationships.fall-out (rare people and government events); jobs.counted-retire, jobs.counted-look (work); ballot-measures.vote (no measure on that place's calendar); bring-it-up.blame, conversation.reply-reach, scene-talk.move (the player's own conversations, owned by Words). Each fires where its cause really happens through a producer in the engine that owns the moment (a read of an existing record), or carries a registered stopgap naming the engine; no new mechanic.

**Rules.** No dice: the trait and the situation decide each call, never a draw against a chance. Wire to the world: each decision is shown firing in a played year of `buildBenchWorld`, named by decision record id. Every system is already built (owner, Oct 27): a producer reads an existing record in the owning engine.

**Done when.** One PR per engine family (integrity, people and government, work and civic), each with one drawn-place proof: `scripts/traits/trait-wiring-audit.ts` with `TRAIT_AUDIT_ELECTION=1` on a played year of `buildBenchWorld` in a place drawn from all 56 (place and seed named) shows each family decision with calls above zero, the decision's record id and the trait that moved it, and the matrix (`docs/reports/trait-wiring-2026-10-20.json`) regenerated once per family PR. A decision that cannot fire carries a gap row in `data/content/trait-decision-gaps.json` and a stopgap in `src/core2/data/stopgaps.json` naming the engine and file. The director's three reads go to Words as `words-player-trait-reads-fire`.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/press.ts, src/core2/modules/recalls.ts, src/core2/appointments.ts, src/core2/closeness.ts, src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, data/content/trait-decisions.json, data/content/trait-decision-gaps.json, scripts/traits/trait-wiring-matrix.ts

**Notes.** Filed Oct 28 by the traits lead. Supersedes the "23 never run" count in the CTO's restart prompt: on the Oct 27 rebuild (Ely, Nevada, a year with no election) 21 of 90 never ran; in an election window 13 of 91 never do. Families: integrity (helper, branch claude/traits-fire-integrity), people and government (helper, branch claude/traits-fire-people), work and civic with the unemployment take-up (`research-unemployment-claim-take-up`, lead, branch claude/traits-ui-take-up).

Oct 29, 02:40 UTC (traits lead): the done-when is met; for the CTO or a merger to set done (`npm run pool -- status traits-decisions-fire-in-play done --by=cto`). All three family PRs merged: work #6681 (two stale counted rows deleted; filing for unemployment fires and weighs the benefit), integrity #6684 (bribes taken, telling weighed, recalls fire where their cause happens), people #6688 (appointments weighed on a vacancy, including a cabinet member who died in play; falling out fires once a grudge names a counted owner). The matrix on main was rebuilt on #6688 with all three families: Hillsboro, Virginia (5137288, seed 7100e8c6f85d) runs 72 of 89. Across nine drawn election windows played with the three families together, 85 of 89 fire in at least one. The four that never did each have their route: press.tip has a gap row and `SG-P15-bribe-falling-out-rare` (it needs a telling that is made, not declined), and the three director reads went to Words as `words-player-trait-reads-fire`. Ballot measures fire only where the state has one on the 2026 list (`elections-measures-from-the-world`).
