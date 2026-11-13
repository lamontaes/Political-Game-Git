---
id: core-advanced-start-player-id-stays-on-the-entrant
title: "After an Advanced start, the core's player id still names the generated entrant, so the world speaks and acts for the officeholder the player chose (Altoona, Kansas)"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Altoona, Kansas, seed 9d1602a6-7186-4503-bda6-d51f9383c2be)
---

**What.** On main 596d5127, an Advanced start in Altoona, Kansas (seed 9d1602a6-7186-4503-bda6-d51f9383c2be), stepping in as Mayor Adam Murphy and played by Week. Every council meeting's panel lists the player among the public's speakers, a choice the player never made: Feb 5, 2025, "SPOKE AGAINST · 3 / Adam Murphy, Ian Potts, Mila Maynard"; May 7, the same; Aug 6, "SPOKE AGAINST · 5 / Adam Murphy, ...". Public comment leaves out "the player" (`p.id !== core.playerId`, `src/core2/modules/meetings.ts`, line 398), so Adam is not being treated as the player. Seen: after an Advanced start, nothing the world does picks the chosen officeholder as if they were someone else, and every rule that holds the player's choices for the player holds them for that officeholder.

**Cause.** Found in code: `core.playerId` is set once, when the world is built, to the generated entrant (`entrantOf`, `src/bench/world.ts`, line 417). Stepping in as an officeholder calls `/api/play`, which runs `PlayerSession.select` (`src/bench/player.ts`, line 80). That moves the clock and the director's watch to the chosen person and binds explicit control, but never changes `core.playerId`. About 130 reads in `src/core2` use `playerId` as "the player" (public comment, campaign donors and volunteers in `campaigns.ts` line 4278, and readers in press, offices, elections, jobs, moves and more), against 34 that use `isExplicitlyControlledPersonV1`. In an Advanced start the two name different people, so the first kind protects the entrant and lets the world act for the officeholder.

**Fix.** One reader for "is this the player": `isPlayerSeat` (already in `src/core2/modules/corruption.ts`, `personId === playerId || isExplicitlyControlledPersonV1(...)`) moves to `src/core2/life.ts` or the player-control module, and every `=== core.playerId` / `!== playerId` guard in `src/core2/modules` uses it. Alternatively, if a ruling says `core.playerId` is "who the player plays", `select` sets it, and the entrant becomes an ordinary person. The builder checks OWNER-DECISIONS for the meaning of player id before choosing, and says which. Test: an Advanced start in a drawn place steps in as a mayor, plays four council meetings, and the mayor is never in a public comment speaker list.

**Time box.** 3 hours

**Rules.** One rule, all 56 places: one reader decides who the player is, for every engine. This is a game, not a spreadsheet: the player's own acts are the player's, and the world never takes them in the player's name.

**Done when.** The new test passes in two drawn places, and a second session sees, on the bench on main, a drawn Advanced start as a mayor played by Week through three council meetings with the mayor never listed under SPOKE FOR or SPOKE AGAINST unless they pressed Speak (screenshots with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/player.ts, src/core2/modules/meetings.ts, src/core2/modules/campaigns.ts, src/core2/modules/corruption.ts, src/core2/life.ts

**Notes.** It may also explain other Advanced-start reports from Nov 13: a council member's Journal saying "Matthew walked 45 doors for me" (Fruitland, Idaho), and colleagues acting toward the officeholder as if they had campaigned.

Seen again by Playtester P2, Nov 13, 2026 (El Rancho, Wyoming, seed c1df9e06-0f86-4169-9951-cf0621d4d2c2, main 596d5127, Advanced start as a Platte County commissioner): the player never chose a town hall, yet the News on July 24, 2025 ran "Alicia Stanley holds a town hall / 37 people came to Alicia Stanley's town hall on July 7, 2025." The world's town-hall pass in `src/core2/modules/meetings.ts` (the loop over hosts) skips only `hostId === playerId`, so the stepped-in officeholder is decided for like anyone else.

Seen again by Playtester P2 (Inarajan, Guam, seed db11f543-5a3e-4bcb-b4be-2e6384c8ea3d): the stepped-in commissioner's Journal fills with acts the player never chose. By July 24, 2025 it read "I held a town hall. / I sat down with a reporter. / I gave an interview." fourteen times over. The office-day acts are decided for the stepped-in person as for any official.
