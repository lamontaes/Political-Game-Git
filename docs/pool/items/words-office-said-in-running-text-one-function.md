---
id: words-office-said-in-running-text-one-function
title: 'A scene says an office as its title ("your campaign for State Representative"); one said form for every scene'
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Words lead and the second words reader, Nov 14, the campaign manager scene
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** A father in the campaign manager scene says "your campaign for State Representative": the {office} slot is filled with the title as the record writes it. Seen: in the scenes the director builds from a campaign, an oath, a door and election night.

**Cause.** Found in code: three functions said an office in running text, none of them the one in `src/core2/person-work.ts` (`officeInSentence`): `titleInSentence` in `src/director/swearing-in.ts` (kept a title-case title as written; used for `office` in `src/director/purpose-scene.ts` at three sites), the raw `contest.title` in `src/bench/election-night.ts`, and the raw `office` fact in `src/bench/archive-words.ts`.

**Fix.** Every scene and talk fact that fills {office} takes `officeInSentence`; the old function in swearing-in.ts is deleted and its test reads the one function.

**Time box.** 2 hours, Sonnet.

**Rules.** No hand-written player text in code; replace, never layer.

**Done when.** A pinned test says each title form ("State Representative", "U.S. Senator", a form's note) as running text, and the director's scene facts for a campaign, an oath, a door and election night use it. A second session, on main, plays a campaign-manager offer and sees "your campaign for state representative".

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/swearing-in.ts, src/bench/election-night.ts, src/bench/archive-words.ts, src/core2/office-said-everywhere.test.ts

**Notes.** Built by S4.
