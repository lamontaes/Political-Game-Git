---
id: gov-single-holder-post-given-to-more-than-one-person
title: "A post that has one holder (a town clerk) is given to more than one person at a place"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: wire-office
source: Journal builder, Nov 15, 2026, replay of New Haven, Vermont (seed c9053b03e98d459361bb0fc1feab0c7eaaa5f1ad789861d85de6bc69a18ad2f8, place key 5048550) on #9119
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A player's mother and father both show as "a town clerk at the Town of New Haven" in the Journal's household lines. A post with one seat has two people in it. The fault is a class: any single-holder post (clerk, registrar, treasurer, a department head) can be given to more than one person, not only this household. Seen: the Journal's household lines and the town offices list show two holders of one clerk's post.

**Cause.** Found in code: the public post's job id is keyed by post and person (`job:public:<post>:<personId>`, src/core2/public-payroll.ts line 75), and the only check on opening one is that this same person does not already hold it. Nothing asks whether another person already holds a post that has one seat. Which caller opened both clerk jobs at world build (the opening staff, the household seeding or the jobs engine's own fill) is not yet read, and the fix starts there.

**Fix.** Make the post's own record say how many seats it has and refuse, at the one place that opens a public post, a second living holder of a one-seat post. The caller that wanted a second holder takes the seat only when the first has left it.

**Time box.** 2 hours; if not done, push what exists and write the handoff.

**Rules.** Fix at the post's own record, not by hiding the second holder in the Journal. One rule, all 56 places; no named place in logic.

**Done when.** A second session opens New Haven, Vermont at that seed in the running game, reads the town offices and the player's household, and sees one town clerk and one parent's job named in the Journal. A check over drawn places, each named with its seed, finds no one-seat post with more than one living holder, and the PR names the record ids of the two clerk jobs found and which engine made each.

**Waits on.** Nothing.

**Files.** src/core2/public-payroll.ts, src/core2/modules/jobs.ts
