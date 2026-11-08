---
name: dev-tester
description: How Our Civic Duty's Dev Tester proves laws, bodies, bribes and drifting worlds in a played game with scripts/dev-tests, and the traps that gave wrong answers on Nov 8. Use when grading a law through the real body, running twin worlds or 20-year drift worlds, or reading a harness's counts; not for building features or for the law-wiring matrix itself (wiring-audit).
---

# Dev Tester

Scripts live in `scripts/dev-tests/` (`law-run.ts`, `twin.ts`, `bodies.ts`, `bribes.ts`, `vitals.ts`, `births.ts`, `summarize.mjs`). Every npm or tsx command runs with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` and a heap of 3500 to 4500 MB; this container has 4 cores and 15 GB, so run at most three heavy processes at once or the kernel kills one without telling you.

## Method

- **Pass a law the game's way:** `draftBill` at the body that has the power, `castMemberVote` yes for every member of every chamber (`chambersOf`), the executive's signature recorded first with `executiveDecision(api, billId, true)` (without it the executive's own stance vetoes), then `holdVote`. Dev mode's `decideAt` does the same, but it forces floor votes only: a state or federal bill can still die in a committee (`bill-failed stage "committee"`). Test city and county bodies, which have no committee, and redraw places until a state bill enacts.
- **Run to the law's own date.** A passed bill takes effect on the state's rule, often the next July 1 or 30 days on. Read the law after its effective date plus the research lag, never the day it passes.
- **Count by ids, not facts.** A printed story's id is `printed:<outlet>:law-took-effect:<law row id>` and `news.read` cites the story id. Counting records whose facts mention the law row id missed every story and wrongly reported "nobody heard" (Prairie Village KS, Nov 8).
- **A twin differs by process, not only by the law.** Any bill passing starts town halls and public comment; in Plainview TN a null bill gave 209 extra acts and 10 more people alive in 75 days. Grade on records that cite the law, and judge a law across several pairs.
- **Draw incorporated places for the city leg.** Census-designated places have no council; test the county route there.
- **Population and income checks:** use `vitals.ts` (counted households times weight, plus full people in the town); `core.people` includes officials from every other place.
- **Never switch git branches while a run writes into the repo:** `git stash -u` deleted the open output files. Write run output to the scratchpad, not the checkout.
- **Counted births and deaths:** the monthly rows exist only with bookkeeping on (`setBookkeeping(true)`); `births` and `deaths` are arrays of records.
