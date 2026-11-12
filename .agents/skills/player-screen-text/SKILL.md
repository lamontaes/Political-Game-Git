---
name: player-screen-text
description: Checks every string a player of Our Civic Duty can see for developer text (record kinds, ids, ISO dates, unrounded numbers, status codes, debug labels) and for figures that contradict each other. Use before opening or merging any PR that touches src/bench, src/director or data/english, when writing a screen's labels, and in playtests.
---

# Player screen text

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

`docs/play-first/LAW.md` (lines 91 and 94): nothing ships in developer speak; player screens get no developer text. On Oct 26 the owner still met every item below in one sitting. The checks that exist are the English guards (`tests/guards/english/player-text.test.ts`, `vocabulary.test.ts`, `sitting-bans.test.ts`, `spelling-dates-units.test.ts`) and the line rules (`npm run words:rules`); they catch banned words and some patterns, not every string. The audit `src/english/runtime-text-origin.ts` names (`tests/e2e/runtime-text-audit.spec.ts`) is not on main. So every builder and checker also reads the screens by hand, and a merger checks the diff and the after screenshot.

## Never on a player screen

- Dotted or colon record kinds: "Office.voted", "Press.printed", "Housing.completed", "Organization.recorded". (Cause: `kindName()` in `src/bench/play.mjs` splits only on ":".)
- Ids and codes: `term:`, `seat:`, "COUNCIL-1", "(2025, 1)", "on-ballot", "ON-BALLOT", "left-blank".
- ISO dates ("2025-01-20", "2026-01"). Dates read "January 20, 2025"; months read "January 2026".
- Numbers more precise than a person would say ("1162.7587481540313 looking"). Counts are whole; rates carry one decimal; money shows cents only where cents matter.
- Debug parentheticals and scores: "(counter: chief clerk)", "Views fit 0.87", "Mark gap", "medicare-tax 2 · 0 · $0.00".
- Raw record rows: "2018-01-01 – 2026-01-01 · in office at the opening · 2021-11-02 60%".
- Broken templates and bare role words: "Neither, much", "my parent Kendall".
- Words the owner rejected on a player screen: "Turnout 44 / 185", "Exit poll", "Where it was won the rest of the town".

## Figures that must agree

- The same figure in every sibling panel (one turnout in four races) needs an `ask-why` cause, or it is a defect.
- A total and its parts agree (votes cast against turnout).
- The clock, the light in the room and the narration agree: no sunlit room at 12:00 AM, no "Monday" on a Wednesday.

## How to check

- **Builder:** open every screen the PR touches in a drawn place (bench `/play`, 1440×900), read every string, and list the screens under "Screen text checked" in the PR body with place and seed.
- Labels come from a worded table (the controls file or the English engine), never a fallback that prints the raw key. If a screen needs a new line under `data/english/parts/`, list it on the pull request: only the Story session writes those lines (owner, Nov 10). A line a rule pulls (`data/english/pulled.json`) is not shown again until Story rewrites it.
- A test that asserts one of the above (`politics.browser.mjs` requiring an ISO service date, `news.browser.mjs` requiring the masthead "News") is fixed in the same PR, never kept.
- **Merger:** any of the above in the diff or the after screenshot is a send-back naming file and line.
- **A bill's number is never shown bare, and a date is always in words (owner, Nov 11: "Don't let dates go 2025-8 like how they are in the council member thing. Like, have August 2025 or something").** Under an ordinance's name the meeting printed "2025-8", its number, and it read as a date. A number goes through the English engine's `spokenDesignation` ("Ordinance 2025-8"); a date goes through the page's date words ("August 2025", "February 4, 2025"). A year, a dash and a number alone on a screen is a defect either way.
- **A list of names never carries a repeated word after each name (owner, Nov 11: "it looks like against is a name every time").** Put the word once, as a label with a count ("Spoke against · 6"), and the names after it.
- **A panel never half covers the people in the room (owner, Nov 11: "it's being covered up by the menu").** The strip of people stands in the room a side panel leaves, or is hidden when a menu takes the whole frame; nobody is cut in half. Check every new panel with people in the room.
