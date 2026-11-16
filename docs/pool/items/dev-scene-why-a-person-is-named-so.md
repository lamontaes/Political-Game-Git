---
id: dev-scene-why-a-person-is-named-so
title: "Dev mode cannot show why a scene names a person the way it does"
area: play
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: director-narrator-says-who-a-person-is
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Owner, Nov 16 00:59Z ("all this stuff that you're tracing, if it's not already being traced by the dev mode, it should be being traced by that"), through the lead, on #9581
---

**What.** When a scene names someone ("Shannon Woodward, the city clerk," or "Elizabeth Frazier" alone), dev mode cannot show why. It does not show which kind the reader picked, from which record, whether the player counts as having met them and by what record, or whether the scene type names the person alone (sceneSaysIt). The desk thread found all of that by script (.probe/who-played.mts, who-kinds.mts) for #9581.
Seen: Hardinsburg, Kentucky (2134552), seed 4276344481a2b078e70633cfee47d0caccb65f74:2. The swearing-in colleagues are named alone because of one council sitting on the day the term began, which only a script showed.

**Cause.** Found in code: src/director/who-they-are.ts `whatTheyAre` returns the kind, stage and source record ids, and src/director/relation-facts.ts `relationFacts` returns `metBefore` with no reason. Neither is read by any dev panel: src/bench/ui/dev-scene.mjs and dev-person.mjs show what a scene staged and a person's records, not how a cast person was named.

**Fix.** Have `relationFacts` say which arm made `metBefore` (family, shared sittings with the hours, a tie's last day together, the player's own record). In dev mode's scene view, under each cast person show: the phrase said, or "named alone" and why, the kind and stage with their source record ids, and the met reason. Reuse the reader's own return; add no second reader.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** Every effect can be triggered and traced in dev mode: this is the trace line for rule 136. No hand-written player text in code: dev labels come from the controls file.

**Done when.** In dev mode on the running game at Hardinsburg KY (seed above) and at a drawn place with a seed nobody chose, the swearing-in's cast shows the clerk's kind and post record and each colleague's met reason with its record, and a press interview shows the reporter named alone by sceneSaysIt; a second session sees it in the running game.

**Waits on.** #9581.

**Files.** src/director/relation-facts.ts, src/director/who-they-are.ts, src/bench/ui/dev-scene.mjs, src/bench/handler.ts
