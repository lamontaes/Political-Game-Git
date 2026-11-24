---
id: play-law-page-counted-here-counts-people-elsewhere
title: "The law page counts people outside the town as more in households here"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The law page's "What this did" says "100,562 more in households here" for a federal Medicare tax raise in Eveleth, Minnesota, a town of about 3,500. The count is every counted person the law reached, in the state and the country, labeled as here. Seen: Politics, Issues, Medicare tax rate (/mnt/project-files/laws/federal-medicare-tax-what-this-did.png).

**Cause.** Measured: Eveleth, Minnesota (2719934), seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train 9ed4bf9c, federal Medicare tax bill H.R. 3. Found in code: src/core2/law-reach/applied.ts `lawReach` splits full people by whether they live in the town (`fullPeopleInTown`, `fullPeopleElsewhere`) but keeps one `counted` total; src/bench/law-did.ts passes it as `counted`, and src/bench/data/controls.json line 964 words it "{n} more in households here".

**Fix.** Split `counted` in `lawReach` the same way full people are split (in the town's place or elsewhere, from each applied row's place), pass both from `lawDid`, and word the second as elsewhere through the controls file.

**Time box.** 1.5 hours for one Sonnet session.

**Rules.** One model, two tiers: counted people are split by the same rule as full people.

**Done when.** A second session, not the builder, passes a federal tax bill in dev mode in a drawn place; the law page's count here is no more than the town's people, and a second line counts households elsewhere.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/applied.ts, src/bench/law-did.ts, src/bench/data/controls.json
