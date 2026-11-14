---
id: director-apology-scene-never-cast-for-a-housemate-quarrel
title: "The apology scene plays again: a quarrel over a missed payment is with a housemate, and the casting rule refused every housemate"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/words-machine-pin-apology
pr: pending
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: rc6-scenes-repeat
source: Account lead, Nov 14 18:37Z; found by M1 pinning apology-variants.test.ts
checked: M1 2026-11-14
---

**What.** A missed payment strains the closest grown housemate and writes family.quarrel, but the apology scene went to the journal every time. Seen: at seed apology-pin in Ravalli MT, McGregor MN and Blue Ridge IN the quarrel is written and the scene now plays with the asker's opening and the whole talk.

**Cause.** Found in code: `apology` in `src/director/data/situation-types.json` carried `receive.counterpart: "apart"` (added with the casting rule, #8451, Nov 11), which refuses any asker who lives in the person's household (`receives` in `src/director/scheduling.ts`), while `src/core2/modules/quarrel.ts` picks only a housemate. The scene could not be cast in any world after Nov 11.

**Fix.** Set the apology's counterpart rule to `any` (the asker is a housemate by design; the rule still guards the scenes that arrive from outside). Pin `apology-variants.test.ts` to the three named places. Check the other 34 types that carry `apart` (audit at /mnt/project-files/words-lead/words-machine/apart-types-audit.md).

**Time box.** 2 hours, Sonnet.

**Rules.** No dice; one rule, all 56 places: the rule is data on the type.

**Done when.** The scene plays at Ravalli MT, McGregor MN and Blue Ridge IN (seed apology-pin, attempts 0 to 2) with the replay at /mnt/project-files/words-lead/apology-replay.md; apology-variants.test.ts passes at the pinned places; a second session replays the apology at a drawn place and seed and names them.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/apology-variants.test.ts, scripts/dialogue-batch/apology-replay.ts

**Notes.** Built by M1 on claude/words-machine-pin-apology; the PR waits for #9274 to fold.
