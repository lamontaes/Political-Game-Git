---
id: laws-matrix-row-names-its-screen
title: "Each law's matrix row names the screens a player sees it on, read from the bench's own screen views in a played world"
area: laws
lead: laws-effects
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/laws-matrix-screens
pr: #6295
blocked-on:
source: CTO relay of the Oct 26 playtest (MERGE-FIRST.md: "your matrix row says on which screen a law shows", wiring-audit "wired is not seen")
claimed-at: 2026-10-27T11:18:34.741Z
---

**What.** The law matrix (`docs/reports/law-wiring-matrix.json`, built by `scripts/law-wiring/matrix.ts`) grades nine links measured headless, so 63 of 89 laws read "wired" while the Oct 26 playtest found that a player could not see most of them. No row says where a player sees its law. The bench's screens are pure views over the world: Issues (`governmentView`), Budgets (`budgetView`), a member's seat (`seatView` menus), Calendar (`calendarItems`) and News (heard stories and the town's public record). Each row should name the screens that show its law, with the record each screen read, in a played world.

**Rules.** Wire to the world and "wired is not seen" (wiring-audit): a row says on which screen a law shows, measured, never asserted. One rule, all 56 places: the world is drawn from all 56 with a seed the builder did not choose. No hand-written player text: the screens are named by the play page's own titles.

**Done when.** A script, `scripts/law-wiring/screens.ts`, plays a world from buildBenchWorld in a place drawn from all 56 for at least 180 days and reads each of the 89 laws through the bench's own screen views (Issues, Budgets, a local and a state member's seat, Calendar, News), writing each law's screens with the record id or row each read; `matrix.ts` carries them as a `screens` field on every row and a `shownOnAScreen` count in the summary; the table names each row's screens; and the PR body names the place, seed and count, with the laws shown on no screen listed.

**Time box.** 3 hours, the laws-and-effects lead.

**Files.** scripts/law-wiring/screens.ts, scripts/law-wiring/matrix.ts, docs/reports/law-wiring-matrix.json, docs/reports/law-wiring-table.md, docs/reports/law-wiring/screens.json

**Notes.** Filed by the laws-and-effects lead, Oct 27. Builds on `laws-in-force-every-question` (#6289), which puts every question's law on Issues. Closes the matrix half of `laws-player-bill-reaches-the-floor`; its floor screen is the lane's `play-legislature-floor-date-and-whip`.
