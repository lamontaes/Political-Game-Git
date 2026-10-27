---
name: player-screen-text
description: Checks every string a player of Our Civic Duty can see for developer text (record kinds, ids, ISO dates, unrounded numbers, status codes, debug labels) and for figures that contradict each other. Use before opening or merging any PR that touches src/bench, src/director or data/english, when writing a screen's labels, and in playtests.
---

# Player screen text

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

`docs/play-first/LAW.md` (lines 91 and 94): nothing ships in developer speak; player screens get no developer text. On Oct 26 the owner still met every item below in one sitting. No automated check enforces this yet: the planned screen-text test does not exist, and `tests/e2e/runtime-text-audit.spec.ts`, which `src/english/runtime-text-origin.ts` names as its audit, is not on main. So every builder and merger checks by hand.

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
- Labels come from a worded table (the controls file or the English engine), never a fallback that prints the raw key.
- A test that asserts one of the above (`politics.browser.mjs` requiring an ISO service date, `news.browser.mjs` requiring the masthead "News") is fixed in the same PR, never kept.
- **Merger:** any of the above in the diff or the after screenshot is a send-back naming file and line.
