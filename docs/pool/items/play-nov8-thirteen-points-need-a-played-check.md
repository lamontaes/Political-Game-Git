---
id: play-nov8-thirteen-points-need-a-played-check
title: "Thirteen points from the owner's Nov 8 playtest have a fix in the code that only the running game can confirm (Manchester, Connecticut, then a drawn place)"
area: play
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-play-nov8-thirteen-points-need-a-played-check
pr: #8594
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: rc2-done-from-records
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6 and "What I ran, and what I could not verify")
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:51:08.605Z
branch: claude/pool-play-nov8-thirteen-points-need-a-played-check
---

**What.** The audit counted 13 of the 72 defects from the owner's Nov 8 playtest as ones only a running game can settle, and said to count all 13 open until each is shown fixed on screen. The audit did not list them, so the Notes below carry a fresh reading of main on Nov 10: thirteen points where the code now carries a change aimed at the point, but the point is about how something looks, moves or plays, or its cause was never traced, so reading cannot close it. The job is one sitting in the running game that looks at each of the thirteen and marks it fixed with a screenshot, or files it as its own item with what was seen. Nothing is built here; a point found still broken becomes a new item named `play-nov8-<short-name>` with the screenshot.

**Cause.** Design: docs/coordination/playtest/2026-11-08-1-check.md (the 72 points and their status) and the owner's Nov 3 ruling, AGENTS.md "How every session works" step 5: nothing is done until a second session replays its finish line on main. None of the thirteen was measured for this item; the Notes give each point's code and what to look at.

**Fix.** Play the thirteen points in the running game on main, in a drawn place and in Manchester, Connecticut, and for each write fixed with a screenshot and record id, or file a `play-nov8-<name>` item. Build nothing in this item.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every point marked fixed carries a screenshot and the record id behind what the screen shows, and every point marked not fixed says what was seen and what was expected. Look before you ask: the owner's words for each point are quoted in the Notes, so nothing here is asked of him again. The player-screen-text and screen-to-mock skills say how a screen is checked (1440x900, a drawn place and seed, every string read).

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and works down the thirteen in the Notes, taking a screenshot at 1440x900 for each (a short run of screenshots for the two about movement), once in the drawn place and once in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro. The proof is a table of thirteen rows: the point, what the session did, what the screenshot shows, the record id behind it, and fixed or not fixed. Every row marked not fixed names the new pool item filed for it. No row says could not reach; a point that cannot be reached in play says why and what dev mode control was tried.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/dom.mjs, src/bench/play.css, src/bench/ui/roster-screen.mjs, src/core2/modules/world-legislating.ts, src/director/filing-visit.ts, src/bench/whole-figures.ts, src/director/purpose-scene.ts, docs/coordination/playtest/2026-11-08-1-check.md

**Notes.** The thirteen, each with the words from docs/coordination/playtest/2026-11-08-1-verbatim.md (the owner's first message is about 2:10 p.m. Eastern, his second about 2:20 p.m.; a "C" point is one the CTO caught in his screenshots, quoted from `2026-11-08-1.md`), what main does now, and what to look at.

1. P1, the title's double fade. Owner, 2:10 p.m.: "the background fade is still doing that double fade in thing where a new picture will start, it'll fade in, and then it'll fade in again immediately." Main: `rotateTitle` in `src/bench/play.mjs` (line 5383) now swaps the base picture under the top layer and clears the top at once ("One picture, one fade"). Look at: the title screen through three picture changes, a screenshot every half second; each new picture fades in once, with no second fade and no jump in its slow zoom.
2. P6, the fonts. Owner, 2:10 p.m.: "The fonts are a little weird. Again, I don't know why this sort of regressed." Main: `src/bench/play.css` still names five families (Cinzel, Fira Sans, Andada Pro, Old Standard TT, Playfair Display). Look at: New game, the creator, one menu and the talk box; list every typeface seen on each and set it against the type plan in docs/mocks/2026-11-07-approved/MENU-LOOK.md.
3. P11, the size of everything. Owner, 2:10 p.m.: "So the UI is not resizing. I mean, look at this. It's so small." Main: `fitUiScale` in `src/bench/ui/dom.mjs` (line 22) scales the whole screen above 1440 by 900, called on load and on resize (`play.mjs`, lines 5374 and 5375). Look at: the same play screen in windows of 1440×900, 1920×1080 and 2560×1440; the rail icons, the player card and menu text grow with the window and nothing is cut off.
4. C9, the job-cut story. CTO: "'Raymond's Market... is in retail trade' reads like a record, and its '631 people' staff figure looks wrong for a market." Main: the bank piece "{subject} is in {industry}" is no longer in `data/english/parts/news.json`; where the staff figure comes from was never traced. Look at: the first job-cut story News prints; its staff figure beside that employer's staff on its Travel card and in dev mode's record, and beside the town's population.
5. C21, a cut-off name on Issues. CTO: "'Social Security tax ra...' is cut off; the Issues tab has pagers." Main: Issues uses `rosterScreen` (`play.mjs`, line 5137) and the one long-list box with no arrows; no rule that cuts a row's name was found (`src/bench/ui/roster-screen.mjs`, lines 42 to 46). Look at: Issues, the Taxes and money subject; every law's name and value readable in full, no arrows, no "1 of N".
6. P30, no bills on day one. Owner, 2:10 p.m.: "I go to bills. It says no bill is before your state or Congress yet. That's not how it works. Like, again, it's not being simulated up to the point." Main: `openSittingSessions` in `src/core2/modules/world-legislating.ts` (line 229), called last by the world's build (`src/bench/world.ts`, line 598), has every session already sitting take up its work at the opening. Look at: Politics, Bills, on day one before pressing Day or Week; bills are listed for each body that is in session on that date, each with a filing day, and the empty line shows only where no body is sitting.
7. P20, the clerk's explanation and a reply that did nothing. Owner, 2:20 p.m.: "it says you have to file your papers. Like you see party endorsements. It's like listing what the town clerk does. It's just a bunch of garbled mess. And then I click all right. And then nothing happens." Main: the check found this was the residency refusal, played because the game had moved his home; the player's household no longer moves without his choice (`src/core2/housing-homeless.ts`, line 565), the refusal names the two places (`data/english/parts/scene-talk.json`, line 130066), and "All right." now leaves (`play.mjs`, about line 1495). Look at: file for a town seat on the first day filing opens; the clerk's lines read as speech, the filing is accepted, and a refusal, if one comes, says where the player must live and where the records put them.
8. P21, File for it after filing. Owner, 2:20 p.m.: "I already filed for it, but it's saying file for it again." Main: a filed race reads "You are running" and offers no button (`play.mjs`, lines 4225 to 4230 and 4256 to 4260). Look at: Politics, Elections, right after filing; the race says the player is running, the count of people running includes them, and File for it is gone.
9. P23, nothing to do after filing. Owner, 2:20 p.m.: "Yeah, I don't know how to campaign now. There's nothing for me to do. So this is where it ends." Main: the Campaign tab shows once the player has a filing (`play.mjs`, line 5221). Look at: the Politics tabs after filing; Campaign is there and offers at least one thing to do that day.
10. C16, the campaign board. CTO: "After filing there is no campaign board tab (ruled Nov 5: 'the campaign board once you've filed')." Main: as point 9. Look at: the Campaign tab against `docs/mocks/2026-11-08-play/renders/pl-campaign.jpg`; what the board should hold is screens-campaign-board (open), so mark this point on whether the tab appears.
11. C28, an official's face. CTO: "Amy Villarreal's bust doesn't match her name or origin." Main: a face is now picked within the skin tones of the person's recorded origin (`packPersonOf` in `src/bench/whole-figures.ts`, line 82; stopgap SG-PEOPLE-origin-skin-tones). Look at: Government; open five officials, among them ones the player has never met; each bust against the origin on that person's record in dev mode, and whether an official known only by a term has an origin at all.
12. P38, the goodbye. Owner, 2:10 p.m.: "It says your sister has come to say goodbye. I click continue. She said, good to see you. What do you think? What? That's how it starts. There's no context." Main: since Nov 9 a goodbye is its own scene type with its own lines (`moving-goodbye` in `src/director/data/circumstances.json`, line 399). The audit, playing main earlier on Nov 9, still saw: "You knock on Susan Kent's door. Your aunt has come to say goodbye." Look at: a goodbye scene (wait for one, or cause one with dev mode's scene panel); it says who is leaving and for where, never has the visitor "come" to the player's door when the player went to hers, the replies are about the move, and it ends with something kept.
13. P39, the landlord's notice. Owner, 2:10 p.m.: "We owe $14. Okay, so why are we behind on rent? How did we get that far behind?... This scene makes absolutely no sense." Main: the notice now carries the rent and the day it first went unpaid, and says the amount and how long (`src/director/purpose-scene.ts`, lines 471 to 489). Look at: a rent notice scene; the amount equals the lease's arrears record, the lines fit a small or a deep shortfall, and a household member is called by relation ("your son"), not by full name.

How the count compares: read against main on Nov 10 for this item, the 72 points came out 24 fixed, 20 partly fixed, 15 not fixed and these 13, the same split as the audit's, but the audit's own list was not written down, so the two sets of 13 may differ. Points that also need eyes but are carried by other items are not repeated here: the Week's speed (P41, the speed lead's items), the look of Budgets and its fiscal-year line (P28, play-budgets-every-government-political-process-style), the bill page against its mock (P31, play-bill-page-keeps-back-to-the-bills-and-government-keeps-a-caption) and the family's faces (P33, play-one-person-shows-two-faces). The story read at home (P37) is words-rejected-nov8-scene-still-plays.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:18 UTC) on branch claude/pool-play-nov8-thirteen-points-need-a-played-check.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:35 UTC) on branch claude/pool-play-nov8-thirteen-points-need-a-played-check.

Released (2026-11-11): Replay-only (build nothing): thirteen screenshots in two places for an 8-hour sitting in the browser; not started. Continue on branch claude/pool-play-nov8-thirteen-points-need-a-played-check.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:50 UTC) on branch claude/pool-play-nov8-thirteen-points-need-a-played-check.

Released (2026-11-11): Not started: an 8-hour sitting over thirteen screens with a screenshot each, in a drawn place and in Manchester CT; claimed by next for sonnet-95c2 and released unstarted so another session can take it. Continue on branch claude/pool-play-nov8-thirteen-points-need-a-played-check.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:51 UTC) on branch claude/pool-play-nov8-thirteen-points-need-a-played-check.
