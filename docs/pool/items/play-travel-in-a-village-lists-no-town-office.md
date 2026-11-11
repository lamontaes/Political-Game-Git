---
id: play-travel-in-a-village-lists-no-town-office
title: "Travel in a village of 128 people lists three markets and three kitchens and no place where the town does its business"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-travel-in-a-village-lists-no-town-office
pr: #8485
after:
blocked-on:
standard: 2
model: opus
effort: medium
root: none
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)")
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:33:36.045Z
---

**What.** The audit measured on Nov 9: "Travel in a village of 128 people lists three markets and three kitchens and no town office." (Its browser life was in Blodgett Landing, New Hampshire; the line names no seed.) The owner said on Nov 8, about 2:10 p.m.: "I go to travel. Everything's a market or a post office. I don't even know how I'm supposed to be able to run for office." Travel lists where the player, the household and people they know work, then fills with up to nine public places by staff size, and its own comment leaves the town office out on purpose (owner, Oct 26). What the screen gets wrong, in every small place, is that nothing on it tells a player where politics happens. The place where the player has political business should be listed when the records show that business, and every card should say why it is listed.

**Cause.** Found in code: `townPlaces` in src/bench/places.ts (line 69) lists the player's, household's and known people's workplaces and then up to nine `PUBLIC_PLACES` by staff size, and its comment leaves a town office out (owner, Oct 26, "Why have to travel ... Public Works Department?"). Every card is a real organization in the place's records; whether six such businesses fit a place of 128 people was not traced.

**Fix.** List the place where the player has political business (where the town's body meets or filings are taken) when the records show that business (a meeting day, filing open, or a held seat), and give every card a reason it is listed. A town office listed only for being an office stays out. If a village that size really holds three markets and three kitchens as employers, file that as its own item for the jobs lead.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: what Travel lists is read from the place's own organizations and offices, never from a list of place names or sizes typed into the screen. Look before you ask: the Nov 9 Screens row note (P13) in docs/coordination/playtest/2026-11-08-1-check.md calls this settled by earlier rulings (Oct 26 and Oct 28), while the owner's Nov 8 words are later; the CTO rules which reading stands before this is built. Owner, Oct 27 (quoted in src/bench/places.ts): "Travel always lists where the player can go, with what is open now."

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place of under 500 people (place, seed and population named) and opens Travel: a screenshot at 1440x900 shows each card with the reason it is listed, and the proof lists each listed organization by record id with its staff count. The place where the town body meets or takes filings appears whenever the records give the player business there (on a meeting day, while filing is open, or when the player holds a seat), and no card has no reason, a raw record kind, or an office listed only for being an office. The same is run in a drawn place of over 5,000 people and in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro.

**Waits on.** CTO ruling on which reading of the Oct 26 and Oct 28 rulings and the owner's Nov 8 words stands (named in the Notes).

**Files.** src/bench/places.ts, src/bench/ui/travel-screen.mjs, src/bench/play.mjs, src/bench/backdrop-places.ts

**Notes.** From the audit's Pillar 6, re-checked in the game; playtest point P13 of docs/coordination/playtest/2026-11-08-1.md. The rulings pull two ways and the conflict is flagged here, not resolved. The Screens row note of Nov 9 (check file, "Row notes", P13: "settled, nothing to build beyond today's card") cites Oct 26 ("no D.C., no Capitol"; a town office is not listed on being a civic office alone) and Oct 28 ("'File for it' on a race triggers the travel to the filing office"), and says the Nov 8 play mock's standing City Hall, county party office and Capitol entries are superseded. The owner's Nov 8 words are later than both rulings, and the audit measured the same complaint on Nov 9 after that note was written. The rule in OWNER-DECISIONS is that the most recent ruling wins unless the older one makes more sense, and either way the conflict is flagged; the CTO rules which reading stands before this is built. The Done when above is written to fit both: no office listed for its own sake, an office listed when the records show business. Related: play-join-a-party-has-no-scene-and-no-headquarters (filed Nov 10). Not verified by the audit: which village the 128 people are, what the six shops' records are, and whether that village has a town body at all (a place with no local government of its own would list its county's). If the proof shows a village that size really holds three markets and three kitchens as employers, that is a separate defect for the jobs lead (too many firms for the people): file it as its own item with the record ids, and do not hide the cards here.
