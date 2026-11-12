---
id: director-no-scene-without-a-purpose
title: "A kind of scene plays only when its ending writes something another engine reads (Blodgett Landing, New Hampshire: seven scenes in ten weeks, none with a purpose)"
area: director
kind: bug
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pool-director-no-scene-without-a-purpose
pr:
after:
blocked-on:
model: opus
effort: high
root: rc6-scenes-repeat
lead: director
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, root cause 6)
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:08:06.765Z
---

**What.** Many kinds of scene stop the player and leave nothing behind. Read by me on Nov 10's main (commit 8ac2262853), from the data only: `src/director/data/situation-types.json` holds 103 kinds; 8 have no `purpose` (departure, news-arrives, visit, hearing, verdict, address, interview-sitting, debate-sitting); 9 have a purpose whose endings all keep "none"; and 17 keep only a promise or nothing. In the audit's browser play (Blodgett Landing, New Hampshire, a 17-year-old, ten weeks, no seed kept) seven scenes played and none had a purpose. The director still stages a kind whether or not anything reads what it leaves. This item also takes the new-adult skip leftovers from director-moments-for-a-new-adult: a skip that stops with no scene bound (Point of Rocks, Wyoming, no stop at all in eight months) and a stopping moment whose record id does not resolve.

**Cause.** Measured: the counts above (the audit's seeds are 3dac8ffb3f3c, 8a5d1fba28fc and fd7e212758b7; the counts come from the data, so no one seed applies), from `src/director/data/situation-types.json` and the `keeps` field of each ending in `src/director/data/purpose-arcs.json`, on main 8ac2262853. Found in code: `purposeScene` (`src/director/purpose-scene.ts` line 186) returns nothing for a kind with no purpose and the scene still plays; stopgap SG-WORDS-favor-promise-keeps-unread (`src/director/data/stopgaps.json`) is open.

**Fix.** A kind with no write-back that another engine reads does not play. Each purpose ending names, as data, the record it writes and the engine that reads it; the director stages a kind only when at least one of its endings has both; a kind that fails sends its cause to the journal as a line. First step: the true table of what each ending writes and who reads it. Then give the kinds worth keeping a real write-back through an engine that exists, resolve the favor/promise stopgap or list its remaining kinds, and make a stopping moment's record id resolve.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a scene's ending counts only when a different engine reads the record it wrote, at the moment that engine decides or pays, named by record id; a label on the scene's own record is not a write-back. Wire to the world: a favor goes through the legislature's obligations and the relationship record, a promise through the campaigns engine's promises, never a new table. No dice: the outcome follows the reply the player chose and the people's records. Scene standard rule 1: no consequence, no scene. Owner, Oct 15, 2026: "A scene has an endpoint. It exists for something: money, a bill, or the player's political life." Owner, Nov 8, 2026: "There's lots of irrelevant scenes popping up."

**Done when.** A second session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and plays one year with dev mode's Run, once as a 17-year-old and once as a seated council member (Advanced, Play as), answering every scene that stops play. It runs `node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>` on the same seed for the list of scenes with their cause record ids. For every scene that played it writes one row: the kind, the ending reached, the record id that ending wrote, and the later record id that shows another engine read it (a closeness change, a promise the campaigns engine holds, an obligation, a hire, a vote). Zero scenes that played lack both ids. Dev mode's scene list shows, for each kind, the write-back it declares or that it will not play. The same on seeds 3dac8ffb3f3c, 8a5d1fba28fc and fd7e212758b7. A director test reads every situation type and fails when a kind that can be staged has no ending with a written record and a named reader, and the favor/promise stopgap is resolved or its remaining kinds are listed. Skipping eight months as a new adult in Point of Rocks, Wyoming meets a director moment or a recorded reason none stopped it, and the record id of every stopping moment resolves with `resolveSavedTraceV1`. The owner plays it: every scene that stops him ends with something he can find afterward, on a person's card, in his journal or in a vote.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/director/data/situation-types.json, src/director/data/stopgaps.json, src/bench/dev-mode.ts, src/core2/saved-trace-v1.ts, src/director/director.test.ts

**Notes.** From the Fable audit, Pillar 4 ("99 kinds of scene", "What a player sees") and root cause 6. The audit's count is as of Nov 9 (99 kinds). Mine is of Nov 10's main (103 kinds) and uses only the `keeps` field of each ending in purpose-arcs.json, so it is a first list, not the answer: a reply handler can write a record the `keeps` field does not show (a yes to a job offer hires the player, and promises in speeches, interviews and floor-vote asks are kept and used, src/core2/modules/voting.ts near 812, by the audit). The builder's first step is the true table by what each ending writes and who reads it.

My Nov 10 lists. All endings keep "none": race-told, diploma-home, no-diploma-home, filing, door-signature, family-win, family-loss, desk-bill, new-baby. Endings keep only a promise or nothing: care, hallway, campaign-stop, speech-afterward, door-ask, party-recruit, desk-visit, cause-invite, floor-debate, interview-invite, debate-invite, volunteer-offer, manager-offer, job-offer, rival-word, rival-filed, budget-cut. The address, interview-sitting and debate-sitting kinds have no `purpose` because a speech or a sitting plays them; they pass this item only if the record they write has a named reader.

Not verified: I played none of these scenes to their endings, and the audit did not say which seven kinds played in Blodgett Landing beyond the five "someone has news" scenes, the hallway scene and the goodbye. Dev mode's scene list is screenshot 08 in docs/audits/fable-vision-2026-11-09-screens/ on branch audit/fable-vision.

Related: words-scene-ending-writes-its-record (open, lead words: making each ending write its record; evidence added there Nov 10), director-no-borrowed-small-talk (filed with this one: what a kind with no lines does today), director-casting-rule-on-every-scene-kind and director-cap-on-scene-repeats.
