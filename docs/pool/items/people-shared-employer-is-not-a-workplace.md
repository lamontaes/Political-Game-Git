---
id: people-shared-employer-is-not-a-workplace
title: "Two people paid by one government are not coworkers who have met"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead, Nov 15 20:31Z, from #9489's replay (coworker left out of metThroughPast)
---

**What.** The shared-history read calls two people coworkers when one employer's records hold both of their jobs. For a state government that employer pays the governor and every legislator, so the governor and each lawmaker read as coworkers who shared work. In #9489's replay of the 48 veto talks, that row made governors and senators skip their introduction as if they had met. Coworker was therefore left out of the rule that says who has met, and talk between real coworkers loses that.
Seen: at La Verkin, Utah (seed 93c0f1a7d2b4e568, the veto replay on #9489), the governor and a state senator who had never met skipped their introduction until coworker was taken out of the rule.

**Cause.** Found in code: src/core2/shared-history.ts function sharedWork (line 126) counts any two jobs at one organization (jobsAt over the whole staff) as shared work, with no workplace, department or span; the registered stopgap SG-P15-coworker-groups says the workgroup exists only for the opening day's meetings (meetAtWork), not for this read.

**Fix.** Make sharedWork read the same workgroup the opening meetings use (the employer's seeded workgroups, or a government's offices and bodies as their own workplaces), so two people share work only where they share a workgroup; then add `coworker` back to conversation-rules.json metThroughPast. Where the player sees it: a coworker of the player's own workgroup no longer introduces themselves as a stranger, and a governor and a senator no longer read as coworkers.

**Time box.** 3 hours, one Opus session at medium effort.

**Rules.** Wire to the world: who shared work is read from the jobs engine's records and the workgroups the encounters engine already uses, never a new list. One rule, all 56 places: the same read for every employer, a state government included.

**Done when.** At a drawn place with a seed nobody chose, a governor and a legislator read no coworker row, two people in one workgroup do, and with `coworker` back in metThroughPast neither of those talks opens wrong; a second session sees it in dev mode.

**Waits on.** #9489 (metThroughPast).

**Files.** src/core2/shared-history.ts, src/director/data/conversation-rules.json, src/core2/data/stopgaps/p15.json
