---
id: words-office-hours-says-the-act
title: "Office hours names a made-up office, lies about calls nobody made, and tells a relative's custody case as a lost job"
area: director
kind: bug
priority: 1
size: M
status: open
standard: 2
root: none
claimed-by: civic-roles-builder
pr:
after:
blocked-on:
lead: words
source: "Owner, Nov 15 20:34Z, his read of scene 0101 (office hours) on the Scenes page; Words lead rules 136 to 140 and lines, /mnt/project-files/words-lead/office-hours/lines.md"
model: opus
effort: medium
---

**What.** At office hours the official's replies name "the workforce office" or "the labor standards office", which no place's records hold, and three replies lie that a call was already made to a resident the player has never met. A case about a relative in custody is told with the lines for someone out of work. The owner read scene 0101 and asked whether the workforce office is made up, and called the lie replies a presumption. Seen: on the Scenes page's scene 0101 and in any played office-hours visit.

**Cause.** Found in code: `caseFacts` in src/director/constituent-help-facts.ts set `agency` from `agencyByProblem` in src/director/data/constituent-help-facts.json, a list of office names no record holds, and every case-help reply, follow and close required it. `caseFacts` set `problem-work` for every case that was not a wage complaint, so a `family-in-custody` case (`problemOf` in src/core2/modules/constituent-cases.ts) took the out-of-work lines. The constituent-help arc in src/director/data/purpose-arcs.json offered `lie` as a reply.

**Fix.** Ruled by the Words lead, Nov 15 21:25Z, with the lines written by them. `agencyByProblem` and the `agency` fact are deleted; the replies say the act the engine writes (`recordReferral` puts the person forward to employers; `raiseOne` presses the wage up to the floor). `lie` comes off the scene's replies, with its endings. Each case gets its own problem fact, `problem-custody` included, so the work and wage lines never reach a custody case. The ask-signature promise "I'll ask the workforce office what they have" is deleted: no ending keeps it and no engine reads it (the Account lead, Nov 15).

**Time box.** 4 hours, Opus.

**Rules.** Rule 138 (Words lead, Nov 15): every office a line names is one the place's records hold; otherwise the line says the act. No dice: the case's outcome is the scene's ending read by the cases engine.

**Done when.** In a played world built with buildBenchWorld at Taylors, South Carolina (4571395), seed office-hours-a, and two more named towns, a played file at the PR's sha shows, by record id, office-hours visits where the official's presses say a promise, an aide offer, a desk offer, each decline, an apology after a press and the two leave lines, for a case out of work and one short of pay, with an official holding other cases and one holding none; no line names an office, and no custody case hears a work or wage line. A second session sees an office-hours visit in a drawn place it names with its seed.

**Waits on.** Custody lines from the Words lead.

**Files.** src/director/constituent-help-facts.ts, src/director/data/constituent-help-facts.json, src/director/data/purpose-arcs.json, src/director/data/arc-variants.json, data/english/parts/scene-talk.json, data/english/scene-move-sets.json

**Notes.** Filed by hand by the civic roles builder, Nov 15.
