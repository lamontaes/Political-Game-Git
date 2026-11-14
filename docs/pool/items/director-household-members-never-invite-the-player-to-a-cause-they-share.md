---
id: director-household-members-never-invite-the-player-to-a-cause-they-share
title: "A household member who shares a cause with the player never invites them to it: the cause-invite scene refuses every housemate"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: rc6-scenes-repeat
source: Account lead, Nov 14 19:23Z; found by M1 while auditing the `apart` casting rule
checked: M1 2026-11-14
---

**What.** In two played years at each of three pinned places (seeds apart-1, apart-2, apart-3, `scripts/dialogue-batch/scene-year.ts --days 730`) the casting rule refused the cause-invite scene 21 times because the recruiter lives in the player's household, and the cause went to the journal. People at home who share a cause with the player never invite them to it. Seen: the player is invited to a cause by someone from outside the home, never by a housemate who belongs to it.

**Cause.** Measured: with `node --import tsx scripts/dialogue-batch/scene-year.ts --seed apart-1 --days 730` and `receives` logged in `src/director/scheduling.ts` (not kept), cause-invite refused 21 housemate askers in those six years; `cause-invite` in `src/director/data/situation-types.json` carries `receive.counterpart: "apart"` (the casting rule of #8451, Nov 11: nobody who lives with the player "comes to the house"), and its settings are public and other-home, so the rule's reason (someone arriving at the house) does not apply to a housemate who invites in the town.

**Fix.** Decide with the Words lead whether a housemate's invitation is a scene (the setting then must not say they arrive, and the opener must read the record of who is home) or a journal line; set `receive.counterpart` to match and fix the narration the same way as the apology scene (`director-apology-scene-never-cast-for-a-housemate-quarrel`). Check the other `apart` types listed in `/mnt/project-files/words-lead/words-machine/apart-types-audit.md` that refused a housemate in the same run: job-offer 3, rival-word 2, action-confront 1 (these are the rule working: a housemate does not phone, or bring word at the door).

**Time box.** 2 hours, Sonnet.

**Rules.** No dice; one rule, all 56 places. No hand-written player text: any new opener is a bank line from the Words lead.

**Done when.** At three drawn places (name each place and seed) in two played years, a housemate who shares a cause invites the player to it in a scene, or the decision to keep it a journal line is written with its reason; `scene-year` shows zero cause-invite refusals of a housemate recruiter that the decision allows. A second session replays it.

**Waits on.** `director-apology-scene-never-cast-for-a-housemate-quarrel` (the same casting decision).

**Files.** src/director/data/situation-types.json, data/english/parts/scene-talk.json

**Notes.** Filed by M1 on branch claude/words-machine-pin-apology.
