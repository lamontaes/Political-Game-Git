---
name: scene-producers
description: >
  Wires a director situation type's cause to a record an engine already keeps
  (an awaitingProducer row, a type with no cause, a new scene), proves it fires
  in a played world and deletes the twins it replaces. Use when a scene waits
  on a producer or a type never fires in a played year. Not for writing the
  lines themselves (scene-standard, civic-prose) or for building a missing
  record in another area's engine (that area's pool item).
---

# Scene producers: from an engine's record to a staged scene

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

A producer is a read of an event an engine already records, never a new mechanic (AGENTS.md step 0; plan `docs/reports/words-director-plan-2026-10-28.md`, section 3). The director scores the event into a moment, a situation type's cause matches the moment, and the English engine words the scene. Each step below has a check; a step whose check fails stops the wiring.

## 1. Find the record, and that something writes it in play

- Find the kind: `grep -rn 'kind: "<kind>"\|_EVENT = "<kind>"' src/core2`. Then find who calls the code that emits it. A core action with no caller never fires: `setPartnersV1` emits `family.partnered` and `family.separated`, but no engine calls it in play, so those records exist only in the pre-start history (Oct 29).
- Count it in play: `node --import tsx scripts/dialogue-batch/event-count.ts --seed <seed> --kinds <kind> --draws 3` plays a year in three drawn places and lists each record and the people it names.
- **Zero in every draw means no producer today.** Leave the cause as `awaitingProducer`, name the real kind and the owning engine in the pool item that builds the record (add your counts there as evidence), and say so in your channel block. Do not wire a cause that cannot fire: it reads as done and never plays. Counted on Oct 29, in four drawn years: `justice.released` 0, `justice.charged` 0 to 4; the school engine emits no events.

## 2. Score it

- Add an `eventImpacts` row in `src/director/data/director.json`: the event kind, its channel (`feeling` for a life event, `cause` for a civic act, `money`), and an impact parameter. A fact that names the other person goes in `counterpartFact`.
- Size the parameter in the parameters table: ESTIMATED, from the Social Readjustment Rating Scale's life-change units divided by 100 (Holmes and Rahe 1967), with the item named and a spread. Existing rows to copy: `directorKinMovedImpact` 0.29, `directorEvictionImpact` 0.47.
- Director code keeps no numbers (`director.test.ts`, "keeps numbers in data").

## 3. Match it

- The moment's label is `<channel>:event:<kind>`, e.g. `feeling:event:justice.released`.
- Use `selfNamed: true` when the scene is the player's own event.
- Use `counterpart: "some"` or `"none"` for whether someone else is named.
- Use `causeFacts` (a fact equals a value, names the subject, includes the subject) and `occasion` or `act` for a heard speech.
- Bind each role to `subject`, `counterpart`, `household`, `kin` or `present`; set `opener`, and `setting` when the place matters.
- **One record, one scene.** When a circumstance row (`src/director/data/circumstances.json`) already stages the record, do not add a second type for it; delete the twin instead. For example, `eviction-notice` waited on `housing.notice-served` while `notice-home` already staged that record. The twin's purpose arc in `purpose-arcs.json` and its pieces in `scene-talk.json` go too, and the type count in `director.test.ts` reads the file itself.

## 4. Word it

- **The lead narration:** `data/english/parts/scene-words.json`, move `lead-<type>-<choice>`, role `<type>`, choice `other` (someone present) or `alone`; several variants, varied by what the record holds.
- **A scene with a purpose:** pieces in `scene-talk.json` per move.
- **The sitting bans fail the build** (`tests/guards/english/sitting-bans.test.ts`). In narration that means:
  - no "{x} is home", "at {place}" or "is in with";
  - no slot for the weekday, month, date, time, place, town or room;
  - no year said aloud.
  - In anything spoken: no "must", "talk soon", "see you later", "that's settled", "the doors" or "gaps".
- Use "they" for a person whose pronouns the record doesn't give.
- Run `node --import tsx scripts/dialogue-batch/apply-grades.ts` after any bank change.

## 5. Prove it in a played world

- **Ordinary events:** `node --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed>` plays the player's year and lists each scene with the record that fired it. A type that did not fire is listed with why.
- **Rare events: replay and watch.**
  1. `event-count.ts` finds a drawn place and the people a record names.
  2. A test builds the same world, calls `world.director.watch(core, id)` for those people at the start, and advances the year.
  3. It asserts the schedule binds the type, and that `composeScene` narrates from the record.
  4. Name the place, the seed and the record ids.
- A unit fixture proves edge cases only (AGENTS.md, generated-world proof).

## 6. Count what was removed

The PR body names the `awaitingProducer` rows replaced, the twin types, arcs and pieces deleted, and the scenes that still wait, with the engine and pool item each one waits on.
