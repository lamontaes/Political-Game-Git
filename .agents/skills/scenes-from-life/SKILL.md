---
name: scenes-from-life
description: >
  Builds every scene from a real-lives pattern (owner, Nov 18): research how
  the moment goes in real American lives, write it as a pattern in
  docs/story/scene-patterns.json with role and setting slots, gates, weights
  and branches, check the engine gives the scene's packet those facts, brief
  line writers from the pattern, read every line filled in, and have fresh
  readers judge it. Never ships a real person's name or words. Use for any new
  or rebuilt scene, a quiet season in play, or a words-and-scenes lead pass.
  Not for the checkable rules a finished scene meets (scene-standard) or the
  English engine's own mechanics (words-engine).
---

# Scenes from real lives: the pattern method

**Look first:** run the `look-first` search before building, fixing, filing or asking; a found ruling is built and cited, never asked again.

The owner, Oct 26: "use real life people's as examples... take scenes from their life. See if the engine can produce it." The owner, Nov 18, via the CTO on #9750: every scene is built from a pattern in `docs/story/scene-patterns.json`, and each situation type names its `pattern` (scene-standard rule 13). Real life is the calibration set for scenes, the way real rates calibrate the simulation (`researcher`). Nothing from it ships: no real name, no quoted line, no copied text.

## The files

- `docs/story/scene-patterns.json`: the patterns, by bank. A01 to A47 are the on-ramp and involvement, B04 to B55 the campaign and office moments, bank 5 (B5-01 to B5-06) home and work life, bank 6 more of life, bank 7 (B7-01 to B7-12) the office kinds. Each pattern holds its `moment`, `roles` (each a role, never a named office: "kin or housemate, neighbor, coworker the next morning, a regular at a gathering place, a party officer, rarely a stranger"), `setting` (a slot: home, work, a gathering place, out in public), `gates` (records that must hold, never a number), `weights` (who and when), `branches` (each leads somewhere: a meeting, a nudge, a tie that remembers, the next talk), `choices`, `ifNo` and `sources` (paraphrased, cited).
- `docs/story/scene-pattern-map.md`: each situation type in `src/director/data/situation-types.json` against its pattern, "same moment", "close", or "none, new". A type with no pattern gets one before any line.

## The loop, one scene at a time

1. **Research the moment, not a person.** Read real accounts (studies, surveys, oral histories, local reporting, memoirs) of how the moment goes for ordinary Americans. Paraphrase them as the pattern's `sources` with citations. A Sonnet researcher does a bank (bank 7 was 13 office kinds, then second sources); it runs `npm run spelling` before it reports.
2. **Write or read the pattern.** The speaker is a role, the place is a slot (A47: the first word on the address can be kin at home, a coworker the next morning or a regular at the diner). Gates are records. Every branch ends somewhere a later scene or screen reads.
3. **Engine first.** Find what the scene's packet carries (`composeBinding` in `src/director/purpose-scene.ts`, and the facts helpers it calls) with a probe in a drawn place. If the packet holds only the people and the town, the scene is not written yet: give the packet the facts the pattern names from the records that hold them (the employer, the years, the school, the meeting, the party's deadline), each cited to its record id, with a test at a drawn place (CTO, Nov 18). A fact no engine keeps is a pool item for the engine that would keep it.
4. **Brief the writers** from the Story lead's line-writer kit, one setting or stage per writer (CTO: split the helpers by setting). Each pull request names its pattern ids.
5. **Read every line with its slots filled in** before any verdict: the writer keeps a rendered file, and the lead sends back what reads wrong.
6. **Fresh readers judge** the new reply pairs and narrations with planted rows (`words:pairs`, `words:review`, a fresh reader per batch, `words:review --check`, `words:verdicts --from`, the rules twice; `words-engine`). Fold before editing lines.
7. **Prove it in play.** The scene stages from its engine's record in a drawn place, through dev mode's force when there is one, and the talk names what the record holds (`played-world-proof`). A scene that only a hand-relabeled moment reaches is a producer defect to file, not done.

## What writers got wrong on Nov 18 (each was sent back for it)

- **A fact slot in every line.** The insert guard pushes every line of four words or more to carry a slot, and writers stuffed the employer or the school into all of them ("I'll make your favorite supper to mark Long Hill High School"). A full name is said at most twice a talk; give the packet the short forms people use (`workplace` "the clinic", `school-short` "Long Hill").
- **A slot as a stand-in.** The school's name for "it", the cause for the group working on it ("That helps more spending on land and water"). A slot carries the fact the line is about, in a form it fits ("pushing for {cause}", "as {position}").
- **Thin, stock fallbacks and threats in closes.** A line of one to three words says one clear thing a person says then; a family scene's warning is worry, never a threat.
- **Narration that knows too much:** a letter from the school, a weakness, a reason someone came. Narration says what is seen.
- **A reply that promises an act the engine never records** (leaving the floor, being marked not voting).
- **A second round that repeats the first** (later-replies-move-the-talk-on): the second round is the `reply` rows chosen by `after`, and needs its own lines.

## Breadth: the catalog

When the ask is breadth, work by pattern bank and the map, never by episode. Look for scenes the world already plays between other people but skips for the player (`playerId` exclusions, `SG-*-player-*` stopgaps), traits nobody decides with, and `eventImpacts` rows in `src/director/data/director.json` whose event no situation type matches: each is a scene with its record and moment already built (Nov 15).

## Never

- Ship a real person's name, words or likeness, or a scene only a real event's details could produce.
- Invent a cause the records do not carry (`no-dice`, `ask-why`). A quiet stretch gets a new record from its engine, not a timer.
- Write lines for a scene with no pattern, or before its packet carries what the pattern needs.
- Hold a scene for its picture: it ships on its fallback with a `wantedScenes` line (`scene-pictures`).
