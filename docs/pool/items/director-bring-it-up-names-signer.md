---
id: director-bring-it-up-names-signer
title: "A reader of a printed law story names who signed it when the story says so, as well as the outlet and subject"
area: director
kind: feature
priority: 3
size: S
status: blocked
claimed-by: claude/political-game-pool-yucp92-m
pr:
blocked-on: Words line: the item text is an empty shell and the change needs new bank sentences (src/director/mined) worded by the English engine, which only the Words session writes
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:46:39.336Z
---

**What.** When a neighbor brings up a law that took effect, `src/director/bring-it-up.ts` names the subject and the outlet that printed the story but deliberately blames no one ("a printed story blames no one"). The press story's facts already carry `decidedBy` and `decision` (for example "signed" by the governor's term), so a reader who read that line could say who signed it. Let a reader name the signer when the story they read recorded one.

**Rules.** Ask why: a person names only what they read or were told, citing the story's own record. No hand-written player text: the line comes from the bring-it-up bank, mined and graded.

**Done when.** In a played world in a drawn place, a reader of a law-took-effect story brings it up and names the official the story says decided it, with the story's record id as the source, shown by a test beside src/director/bring-it-up-law.test.ts.

**Files.** src/director/bring-it-up.ts, data/english/parts/bring-it-up.json, src/director/bring-it-up-law.test.ts

**Notes.** Found Oct 19 verifying M4-05 (people raise it and know who was responsible). The outlet-only rule may be the owner's intent; if so, drop this.
