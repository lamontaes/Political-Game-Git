# The campaign board, a mock (Nov 23, 2026)

The owner's ruling, Oct 27, 5 PM Eastern (`docs/coordination/OWNER-DECISIONS.md`, line 774): "One board, I'll have to see it explicitly... there should be some kind of inbox with media requests or building a campaign team... the political process has some kind of manager. I would like to be able to do that. Maybe you meet someone, maybe it's your significant other or your best friend." The ruling ends: "The owner sees the board before more is asked." This folder is that board, for him to see. Nothing is built in `src/` until he picks.

It answers his Nov 23 sitting, rows P38 ("This campaign screen is terrible") and, for layout only, P34 to P36 (`docs/coordination/playtest/2026-11-23-1.md`). The words on the board belong to Words; this mock only places them.

## Open it

Open `campaign-board.html` in a browser from this folder: it reads the approved set's styles and pictures from `../2026-11-07-approved/` (the fonts come from Google Fonts). `campaign-board.png` is the 1440x900 picture; `campaign-board-phone.png` is the phone check (the stage scales to the window's width, as the approved set does, with no sideways scroll).

## What each part follows

| Part                                                           | The ruling it follows                                                                                                                                                                                                     | The game it follows                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One board, under Politics > Campaign                           | Oct 27, "One board"; Nov 5, "Your one campaign board stays separate and appears once you've filed" (`specs/politics.md` section 8); MENU-LOOK, "the campaign board once you've filed"                                     | _The Political Process_, Campaign > Overview: section bars one after another (`specs/tpp-screens-nov5.md` section 5), drawn in the approved Government build       |
| The race's painted header                                      | P34 (layout): the race's facts sit in the header as data (seats, how many are running, election day), with no line under it about who has heard of you                                                                    | The approved Government screen's painted body header (`gov-local`); _The Political Process_'s General Information                                                  |
| Who's running                                                  | P35: every rival who announced or filed is named, with where each stands (filed on a date, or announced); two seats and three running is a race                                                                           | _The Political Process_, Campaign > Opponents (portrait, name, party) and Elections race rows                                                                      |
| The poll                                                       | Oct 29, 7 PM: "no meter for how voters feel"; polls are counts of what real people said; MENU-LOOK: data, never bars                                                                                                      | _The Political Process_, Poll Data (pollster, date, sample, results), typed like the approved Budgets page (dot leaders)                                           |
| Waiting for your answer (the inbox)                            | Oct 27: "some kind of inbox with media requests"; each item opens its scene (Oct 20 and 27: campaign acts are scenes)                                                                                                     | _The Political Process_, Overview > Campaign Opportunities (rows of debates, rallies and fundraisers, each with Continue and X), here Accept, Decline or Answer    |
| Your team                                                      | Oct 27: "building a campaign team", people the player knows, met in scenes; each named with how you know them                                                                                                             | _The Political Process_, Campaign > Staff (roles), without its skill stars (MENU-LOOK: no meters)                                                                  |
| The manager                                                    | Oct 27: "the political process has some kind of manager... Maybe you meet someone, maybe it's your significant other or your best friend"                                                                                 | _The Political Process_'s left rail, the Campaign Manager's portrait on Overview; drawn as the approved Government leader (fading bust, Playfair name, dash lines) |
| Volunteers and Ask someone                                     | Oct 27, 4 PM: one count of volunteers for the header, the row and the director                                                                                                                                            | _The Political Process_, Campaign > Volunteers                                                                                                                     |
| The money, beside the tabs                                     | P36 (layout): figures, not a list of facts; MENU-LOOK: data in words and figures                                                                                                                                          | _The Political Process_, Overview > Finances (Campaign Funds, Overhead, Remaining); placed where the approved Budgets keeps its year line                          |
| Out and about (the actions)                                    | P37: "Go out on a trail"; Oct 20 and 27: every campaign act is a scene you go to                                                                                                                                          | _The Political Process_, Campaign > Events (Door Knocking, Interviews, Speeches, Rallies, Fundraising) and its Marketing and Poll Data buttons                     |
| The look: panel, strips, outlines, buttons, busts, player card | Every line of `../2026-11-07-approved/MENU-LOOK.md`: one see-through panel, section strips with the broken gold outline, no box per item, lit selection, busts that fade, no subtitles, no arrows, no checkboxes, no bars | The approved You, Government and Budgets builds (`../2026-11-07-approved/`), reused as they are: this page adds no surface of its own                              |

The menu study MENU-LOOK cites (`reports/Game menu UI design study.md`) is not in the repository and was not found on the owner's Drive by title; this mock follows MENU-LOOK, which carries its rules.

## People

Busts and faces are crops of pack v4 figures only (`../2026-11-07-approved/img/people/`), one figure per named person, the player's figure for no one else:

| Person            | Figure                                        |
| ----------------- | --------------------------------------------- |
| Owen Pierce (you) | `man-slim-look-suitcharcoal-gesture-tq-right` |
| Tasha Greene      | `woman-slim-look-pantsuitblack-stand-front`   |
| Mary Velasquez    | `woman-medium-look-pantsuitnavy-stand-front`  |
| Christopher Riley | `man-heavy-look-suitnavy-stand-front`         |
| Luis Ortega       | `man-medium-look-suitnavy-s05`                |
| Ellen Marsh       | `woman-heavy-look-blazercamel-s05`            |

Built in the game, a person on a menu is drawn by `src/bench/ui/bust.mjs` from the bust bank (`art/busts/v1/`), the one way the game draws busts since Nov 10 (skill `screen-to-mock`).

## Sample data

Every name, place, date and number is sample record data, not a player line. Mary Velasquez and Christopher Riley are the rivals from his Nov 23 sitting (P35); the rest is made up for the mock. The game would show its own people, races, polls and money from its records.

## Words

Labels already in `src/bench/data/controls.json` are reused: Campaign, Waiting for your answer, Your team, On your staff, Who's running, Debate invitation, Endorsements, Accept, Decline, Answer, Ask someone, Raised, Spent, Cash on hand, Out and about, Go out on the trail, Knock on doors, Give a speech, Host a forum, Ask for an interview, Call donors, Ad, Mail, Poll, Seat held, Filed on, Announced, You are running, Election day, Day, Week.

Lines needed, for Story (shown in the mock as sample words; none is in the game):

- Inbox kinds: "Interview request" (a media request) and "Wants to meet" (a donor's ask).
- Team roles: "Campaign manager", "Treasurer", "Yard signs".
- The poll's row for people with no answer: "Not sure".
- The header's facts line: "{n} seats · {n} running · Election day, {date}".
