---
id: words-family-filing-line-claims-council
title: "The household's filing scene says the council has been asleep for ten years, to a candidate for any office"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: words/family-filing-names-the-office
pr: #6748
blocked-on:
source: "found by the words-and-scenes lead, Oct 27, in the campaign-season bench run"
lead: words
milestone: play-first
claimed-at: 2026-10-29T05:54:25.200Z
---

**What.** On filing day the household's scene (`family-filing`) has the player answer with "The council's been asleep for ten years. Somebody had to." In North Lynbrook, New York (run seed `season-a` of `src/director/campaign-season.test.ts` and `src/bench/campaign-season.browser.mjs`), the player is running for the town board, not a council. No record says the body was "asleep" or gives "ten years". The line names a body by a fixed word and claims a span no record holds. It is an Oct 15 authored piece in `data/english/parts/scene-talk.json`.

**Rules.** Serves LAW.md §4, Scenes and conversations: a line that claims something is said only when the record holds that fact, so the office comes from the filing's own record and no span of years is invented. Ask why: every claim in the line names the record that holds it.

**Done when.** The family-filing replies name the office from the filing's `office` fact and claim no span of years. Any part with a fixed body word (council, board, legislature) either requires the matching fact or is reworded. `tests/english-parts-banks.test.ts` and a family-filing compose in a drawn place with a non-council race show it.

**Time box.** 1 hour.

**You will see.** On filing day, the player's reply to their household names the office they filed for, never "the council" for a board seat, and claims no number of years.

**Screenshot.** Before and after of the family-filing talk, from a drawn place, in the PR body.

**Files.** data/english/parts/scene-talk.json

**Notes.** Found while taking the campaign-season screenshots (PR #6201).
