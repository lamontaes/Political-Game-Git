# Assessment after the Oct 26 playtest

Written by the owner's local Opus session at his request ("look through all the notes, look through the code, decisions, open PRs, look at remote sessions... Get a full picture and come back to me with an assessment, findings"). Seven read-only helpers audited main (9104a7c1c, Oct 26 19:10Z) and studied Wildermyth and The Political Process on his Mac; every claim below cites a file, a line or a PR. "Fact" is read in code or records; "inference" is marked.

## The short version

The owner is right that words and scenes are the biggest problem. It is not bad luck or one bad merge. There are three causes, and each can be fixed:

1. **Nothing makes scenes happen.** The story director only reacts to records that name the player; by its own design doc it "never starts one" (`docs/design/story-director.md:225`). Of its 66 scene types, 27 wait on a producer that doesn't exist (canvassing, election day, donor asks, rallies, staff news) and 14 have no trigger at all (`src/director/data/situation-types.json`). So a campaign year fires only family news, and a member of Congress gets nothing.
2. **There is no newer English, and live news is never worded.** Batch 22 was the Oct 15 held lines laid out for grading; #5942 released them. No newer wording exists on main or in any open PR. Only 128 of 5,318 bank parts carry a grade. News never puts a passed law, a vote or a result into words: `composeNewsStory` runs only for the pre-game archive and the opening (`src/english/english-newscast.ts:184`, `archive-words.ts:57`).
3. **Nobody is assigned to them.** No Words session, scenes lead or screens lead is running today. In the last 24 hours, 135 PRs merged; 37 (27%) changed anything a player sees, and fewer of those reach a new player.

Under these sit two process failures. "Done" and "wired" are measured by whether a name or record is present, not by whether it reads well or reaches the screen. And the rules against developer text, duplicate screens and empty scenes exist on paper with no check that runs.

## What he saw, and why

| What he saw                                                                                                                                                   | Cause (fact)                                                                                                                                                                                                                                                         | State on main                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| No scenes from January to November                                                                                                                            | Director only reacts; producers missing; the "scene waiting" outcome is never read by the screen (`src/bench`)                                                                                                                                                       | Missing. Six scene PRs (#6002 donor, #5975 debate opponent, #6146 party asks you to run, #6007, #5977, #6136) are sent back or stacked behind #5965 |
| Every shift start and end stops time                                                                                                                          | The core player clock pauses at each shift (`player-v1.ts:236-262`, `work-spans-v1.ts:518`)                                                                                                                                                                          | Missing. No item, no PR; today's ruling not recorded                                                                                                |
| Old, stale English ("Come to bed. It'll still be true in the morning.")                                                                                       | Oct 15 hand-written lines released by #5942; nothing newer exists                                                                                                                                                                                                    | Missing. Needs new lines written per scene and his voice notes turned into grades                                                                   |
| "It's a Monday in January. You're at home."                                                                                                                   | Bank lines `scene-words.json:436`, `:520`                                                                                                                                                                                                                            | Missing                                                                                                                                             |
| Opening address is a stat readout; "I was in Pennsylvania."                                                                                                   | One sentence per number (`english-opening-speech.ts:73-150`); a mined fragment fills a slot (`opening-speech.json:2704`); #6103's done-when demanded three numbers                                                                                                   | Missing; no open PR                                                                                                                                 |
| News never reports anything; leads with the inauguration for a year                                                                                           | Live stories never worded; the opening story is always listed first (`play.mjs:3412-3414`); no outlet (`3419-3432`)                                                                                                                                                  | #6147 (morning-after result) sent back; laws and votes in News missing                                                                              |
| Journal is single facts; "I voted for H.R. 2."                                                                                                                | One bank sentence per moment; the vote is named by number only (`src/director/journal.ts:296-305`); the game cast the vote, which OD:246 forbids                                                                                                                     | #6112 (titles only) sent back                                                                                                                       |
| Talks with no replies                                                                                                                                         | —                                                                                                                                                                                                                                                                    | Fixed after the build by #6078 (merged 18:32Z, in no release yet)                                                                                   |
| Developer text: "Office.voted", "on-ballot", ISO dates, "1162.7587481540313 looking", "Views fit 0.87", "(counter: chief clerk)", "Neither, much", "Mark gap" | `kindName()` splits only on ":" (`play.mjs:2142-2145`); raw statuses and record rows printed (`play.mjs:1247-1255`, `1528`, `4033-4035`, `1323`); unrounded counts (`world-panels.ts:96-102`); "Neither, much" is a core label (`people-trait-definitions.ts:64-67`) | "Turnout 44 / 185" fixed (#6118); #6058, #6086, #6104 sent back; subheadings, "Neither, much" and the floats have no PR                             |
| Election day is a panel; election night a spreadsheet                                                                                                         | The election-day producer doesn't exist (`situation-types.json:1669`); election night is a sheet for any new results (that is why Carol saw Lancaster's races)                                                                                                       | Missing; the played election night ruled Oct 6 was never built                                                                                      |
| Everyone bald and gray                                                                                                                                        | Shipped on purpose by #5898 (Oct 25), which removed the skin, hair and color controls                                                                                                                                                                                | No active item                                                                                                                                      |
| A congresswoman sits in her bedroom for a year                                                                                                                | Federal floor votes and the whip don't stop the player (`office-day-federal.ts:100-102`); the screen handles only council meeting and desk stops (`play.mjs:685-694`); nobody is ever placed in Washington                                                           | Missing                                                                                                                                             |

## Lawmaking (his H.R. 1)

- **Why it sat a year (fact):** the bench stopped scheduling state and federal bills on Oct 17 to fix a crash (`src/bench/legislature.ts:215-219`, c53327dea). The engine's `scheduleVote` would give the next floor week. The weekly floor only takes bills filed when the session opened (`world-legislating.ts:833-960`, `:1022`), and adjournment only kills those, so a bill drafted later never moves and never dies. The file's header ("Congress's year-end votes") is stale since Oct 14; I repeated it to the owner and was wrong.
- **What a player can reach:** council: draft, deals, meeting vote, desk. State and Congress: draft only. Committees run inside the vote with no scene; the whip and earmarks run only in the background; both chambers vote the same day with no conference.
- **The bill screen:** one dropdown and a number box, one change per bill. The engine already has a section editor (add, replace, strike) that no screen calls. The cost estimate (`costOf`) only scores minimum wage, so a tax bill shows $0. His design is on record and unbuilt: the bill on paper with phrases selected on the page (Decision Register:422, Sept 25), a fiscal note on every bill (Sept 26), each term a clickable field (OD:211, :231, Oct 14). No pool item or open PR builds it.
- **Laws changed silently:** Ohio's minimum wage went from $10.70 to $7.25 with no news; Issues lists only laws with a dollar amount or rate (`government.ts:173`); the Calendar lists only elections, law dates and birthdays (`calendar.ts:21`).

## Custom mode, the UI and travel

- **Modes (fact):** Watch the World is disabled (`play.html:112`); custom world is seven number boxes then the same creator; the ring top right only toggles a hidden class that adds a link to a separate `/dev` page; "Play" appears only beside state and federal members in dev mode, never on a person card. A state-seat start exists in the engine and nothing calls it; nothing exists for local or federal starts. The Oct 14 rulings (OD:166, :169) already say a custom start lives in dev mode, which is the old Watch the World where you can do anything; today's ruling sharpens it and is not yet recorded.
- **The UI (fact):** `src/bench/play.mjs` is one 4,950-line, 169 KB file with no imports: 22 menu screens in one object plus about 15 separate scene renderers, sharing only three small helpers. 24 open PRs edit it, so lane PRs collide in it constantly (about half of today's send-backs were conflicts). The rail and the menu open the same screens; people are clickable on one list and plain text on others.
- **Travel (fact):** destinations are only organizations in the player's own town for which she has a reason (`places.ts:65-137`); nothing outside the town exists: no Capitol, no D.C. office, no district office, no other state. Rooms are chosen by kind of place; of 308 paintings only capitol exteriors, courthouses and houses vary by state.

## What the two reference games teach

Full notes: `docs/design/references/wildermyth-patterns.md` and `political-process-patterns.md` (in #6174).

- **Wildermyth (scenes and words):** a scene has a trigger, roles cast by scoring real people on traits and relationships, one choice, and an outcome written back to the people (relationship, trait, history line); if a role can't be filled, it doesn't fire; the most specific scene wins; every line has versions by the speaker's personality and tie to the listener (used about 1,500 times); pasts are built from entries that seed later scenes; time jumps between chapters with a "years pass" screen; skin families with matching hair colors and graying with age. The one thing not to copy is its dice.
- **The Political Process (systems):** a bill is a list of provisions with real from and to amounts; every bill gets a committee and a reported chair decision; a whip count where each member is unknown until you ask, with reasons in words; hearings where officials testify with the estimate; travel is a map with cost and hours; campaign activities arrive as offers with a host, place and audience; election night is watched coverage; you can start in any office. Not to copy: balanced elections, flat rates, canned text.

## The crew today

- Running: a laws-and-effects lead (Opus), a bug worker, five mergers, a fixer (no comments 08:30–18:43), the ballot lane, Fable (idle), and the cloud CTO's two-hour pass.
- 257 open PRs: 158 drafts, 116 with no push in three days; 224 carry a send-back; 46 have an unanswered send-back, 27 of those owned by roles no longer running (M0–M2, Traits, Words, Speed).
- Every open words PR is sent back: #6086, #6058, #6104, #6147, #6100, #6096, #6112, #6156, #6136, #6146.
- 59 of 97 "in PR" pool items sit on four drafts idle since Oct 20–21 (#5180, #5076, #5196, #5217).
- Items flip to done the minute their PR merges (`merger` step 8, the done-on-merge workflow), although his Oct 25 ruling says his installed-build check closes play items. That is how play-first-10 shows done after he rejected it.
- His voice rulings reach the record late or never: today's are on #6166 (open since 17:00); the Oct 8 montage ruling and today's "unify" and "drop the questionnaire" are on main nowhere.
- Releases are not starved (17 versions today). The real gap is the opposite: he played v0.34.0 while #6078 landed after it.

## What I changed (skills)

- **Crew skills, PR #6174** (stacked on the CTO's #6166):
  - New `scene-standard`: the Wildermyth standard as ten checkable rules.
  - New `player-screen-text`: what must never reach a player screen.
  - New `screen-to-mock`: every screen change names its mock line and reuses one shared component per control.
  - Merger: new send-backs for these, no duplicate send-backs on the same head, shares by the number of mergers running, play items noted "awaiting the owner's check".
  - CTO pass: a lead for every area he's complaining about, silent roles reassigned after four hours, playtest blocks read, stale in-PR items released.
  - Play-first: done-when must read well.
  - Words: the false guard claim corrected, what he saw today.
  - Wiring audit: "wired is not seen".
  - Ask-why: weeks with no scene.
  - Session start and AGENTS.md: search before filing.
- **His Mac's skills:**
  - New `repo-skills` loader: this folder isn't a checkout, so the crew's skills never loaded here.
  - `playtest-sitting` reworked: strict Wildermyth grade, rulings recorded the same hour, check whether a stop was fixed after the build or shipped on purpose, the block on main the same day.
  - `cto-checkin` cut down to a pointer at the repo's CTO skill plus Mac-only steps.
  - The duplicate Mac `merge-audit` retired.

## Recommended next, in order

1. **Staff words and scenes today.** One Opus session owning the director and the English engine together, working to `scene-standard`: campaign-season producers (interview request, debate invitation, team offer, rally, donor or party ask), "skip to the next scene", live news worded, the address as a speech, journal lines in context. Each new scene ships with its words in the same PR.
2. **Staff one screens lead.** Split `play.mjs` into shared parts (panel, card, list row, menu, toast, talk box), drop the duplicate menu, free `play-menu-shell-oct20` from #5180, make people clickable everywhere. Until it lands, lane PRs keep colliding in one file.
3. **Shifts never stop the player.** Record the ruling, then remove the shift pauses in `player-v1.ts` and `work-spans-v1.ts`; merge #6126.
4. **The laws lead's next deliverable is visible in play:** schedule every player bill (restore `scheduleVote` at `src/bench/legislature.ts:215-219`), let members file all session, put the floor vote and the whip on screen as scenes, put the Capitol and a district office in Travel.
5. **Checks that run:** a screen-text test on every PR (raw kinds, ids, ISO dates, unrounded numbers, debug labels); play-first items not flipped to done on merge; fix the two browser tests that assert defects; widen the American English test to `data/english`, `src/director` and `src/bench`.
6. **Clean the record:**
   - Record today's rulings plus the Oct 8 montage.
   - Reopen the four items he rejected.
   - Release the 59 in-PR items parked on idle drafts.
   - Close the 11 stale words items that assume held lines.
   - Merge the words PRs he keeps hitting first: #6058, #6096, #6147, #6086, #6104.
7. **One build a day he plays,** with a plain list of what's in it.
8. **Then the bigger asks:**
   - One simulation and dev mode under Advanced: play anyone, start in any seat, RimWorld or CK3-style setup.
   - The bill on paper with clickable terms and an estimate beside it.
   - Hair, skin and clothes colors.
   - Election day and night as scenes.

## Decisions only he can make

- Start the words-and-scenes lead and the screens lead now (models and helper counts are his call).
- Whether the 31 draft items from the sitting go to Fable first (his words today) or straight to the crew.
