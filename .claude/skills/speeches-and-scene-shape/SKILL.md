---
name: speeches-and-scene-shape
description: >
  The owner's shape rules for speeches, scenes and long turns in Our Civic
  Duty (Nov 15): a speech's length varies and its points follow the world, so
  no two read as one format; a scene has an outcome or is a step toward one; a
  long turn is one block of three or four short sentences; every line is
  plugged into one place so a future overhaul can find the first line written.
  Use when writing or reviewing a speech, scene, talk or bank piece, or
  building the line index. Not for line wording (civic-prose, words-engine).
---

# The shape of speeches, scenes and turns

## Speeches

Owner, Nov 15, 02:39Z: "that speech rule goes with every speech. Now, it doesn't mean every speech needs to be a ton of words. You know, the Gettysburg Address is very short, but I'm thinking of the president's speech and how they all follow the very same format. This is this point, this percent up. I intend to do this, and for those people out there, I did not forget about you. Like, no, that's not how they go."

- The speech rule (in `words-engine` and the line rules) applies to every speech: the presidential address, a campaign stop, a floor speech, a victory or concession, a council comment. Check each kind, not only the one a builder was handed.
- Length varies by speech and by speaker. His guess for the presidential address was "anywhere from 5 to 20" (the unit is his loose count of beats; read it as points, not sentences, and do not treat it as a cap or a floor). Short is fine; one format repeated in every speech is the defect.
- Speeches get better with time and feedback; build the system (many point shapes, picked by the world and the speaker), never one polished example.

## Every line is findable

Owner, same message: "be sure there's an easy way to... account for scenes and words in the future... in like a year... it's time to overhaul this. Well, it'll be easy to find... the very first line written because they're all plugged into the same place... A control panel kind of thing, just in the back end."

- Every shipped line, scene and speech piece lives in the banks (`data/english/parts/`) and is reachable from one index by id, bank, move, author and date (`origin: authored` carries author and date). A line that lives anywhere else (typed in code or a screen) is a defect (`scene-standard`, `player-screen-text`).
- When a new kind of text appears, give it a bank and put it in that index in the same change; do not make a second place.

## Scenes and turns (owner, Nov 15, relayed by the Account lead)

- A scene has an outcome or is a step toward one: something a later scene, record or screen reads. A scene that only talks and writes nothing is not accepted.
- A long turn is one block of three or four short sentences, never a wall and never a list of beats.
- Old lines are deleted, not kept: a line taken out of play is removed from the bank, with no archive copy and no commented-out version (owner, Nov 15, 00:49Z).
- Before any design question about a speech or scene, search the whole repository for his earlier ruling (`look-first`) and cite it.
