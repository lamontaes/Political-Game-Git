---
id: play-stop-20-sister-born-a-week-apart-runs-public-works
title: "My sister was born seven days after me and is the city's Public Works Director at 18"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6080
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** I made Bo Snider, born February 3, 2007, in Anson, Texas on the v0.22.10 release. My sister Madison Stein lives in the same household and was born February 10, 2007, seven days later; she is not listed as a twin. On the first night she is a teenager in a letterman jacket; by December 2025, at 18 with no college shown, she is "Public Works Director · CITY OF ANSON treasury", a department head filed under the treasury. When she came to see me she said only "How's John?" about our father, by his first name, with him standing in the room. I expected siblings born at least months apart, a department head with experience, and a sister who calls our father Dad.

**Rules.** Serves LAW.md §5, Journal and the past; LAW.md §11, The world on screen makes sense. One model, two tiers: a household filled in around the player must match the records, including birth spacing and who can hold a job. No dice: who gets a director job follows qualifications and the hiring rule, not a draw that lands on an 18-year-old.

**Done when.** The owner does the same steps on the next build and is not stopped: a new life at 17 shows siblings born at least nine months apart (or twins marked as twins), no 18-year-old household member in a department-head job, and family talk lines that name a parent as a parent. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Your siblings are born at least nine months apart (or are marked as twins), and no 18-year-old in your house runs a city department.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/town-households.ts, src/core2/opening-employment.ts, src/core2/modules/jobs.ts, src/bench/family.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:19, 16:20; screenshot 63. Madison's card: person_fe994fe2c35f9900. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Sent back 2026-10-26 from PR #6080 (branch claude/play-stop-20-siblings, checked 6390a944fb): the Done-when still requires the owner timeline to prevent an unqualified 18-year-old department head and to name a shared parent as a parent; the change excludes 17-year-olds by birthday and suppresses shared-parent talk while its wording remains filed elsewhere. conversation.test.ts:710 additionally guards its positive turned-question check on backable without a positive replacement. Supply the missing qualification/timeline and parent-address evidence, or bound the completed slice while leaving the umbrella open; do not invent an arbitrary higher age threshold, replace seeds or weaken assertions. No green local gate is claimed. Finish on that branch, merge main into it first.
