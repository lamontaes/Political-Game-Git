---
id: director-no-scene-without-a-purpose
title: "A kind of scene plays only when its ending writes something another engine reads (Blodgett Landing, New Hampshire: seven scenes in ten weeks, none with a purpose)"
area: director
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: director
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, root cause 6)
---

**What.** Many kinds of scene stop the player and leave nothing behind. Read by the audit on main as of Nov 9 (corrected by its reviewer): of 99 kinds, sixteen have no purpose and no reply tree, ten more end keeping nothing, and for 18 what they keep is a favor owed or a promise made that no engine reads (stopgap SG-WORDS-favor-promise-keeps-unread, src/director/data/stopgaps.json:436, still open). Measured in the audit's browser play (Blodgett Landing, New Hampshire, a 17-year-old, ten weeks, no seed kept): seven scenes, and none had a purpose. Read by me on Nov 10's main (commit 8ac2262853), from the data only: there are 103 kinds; 8 have no `purpose` (departure, news-arrives, visit, hearing, verdict, address, interview-sitting, debate-sitting); 9 have a purpose whose endings all keep "none"; and 17 keep only a promise or nothing. Story's Nov 9 merges gave purposes to the letter, the reunion, the celebration, the missed gathering, the first meeting, the homecoming, the prison visit, the rescue, the story read at home and the goodbye, which is the likely reason the audit's sixteen is now 8. The director still stages a kind whether or not anything reads what it leaves: `purposeScene` (src/director/purpose-scene.ts:183) returns nothing for a kind with no purpose, and the scene plays anyway. Fix the class: a kind with no write-back that another engine reads does not play. Each purpose ending names, as data, the record it writes and the engine that reads it; the director stages a kind only when at least one of its endings has both; a kind that fails sends its cause to the journal as a line. Then give the kinds that are worth keeping a real write-back through an engine that already exists.

**Time box.** 10 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a scene's ending counts only when a different engine reads the record it wrote, at the moment that engine decides or pays, named by record id; a label on the scene's own record is not a write-back. Wire to the world: a favor goes through the legislature's obligations and the relationship record, a promise through the campaigns engine's promises, never a new table. No dice: the outcome follows the reply the player chose and the people's records. Scene standard rule 1: no consequence, no scene. Owner, Oct 15, 2026: "A scene has an endpoint. It exists for something: money, a bill, or the player's political life." Owner, Nov 8, 2026: "There's lots of irrelevant scenes popping up."

**Done when.** A different session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and plays one year with dev mode's Run, once as a 17-year-old and once as a seated council member (Advanced, Play as), answering every scene that stops play. It runs the crew's scene tool on the same seed (`node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>`) for the list of scenes with their cause record ids. For every scene that played it writes one row: the kind, the ending reached, the record id that ending wrote, and the later record id that shows another engine read it (a closeness change, a promise the campaigns engine holds, an obligation, a hire, a vote). Zero scenes that played lack both ids. Dev mode's scene list shows, for each of the kinds, the write-back it declares or that it will not play. The same on the audit's seeds 3dac8ffb3f3c, 8a5d1fba28fc and fd7e212758b7. A director test reads every situation type and fails when a kind that can be staged has no ending with a written record and a named reader, and stopgap SG-WORDS-favor-promise-keeps-unread is resolved or its remaining kinds are listed. The owner plays it: every scene that stops him ends with something he can find afterward, on a person's card, in his journal or in a vote.

**Files.** src/director/scheduling.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/director/data/situation-types.json, src/director/data/stopgaps.json, src/bench/dev-mode.ts

**Notes.** From the Fable audit, Pillar 4 ("99 kinds of scene", "What a player sees") and root cause 6. The audit's count is as of Nov 9 (99 kinds). Mine is of Nov 10's main (103 kinds) and uses only the `keeps` field of each ending in purpose-arcs.json, so it is a first list, not the answer: a reply handler can write a record the `keeps` field does not show (a yes to a job offer hires the player, and promises in speeches, interviews and floor-vote asks are kept and used, src/core2/modules/voting.ts near 812, by the audit). The builder's first step is the true table by what each ending writes and who reads it.

My Nov 10 lists. All endings keep "none": race-told, diploma-home, no-diploma-home, filing, door-signature, family-win, family-loss, desk-bill, new-baby. Endings keep only a promise or nothing: care, hallway, campaign-stop, speech-afterward, door-ask, party-recruit, desk-visit, cause-invite, floor-debate, interview-invite, debate-invite, volunteer-offer, manager-offer, job-offer, rival-word, rival-filed, budget-cut. The address, interview-sitting and debate-sitting kinds have no `purpose` because a speech or a sitting plays them; they pass this item only if the record they write has a named reader.

Not verified: I played none of these scenes to their endings, and the audit did not say which seven kinds played in Blodgett Landing beyond the five "someone has news" scenes, the hallway scene and the goodbye. Dev mode's scene list is screenshot 08 in docs/audits/fable-vision-2026-11-09-screens/ on branch audit/fable-vision.

Related: words-scene-ending-writes-its-record (open, lead words: making each ending write its record; evidence added there Nov 10), director-no-borrowed-small-talk (filed with this one: what a kind with no lines does today), director-casting-rule-on-every-scene-kind and director-cap-on-scene-repeats.
