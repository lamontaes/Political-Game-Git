---
id: laws-filing-positions-are-the-seats-own-issues
title: "The positions a candidate can take when filing are the issues that seat's own body decides"
area: elections
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/laws-filing-positions-own-issues
pr: #6274
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: laws-effects
milestone: play-first
claimed-at: 2026-10-27T07:09:55.079Z
---

**What.** The filing panel for a borough council seat shows thirteen position dropdowns, all set to a dash, on questions a borough council cannot decide: limit groundwater withdrawal, protect farmland, cap consumer loan rates, legalize cannabis sales, ban discrimination in housing and work, restrict abortion, public funds for private schooling, raise the teacher minimum salary, universal preschool, a bottle deposit, a clean air plan for polluted counties, a clean electricity standard, and a price on carbon. Filing went through with all thirteen blank and no prompt. The owner: "This screen, the council members, thing on the right, that looks like a dev panel. I don't know why that's there, but that's an example of a submenu that I mean." The list is one constant (PLATFORM_QUESTIONS in src/core2/campaign-views.ts) used for every contest. This item reads each contest's positions from the policies that body's powers cover in that place.

**Rules.** Serves LAW.md §11, The world on screen makes sense (Why, every time, OD:190) and LAW.md §8, Dev-speak. Wire to the world: a position is a policy the office can change, read from the body's powers. One rule, all 56 places: no place is named in logic; each body's powers are data. An effect is a read, not a record: the filed stance is read by the campaign engine when it weighs the race. This is a game, not a spreadsheet.

**Done when.** In a drawn place's council and mayor filings, and in a state legislature or governor filing in the same world, every listed position is a policy that body's own powers cover (a test reads the body's allowed policies by record id and fails on a listed position outside them); a borough council seat lists none that only a state or the federal government can change; the panel shows no dash-only rows; shown by screenshots of a local panel and a state panel with the place and seed named.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** When you file for council the positions you can take are things a council actually decides.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/campaign-views.ts, src/bench/filing.ts, src/bench/play.mjs, src/bench/filing.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "that looks like a dev panel. I don't know why that's there, but that's an example of a submenu that I mean." The panel's dev text (raw dates, "AGE 35 / 18", the residency line) is play-stop-02-developer-text-on-play-screens-b and play-screens-codes-and-iso-dates. Filing with every position blank and no prompt is recorded here as seen; no ruling says what should happen, so the CTO asks if it matters once the list is right. Lead: laws-effects (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
