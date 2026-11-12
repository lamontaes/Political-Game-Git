---
id: core-private-tuition-beliefs-and-schools
title: "Private tuition enrollment follows the family's faith and the schools nearby, and moves as they change"
area: core
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
lead: m0-m2
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** SG-CORE-private-tuition-average still fakes enrollment: the opening ranks families by cash per child scaled by their faith's affinity for private schooling, but enrollment ignores which schools stand nearby or what the child needs, and the affinity is by faith only. Move each child's enrollment from the family's income, beliefs, the schools in reach and the child's needs, re-decided as those change (a job loss, a closing, a move), and close the stopgap row with the reader named. The owner ruled on private school (#5483) on Oct 20 (see docs/coordination/OWNER-DECISIONS.md). This item also absorbs core-stopgap-opening-private-tuition-aggregate-spending, which is only the roll-up of this row; re-enrollment (#5504) and counted families (#5633) are done.

**Cause.** Found in code: src/core2/opening-private-tuition.ts `withPrivateTuition` (line 66) ranks families by cash per child scaled by their faith's affinity and enrolls the best-off until the NCES private share; enrollment ignores the schools nearby and the child's needs. Row SG-CORE-private-tuition-average is open in src/core2/data/stopgaps/core.json, and src/core2/private-tuition-reenroll.ts re-ranks yearly.

**Fix.** Add src/core2/private-tuition-choice.ts (new): each child's enrollment from the family's income, beliefs, the schools in reach and the child's needs (owner ruling Oct 20), re-decided when those change. Delete the means-ranked quota in `withPrivateTuition` and the `stopgap(data.stopgapId)` marker, and resolve the row naming its three parts.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: enrollment follows money, beliefs and the schools nearby, never a percentage; real shares check the town total only. An effect is a read, not a record: the tuition flow and the school's roll read the enrollment record. One model, two tiers: counted families follow the same rule times their count. Replace, never layer: the opening-only ranking is deleted when the continuing rule replaces it.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (place and seed named in the PR body): a family whose income falls drops a child from a private school and a family that gains enrolls one, each shown by record id with the cash journal balanced, and the town's private share is reported beside the NCES share. src/core2/opening-private-tuition.test.ts and src/core2/private-tuition-reenroll.test.ts cover it, and SG-CORE-private-tuition-average is resolved in src/core2/data/stopgaps/core.json.

**Waits on.** Nothing.

**Files.** src/core2/opening-private-tuition.ts, src/core2/private-tuition-reenroll.ts, src/core2/private-tuition-choice.ts (new), src/core2/data/stopgaps/core.json, src/core2/opening-private-tuition.test.ts, src/core2/private-tuition-reenroll.test.ts

**Notes.** Reopened Oct 23: blocked with no blocked-on and the claimed branch claude/tuition-continuing is gone.

Oct 25 audit: From the dropped core-private-tuition-choice-reads-beliefs: a child's own needs also enter the choice (owner ruling Oct 20).

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have moved each child's private-school enrollment with the family's income, beliefs, nearby schools and the child's needs, and the player sees a child enrolled or not either way (the opening already ranks by cash and faith).
