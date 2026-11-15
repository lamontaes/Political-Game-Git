---
id: people-counted-victims-lived-crime
title: "A counted group's lived-crime stance reaches neither its ballots nor a member filled in from it"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
lead: lives
checked: fable 2026-11-10
---

**What.** Since the views thread's PR (Nov 15), a counted group the crime engine victimizes moves its stance on the question the crime ties to by the full victim's rule times the share of its adults reached, citing the tally row (`liveCountedCrime` in src/core2/counted-news-views.ts), and the press reads it (`countedNewsConcern`). Two parts are still missing. A counted voter's view on a question (`countedViewOn` in src/core2/modules/views.ts) is read from their opening profile, not from their group's countedStances row, so the lived crime moves what the press reads and not how the group votes. And a member filled in from the group does not start from the group's stance. Seen: Feeds: the counted ballots of every race where crime is a question, and the views of a counted neighbor the player meets.

**Cause.** Found in code: `countedViewOn` in src/core2/modules/views.ts reads `groupStance(lean, question, countedStanceProfile(...))` with no countedStances term, and the fill-in writes no stance row from the group's. The same gap holds for news, registered as SG-PEOPLE-counted-readers-stories; the row SG-PEOPLE-counted-victims-lived-crime now names only these two parts.

**Fix.** Add the group's countedStances row to `countedViewOn` the way a full person's `viewOn` adds their own stance (`stanceViewWeight` times the signed strength), and start a member filled in from a counted group with the group's stance rows. One PR for news and lived crime alike; check with the paper thread that nobody is building the news part first.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group reached by a lived crime or a story moves by the full person's rule times its count, and that move reaches the same readers a full person's does. Ask why: the moved view cites the tally row or the story.

**Done when.** A second session runs a one-year buildBenchWorld in a drawn place (place and seed named) and sees a counted group's ballot appeal move with its countedStances row on a question its candidates differ on, and a member filled in from the group start from the group's stance.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/counted-news-views.ts, src/core2/data/stopgaps/people.json

**Notes.**

- Oct 24: found by the effects lead when Merger 3 sent back #5895 (web-views-lived-crime-moves-stance). Sibling of people-counted-readers-stances-from-stories.
- Nov 15 (views thread): the crime step is built (counted groups live their tallied crimes, test `src/core2/views-counted-victims.test.ts` at Gilliam, Missouri); this item now holds the two parts left, as the Account lead ruled.
