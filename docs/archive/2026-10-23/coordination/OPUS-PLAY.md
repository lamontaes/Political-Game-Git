# OPUS-PLAY

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only OPUS-PLAY writes this file. The rest of OPUS-PLAY's checklist is in `docs/coordination/play.md`.

## Dev mode

Branch `play/dev-mode`, draft PR #4181 to main. **What the owner can do now:** open `/dev`, or turn on the play screen's developer ring and choose **Dev mode** in its menu. Change any law at any level now or on a date; pick any person and make them take one of the choices the game offers them today; cast any council or board member's vote, hold a vote, sign or veto; move time by a day, week, month, year or to a date; open any record as a tree of what caused it, click down through votes, views, the speeches that moved them and who heard them, and press **Report** for a plain-text chain; watch public and private pay, the town's measures, the nation, budgets, prices and news by month; and run the $70,000 public-salary experiment on any seed.

- **Status:** built and checked. The old developer page at `/` is folded in and deleted (999 lines removed).
- **Found:** on Greenbrier, Tennessee (a seed I did not choose), a federal $70,000 public pay floor raised 16 of 17 public jobs on day one and 14 more as public jobs were refilled. Private median pay matched the same seed without the law in all 12 months. No engine reads public pay when setting private pay, and public employers opened no positions.
- **Public pay floor law** (CTO ruling): added to the law engine from this branch; OPUS-GOV owns it after merge (`SG-GOV-public-pay-floor-owner`).
- **Speed:** same seed, alone: plain clock 242 s a year, dev mode 251 s (+3.9%). The two-minute line is already missed here on main.
- **Sub-agents:** none.
- **Needs from other sessions:** OPUS-CORE's law-reach count (`SG-PLAY-dev-law-reach-full-only`); OPUS-CORE's save to refuse a release save carrying `devModeMarks`; OPUS-GOV to own the public pay floor law and add it to the bill catalog; a "why" recomputed from seeded history where none is saved (the trace shows only saved links today).
- **Owner questions:** the mode's name (the CTO ruled the public-salary base is a law).
- **Next PLAY item (CTO):** reconcile the play page to Kit 13's approved controls on `play/kit13-controls`.
