---
id: news-job-lost-story-kind
title: "A layoff or closure at a town's employer is a story the town's paper prints"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** A town in a played year has layoff and closure records and no news of them: the jobs engine writes work.job-lost with publicRecord false, and the press desk has no job-loss story kind, so the paper never prints one and the job-lost talk has nothing to bring up. Seen: the town paper's front page the month an employer lets people go. Seen: the town paper prints a story the month an employer lets people go.

**Cause.** Found in code: src/core2/modules/jobs.ts line 1924 area writes the work.job-lost event with publicRecord: false (news.ts line 677 and press.ts line 510 read the flag); src/core2/data/press/briefs.json has no job-loss kind; the words for one belong under data/english/parts, which only the Story session writes. Talk engines found no job-lost news in 365 days at three places (CTO, #10377, Nov 26).

**Fix.** Three parts, in order. (1) Jobs engine (Past and Day One): set publicRecord for a layoff or closure whose heads are a share of the town's jobs the desk's reach rule reads (press-desk-reach skill), so a handful of turnover layoffs stay private and an employer's cut or a closure is public; the share is read from the world, not a typed threshold. (2) Press desk: one story-kind row for a job loss in data/press/briefs.json with the fields the desk reads (employer, heads, cause by record id). (3) Story writes the headline, lede and body for the kind under data/english/parts; no session but Story writes those lines.

**Time box.** 6 hours

**Rules.** No dice: whether a layoff is public follows its size against the town and the outlet's reach, never a roll. Words are Story's alone (owner, Nov 10). One engine: the desk's existing reach rule decides which outlets print it.

**Done when.** A second session, at a drawn place and seed nobody chose, plays a year in dev mode, triggers an employer's layoff or closure from the dev control, and sees the town paper print a story naming the employer and the number of people, and the job-lost talk bring it up, each by the record id of the layoff.

**Waits on.** Story's lines for the kind.

**Files.** src/core2/modules/jobs.ts, src/core2/data/press/briefs.json, data/english/parts (Story only)
