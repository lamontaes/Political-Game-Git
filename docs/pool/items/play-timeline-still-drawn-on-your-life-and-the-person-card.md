---
id: play-timeline-still-drawn-on-your-life-and-the-person-card
title: "Your life, Jobs and study and every person's card still draw a life as a timeline, which the owner withdrew on Nov 7 (seen in Blodgett Landing, New Hampshire)"
area: play
kind: bug
priority: 1
size: S
status: merged
claimed-by: claude/pool-play-timeline-still-drawn-on-your-life-and-the-person-card
pr: #8486
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Against your newest rulings (measured)", and "Reported done that is not done", item 8)
claimed-at: 2026-11-11T02:40:51.085Z
merged-at: 2026-11-11T03:20:51Z
---

**What.** Measured by the audit on Nov 9 in Blodgett Landing, New Hampshire (a random world; the audit gives no seed), playing a 17-year-old the game named Ray Kent: "the You screen's Your life tab and the person card still draw a timeline... You approved a timeline on October 29 and withdrew it on November 7; the game shows the older design." Its screenshot `docs/audits/fable-vision-2026-11-09-screens/01-your-life-four-lines.jpg` (branch audit/fable-vision) shows the Your life tab as a gold line with four round icons and four dated cards, 2007, 2012, 2018 and 2021. Read in code on main, Nov 10: `lifeTimeline` in `src/bench/play.mjs` (line 3156) wraps the one timeline part (`timeline` in `src/bench/ui/timeline.mjs`, line 72) and is called three times: on a person's card (line 2353, inside `personCardNode`), on Jobs and study (line 3441, `jobs()`) and on Your life (line 3452, `history()`); its styles are `.timeline` and the five `.timeline-*` rules in `src/bench/play.css` (from line 3630). Fix all three at once: the same history lines are told as sentences in a section strip, as the approved You screen and person card draw text, and the timeline part, its styles and its callers are deleted.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: `ui/timeline.mjs`, `lifeTimeline`, the `.timeline` styles and any browser check that looks for them are deleted in the same change, and the PR body counts what was removed. Owner, Nov 7, about 3:40 p.m. (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 38): "on 'their life' again i said no timeline... and it is also still an excel sheet of facts." The menu-look rules in the same folder (MENU-LOOK.md): "No timelines on person cards or You (he has said it twice)." The line graph on Budgets and Metrics (`src/bench/ui/trend-line.mjs`) is a different part and stays.

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), and takes three screenshots at 1440×900: You, then the Your life tab; You, then Jobs and study; and the card of one person opened from People. None may show a vertical line with round icons, a year badge per entry, or a card per dated record. Each must show the same history lines as before, as sentences inside a section strip, with no ISO date. A search of `src/bench` for the word timeline must find only the trend line. The same three screenshots are then taken in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro, and the person card is set beside the approved example `per-hale` in `docs/mocks/2026-11-07-approved/menu-examples.html`. The owner plays it: he opens Your life and a person's card and sees a few sentences about the life, with no timeline anywhere.

**Files.** src/bench/play.mjs, src/bench/ui/timeline.mjs, src/bench/play.css, src/bench/ui/strips.mjs

**Notes.** From the audit's Pillar 6 and its "Reported done" item 8 ("The approved screens are in the game": "The frames are. The approved content is not, and the withdrawn timeline and full figures remain"). The comments in `play.mjs` still cite the withdrawn ruling (line 3445: "owner, Oct 29: a history is a 'Vertical timeline'"); delete them with the code. The person card's history section was restored after the Nov 8 playtest (point P32: the card was sent the story and never drew it), and it was restored as a timeline; keep the section, change how it is drawn. What the life section should say in the end waits on the life record (the audit's Pillar 4, root cause 3); this item only removes the withdrawn look. Related, filed Nov 10: play-your-life-draws-a-full-body-figure (same screenshot), play-one-person-shows-two-faces. The legislation mocks' note says the same of bills: "No dated timeline (the owner rules out timelines)". Not verified by the audit: Jobs and study (found by reading the code here, not seen in the audit).

Not seen in the game (2026-11-10, second session (acceptance check)): Rock Hill, Missouri, seed 0cf1896a-28d6-4915-b0d4-7cf95baa3efd, main b094bee1: My life read as three I-sentences with no timeline, icons or dated cards, and cards were sentence paragraphs; but in Caño Martin Peña seed 50fe2d1143af adults born before 1980 showed only child sentences, no schooling or work, and a lost candidate's card could not be reached

**Notes (Fable, Nov 10, after the second session's check).** The check did not pass, and the item is open again. What it found has its causes in four new items, each built on its own: life-a-dead-persons-own-card-says-they-died, life-a-loss-is-told-in-its-place-not-first, life-relatives-who-live-elsewhere-have-a-past and life-sentences-open-the-trace-in-dev-mode. This item is checked again by a new second session when those four are on main. Two of the check's own steps asked for something no screen offers (opening the card of a neighbor never met, and of a candidate who lost a state or federal race); the next check drops them.

Closed with evidence (2026-11-11, opus-1fd7): on main 0ccf24ed there is no `ui/timeline.mjs`, no `lifeTimeline` and no `.timeline` style; a search of src/bench for "timeline" finds only ui/trend-line.mjs, budget.ts and budget-trend.test.ts (the trend line). Seen on a bench restarted on main in Pikes Creek, Pennsylvania (seed 91ecef5a-7698-4fc1-9c94-5660c9726e36): Your life, Jobs and study and a person card (his father) tell the history as sentences in section strips, with no timeline part and no ISO date (docs/play-first/shots/play-timeline-still-drawn-on-your-life-and-the-person-card/). The commit that removed it is outside this shallow clone.

Status set by hand (Nov 11, 2026, cause finder for Fable B): pull request #8486, whose line 1 is `Pool item:` for this item, merged at 2026-11-11T03:20:51Z, but the item stayed `in-pr`, which held play-six-list-and-detail-screens-build-their-own-part-4-replace-plate-calls behind its `after:`. Set to `merged`; `done` still needs the second session's check.
