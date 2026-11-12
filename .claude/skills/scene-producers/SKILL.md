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
- **One record, one scene.** When a circumstance row (`src/director/data/circumstances.json`) already stages the record, do not add a second type for it; delete the twin instead. For example, `eviction-notice` waited on `housing.notice-served` while `notice-home` already staged that record. The twin's purpose arc in `purpose-arcs.json` and its pieces in `data/english/parts/scene-talk.json` go too (name them on the pull request for Story to delete), and the type count in `src/director/director.test.ts` reads the file itself.

## 4. Word it

- **The lead narration** (Story writes it, see below): `data/english/parts/scene-words.json`, move `lead-<type>-<choice>`, role `<type>`, choice `other` (someone present) or `alone`; several variants, varied by what the record holds.
- **A scene with a purpose:** pieces in `data/english/parts/scene-talk.json` per move.
- **The sitting bans fail the build** (`tests/guards/english/sitting-bans.test.ts`). In narration that means:
  - no "{x} is home", "at {place}" or "is in with";
  - no slot for the weekday, month, date, time, place, town or room;
  - no year said aloud.
  - In anything spoken: no "must", "talk soon", "see you later", "that's settled", "the doors" or "gaps".
- Use "they" for a person whose pronouns the record doesn't give.
- **Only the Story session writes, changes or deletes lines under `data/english/parts/`** (owner, Nov 10: "split by role"). A builder wires the cause and lists each line and piece the scene needs, with the move it serves, on the item's pull request; Story writes them. After a bank change the update is `node --import tsx scripts/dialogue-batch/apply-grades.ts` and then `npm run words:rules` (Nov 9: rules judge every line, and a line that fails is pulled in `data/english/pulled.json`; there is no reach file or odds table to rebuild).

## 5. Prove it in a played world

- **Ordinary events:** `node --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed>` plays the player's year and lists each scene with the record that fired it. A type that did not fire is listed with why.
- **Rare events: replay and watch.**
  1. `event-count.ts` finds a drawn place and the people a record names.
  2. A test builds the same world, calls `world.director.watch(core, id)` for those people at the start, and advances the year.
  3. It asserts the schedule binds the type, and that `composeScene` narrates from the record.
  4. Name the place, the seed and the record ids.
- A unit fixture proves edge cases only (AGENTS.md, generated-world proof).
- **Compose it, don't only bind it.** A cause that binds a type whose purpose cannot be worded stages an empty scene that still stops the player (the filing scene after the counter, #6990). Call `purposeScene` on the staged entry and check it is not skipped.

## 6. Count what was removed

The PR body names the `awaitingProducer` rows replaced, the twin types, arcs and pieces deleted, and the scenes that still wait, with the engine and pool item each one waits on.

## 7. Adding a whole scene kind from a record (what Nov 8 taught)

The recipe, in the order that worked (the rally, the doubt at home and the lobbyist who remembers): a circumstance row or a cause on the type, the situation type, the purpose arc, the bank pieces, the facts block in `purpose-scene.ts`, one test in a drawn place.

- **Setting.** A type for a body's seat takes `["seat","venue"]` as hallway does; `["seat"]` alone stages nothing and no error says so.
- **A cast from two records.** A circumstance pool (`poolOf` in `circumstance.ts`) may read a second engine's table against the trigger record (the lobbyist's meetings against a member's `office.voted`); a record that does not name the player never reaches the pool.
- **Pieces** (Story writes them; this is what its pieces must satisfy, so list the moves you need). The scene-talk and tree tests compose every purpose from a generic fixture, so every purpose needs at least one narration and one ask with no required facts, and at least one reply of each follow move; a tree needs depth 2, so a reply the asker cannot let rest (a deflect) must draw a press.
- **Narration** may not carry "today", "tonight", "yesterday" or "this ...". A piece key is its move and text, so two pieces with the same words collide even under different facts.
- **Area and issue words.** Say an area after "with" or "about", never "on" ("safety on our streets"), and never as a verb's subject ("our schools has").
- **After a bank change** run `apply-grades.ts` and `npm run words:rules`; when main moved a generated file (`data/english/pulled.json`, `part-grades.json`), take main's and regenerate it, never merge it by hand.
- **A threat's cost** (money, an endorsement) is the interest-group engine's to read; until it does, register the stopgap and say so.
- **Read the PR's own state right before every push to its branch.** A push to a PR that merged a minute earlier is stranded (Nov 8, twice: a floor-debate export that missed #7529's merge, and a first push the desk's own commit bounced). Check merged or open, and pull the desk's commits in, then push.

## 8. Giving a kind several arcs (owner, Nov 8: "you could get 30 different scenes within there")

One kind of scene can play several arcs, its **variants**, and the records pick which one. There is one engine (`src/director/arc-variant.ts`) and one data file (`src/director/data/arc-variants.json`); a new family is a row of data, never a new code path.

- **A family** is a purpose in `purpose-arcs.json` (`bribe-offer`). Its variants are rows: a `purpose` id for the bank (`bribe-offer.small`; the plain row keeps the family's own id and arc), a `base`, `terms` (a named read, a weight, `low` for one minus the read), `pull` (personality facets whose mean on the asker multiplies the score by one plus the pull) and the `arc` (state, replies, follow, again, endings: moves only).
- **A read** looks at the records in one of six ways: `record` (a number on a module row that a fact of the cause record names), `fact` (a number the cause record itself carries), `closeness` (how close the two people are), `history` (how many earlier records of some kinds name both people), `strain` (how hard pressed the asker is for money), `setting` (where it is set). A new read is a data row of those kinds; add a way of looking only when none fits.
- **Reads use what stays true while the scene is open** (the kept record, the tie as the engine kept it, what happened before the cause's day). The first choice for a cause stands, so the tree the player sees is the tree a reply is matched against.
- **Weights are hand set**: sample the reads over a drawn world's offers (`scratch` script: `considerBribe` with dev mode's `pick`, then `chooseVariant`) and set base and weights so every variant wins somewhere. The registered stopgap is `SG-STORY-arc-variant-weights`.
- **Ending ids the engines read keep their meaning in every variant** (`took-it`, `put-off`, `left-there`, `said-you-would-report`); any other id is a refusal to the corruption engine. Put a `reply` ending before an `anyReply` one when the last thing the player said should win.
- **Pieces.** A piece written for the variant (`uses.purpose: "bribe-offer.small"`) beats the family's whatever facts either needs; once the variant's own lines are said on a branch the family's serve, so write only what makes the variant differ. A variant needs two lines for each move it offers at the root or its tree stays one deep; add `close` pieces when the family's close would clash.
- **Per-cause keys.** The scene's word picks are keyed on its cause (`SceneTalkCast.causeId`), and a type whose scene is about one record's decision is `eachCause: true`, so two records between the same two people are two scenes. Never key a scene on its kind and its people alone.

## 9. What the damaged-home scene taught (Nov 9)

- **A table is not a record.** A circumstance row reads logged events; an engine's module table (the disasters engine's `damaged` rows) calls nothing. Have the owning engine emit one event naming the household on the day it fills the row (as housing does for a notice), with the row's id in its facts, and word the scene from that event; the row stays the engine's only copy.
- **Do not set `topic` on such an event** unless it is a policy topic: the facts block turns any `topic` into the `cause` slot.
- **A scene that is logged but never staged:** read `ledger.circumstanceLast` for the player. The week between scenes (`lived: true` lifts it for the player's own life) and the cast window (`recast: true` lifts it for a household with one other person, whom a news scene may have cast lately) hide a scene without an error.
- **Pieces: only the top tier plays.** `fitting()` keeps only the pieces with the highest specificity, so a state that has pieces for a move (paid-up) silences the generic ones; a generic piece that presupposes the other state ("how do we pay for it") needs `excludesFacts`, and each state needs a piece for every move of every branch, or its tree loses a reply. Give the pieces for the heaviest state the most required facts (ties pick across both).
- **Money in a fact** goes through `moneySaid` ("about $4,000"): never write "the {loss}" or "toward the {left}"; write "come to {loss}" and "still owe {left}".
- **The director imports no module from another engine family** (the families guard counts it): name the record kind in a local constant beside `RALLY_EVENT`.
