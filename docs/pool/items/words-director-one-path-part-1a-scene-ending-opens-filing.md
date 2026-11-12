---
id: words-director-one-path-part-1a-scene-ending-opens-filing
title: "A scene that ends in running for office takes the player to the filing office"
area: director
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-story-director
source: split from words-director-one-path-part-1-filing-scene-situation-type by the cause finder, Nov 11, 2026
claimed-at:
---

**What.** Part of words-director-one-path. Arcs in src/director/data/purpose-arcs.json end with `opens: "filing"`. In the party's ask, those are `running` and `running-on-terms` ("You'll run"); in the filing clerk's arc, `filed` and `sized-up`. The director copies that onto the ending, but the game never reads it, so a scene in which the player agrees to run just closes. Read it and take the player to the counter. Seen: when the player agrees to run in the party's ask, the talk closes with a control to go to the office that takes the filing, and choosing it opens the counter.

**Cause.** Found in code: `resolveEndings` in src/director/scene-talk.ts (around line 709) copies an arc ending's `opens` onto `node.end.ending`, and nothing in src/bench reads it (`git grep -n "ending.opens\|ending?.opens" -- src/bench` finds nothing). In src/bench/play.mjs the talk player's reply handler (the `play` closure, around line 2186) calls `nextScene(story)` when a reply has no `next`. It never looks at the ending.

**Fix.** In src/bench/play.mjs, when a reply ends the scene, read the ending of the node it reached (`end.ending`). If `opens === "filing"`, add one control to the talk box's close. Its label comes from `controls` (a new label for going to the filing office, requested from the Words session if no fitting one exists; no text typed in code). It calls the existing `openFiling(filedWith, contestId)` for the player's open race. Read the race from the scene's facts or bindings when it names a contest, otherwise the first of `/api/government`'s contests, as the travel screen does (around line 4115). The control appears alongside `nextScene`, never in its place. Add a browser check in src/bench/filing.browser.mjs (or a new browser file beside it) that plays a scene to an ending with `opens: "filing"` and sees the counter open.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the control's label is a worded label from the bench's controls data. One rule, all 56 places: the office comes from the race's filing-office record (`filingOfficeFor`), never a named place. A scene exists only if it writes something back (scene-standard): the ending's promise is already kept on the reply record, and this makes it lead somewhere.

**Done when.** A second session plays the party's ask to "You'll run" in a drawn place, named with its seed, through the screens a player reaches or dev mode's scene route. It sees the talk close with the control to go to the filing office, and choosing it opens that race's counter, named by contest record id. Ending the same scene by refusing shows no such control.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/filing.browser.mjs, src/director/scene-talk.ts, src/director/data/purpose-arcs.json

**Notes.** Nov 11 (cause finder for Fable B): found while tracing the filing counter. Part 1 needs this reader for its own endings.
