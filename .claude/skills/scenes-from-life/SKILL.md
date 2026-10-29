---
name: scenes-from-life
description: Grows Our Civic Duty's scenes and dialogue from real people's lives. Takes one episode from a real American's political life (any office, famous or not), writes it as a fact packet, asks whether the director and English engine would produce it from the records a played world keeps, and turns every gap into a producer, a bank of lines or a SMART item. Use when the owner says there are not enough scenes, when a season or office is quiet in play, when writing a new scene or its lines, and in every words-and-scenes lead pass. Never ships the real person's words or name.
---

# Scenes from real lives

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

The owner, Oct 26 (recorded Oct 27 in `OWNER-DECISIONS.md`): "use real life people's as examples. It can be a known American, unknown American, president, congressman, mayor, city councilman, school member, anyone... It can be copyrighted material because, again, you're just using it as calibration, and take scenes from their life. See if the engine can produce it. If not, work the framework of the dialogue in, and that will affect other scenes." Real life is the calibration set for scenes, the way real rates calibrate the simulation (`research-habit`). Nothing from it ships: no real name, no quoted line, no copied text. What ships is a producer that fires from the game's own records and bank lines written for the game's people.

## The scope (owner, Oct 27)

The owner's examples are a floor. Any record the simulation keeps can call a scene when the circumstances fit: a constituent stops the player in the street after a law passes; news of a war the game does not model is still talked about at a location; a hallway holds legislators, lobbyists and reporters. Write situation types for kinds of circumstance (who has a reason to be here, after which record, at which kind of place), cast and worded from whatever records exist, never for one named moment. Research is the Sonnet side; the director and scene code is one Opus session at high effort; they talk through pool items, PR comments and direct messages.

## The loop (one episode, one SMART item, under 4 hours)

1. **Pick an episode, not a person.** One moment with a beginning and an end from a real political life at the level the game needs: a first filing, a party chair's visit, a bad story in the paper, a debate, a lost primary, a vote traded in committee, a constituent at the door, a resignation. Any American, any office, any era; biographies, oral histories, local news, campaign memoirs, C-SPAN, court records and school board minutes all count. Read the source; quote it in your notes with its citation.
2. **Write the fact packet.** Who was there and why (their office, tie to the subject, what they wanted), what had happened on the record before the moment (the trigger), what each person said in substance (not the words), the choice the subject faced, and what changed after (a relationship, a promise, a record, a line in a history). Five to fifteen lines.
3. **Ask the engine.** In a played world (`buildBenchWorld`, a drawn place and seed you did not choose), find the records that would stand for each line of the packet: the trigger record, the people the roles would be cast from, the outcome record. For each line answer one of: the record exists and a situation type fires on it; the record exists and nothing fires; the record does not exist. Name the record ids and the situation type (`src/director/data/situation-types.json`).
4. **Turn each gap into work.** A record that exists with nothing firing is a producer (a situation type with its cast rules and outcome writes), built to `scene-standard`. A record that does not exist is an engine item for the lead that owns that engine (`lead:` set), filed SMART, never built by the words line. A scene that fires but reads wrong is lines: write the bank pieces for it, several per speaker by top trait and tie to the player, four replies that are four stances, in the game's own voice (`civic-prose`).
5. **Check it plays.** The scene is reached in ordinary play on the golden path in a second drawn place, writes its outcome back by record id, and its lines pass `player-screen-text`. Then the general case: name two other episodes from two other lives the same producer now covers. A producer that covers one life is a hand-written scene, not a producer.
6. **File the trail.** The episode's packet, the gaps, and what shipped go in `docs/design/scenes/from-life/<slug>.md` (packet and citations; never the real name in any player-facing file), and the item's Notes name that file.
   A packet PR (research only, no scene firing) opens with `Touches pool item: <id>`, never `Pool item: <id>`: line 1 flips the feature item to done on merge (Oct 27: #6304 and #6314 were sent back for it).

## SMART shape of a scenes-from-life item

- **Specific:** the episode (by slug), the producer or bank it adds, the files.
- **Measurable:** the scene fires in a drawn place from named record ids, writes a named record, and covers two other episodes; lines pass the screen-text check; a test fails when the trigger record is absent.
- **Attainable:** the engine items it waits on are filed with `lead:` and the scene lands without them where the record already exists.
- **Realistic:** Sonnet for lines and tests, Opus for a producer with new cast rules; no helpers unless the brief says.
- **Time-bound:** 4 hours an episode; what passes is pushed at the box.

## Where to start (owner's examples)

`docs/design/scenes/owner-scene-examples.md` lists every scene the owner has asked for, by where it happens in play, with what exists on main. Work a season at a time in the order the owner meets it: home and family, meeting people, filing, the campaign season, election day and night, holding office. Each pass picks the quietest stretch of a played year and finds the real-life episode that belongs there.

## Never

- Ship a real person's name, words or likeness, or a scene that only a real event's details could produce. Calibration only.
- Invent a cause the records do not carry (`no-dice`, `ask-why`). A quiet stretch gets a new record from its engine, not a timer.
- Write one line per scene. Every spoken line has versions by trait and tie.
