---
id: scene-disaster-first-hours
title: "When a disaster begins, the department head whose crews are out comes to the executive, and the governor calls the mayor"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by: 
pr:
blocked-on:
source: scene researcher Helper D, Oct 27; scenes-from-life episode disaster-first-hours (owner's executive brief: a disaster's first hours, a mayor and the governor)
lead: director
claimed-at: 
---

**What.** A scene researcher's item for the director engineer. On the day a real FEMA incident begins in the player's town, the head of the department that handles it comes to the executive's office with the first count and asks what they may spend. The governor calls the mayor on the same day when the governor is a full person. The executive answers one of four ways: authorize the spending, ask what is needed first, escalate to the governor, or hold to the budget. The facts the lines say come from the disaster record, the damaged-home count where FEMA counted homes, and the town's seated department heads.

**Rules.** No dice: who comes is the seated head of the post the incident type engages, never a roll, and what they say follows their traits and their tie to the executive. Wire to the world: the disaster record, the appointment row and the declaration records are read by the director, and the scene cites each by record id. No hand-written player text in code: every word is a bank piece worded by the English engine.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the director engineer did not choose, a recorded hazard.disaster that names the town's executive casts the fire chief or public works director as the visitor and composes the scene citing the disaster record and the appointment row by id, saying the damaged-home count when the record holds one; a town with no seated head fires none; two trait profiles of the visitor say it differently; the four replies are four moves; a test fails when the executive is missing from the disaster record.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/civic-roles.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, docs/design/scenes/from-life/disaster-first-hours.md

**Notes.** Packet: docs/design/scenes/from-life/disaster-first-hours.md. Trigger record kind: hazard.disaster (needs the engine item world-disaster-names-the-executives, so the executive has a moment); facts it carries today: disasterNumber, title, incidentType, countyCode, statewide, damagedHomes where FEMA counted homes. Place kind: the executive's office, else the phone, the day the incident begins. Cast rule: for a mayor, the head of the department the incident engages, from appointmentsIn (fire-chief for a tornado, severe storm, flood or fire; public-works for a winter storm), a living full person; no seated head, no scene. For a mayor whose governor is a full person, a second scene on the same record with the governor on the phone. For a governor, the affected town's mayor on the phone when the mayor is a full person. Outcome write: scene.reply and the tie contact (existing); the authorize and escalate replies should write the emergency order once world-governor-declares-emergency-in-play and world-local-emergency-declaration exist (declareEmergency for the governor). Facts the lines need: name, post, kind (the incident type lowercased), damagedHomes (only where FEMA counted), place.

Lines (scene-standard rule 4: by the visitor's top trait and tie to the player; four replies are four stances).
Narration: "The first calls about the {kind} reached {name}'s desk before they reached yours." / "{name}, your {post}, stands in the doorway with a radio still on."
Open, by tie: friend: "Before you hear it anywhere else, it is the {kind}." / none: "I need you for two minutes." / rival: "You will want to hear this from me, and not from the papers."
State, by top trait: deliberate and reliable, with damagedHomes: "We have {damagedHomes} homes damaged so far. Every crew I have is out. I need to know what I can spend before the council meets." / the same without damagedHomes: "The {kind} hit the town. Every crew I have is out. I need to know what I can spend before the council meets." / warm and agreeable: "Everyone is out. I wanted you to have the first count from me." / blunt and hostile: "It is bad. Sign whatever lets me move money tonight." / persistent: "I will keep the crews out as long as it takes. I need your word on the money."
Replies (four stances): authorize: "Spend what you need. I will sign the order tonight." / ask: "What do you need first: shelter, power or a count?" / escalate: "I am calling the governor now. Tell me what to ask for." / hold: "Stay inside your budget until the council meets."
Follow, by trait: warm: "Thank you. You will have the first full count by morning." / deliberate: "Then I will write it down and send it to the clerk." / hostile: "Then you will own what the council hears tomorrow." / persistent: "I will keep you at the front of every report."
Governor on the phone (to a mayor): "I have declared an emergency for the county. Tell me what the town needs." Replies: "Shelter and power, in that order." / "A count first. I will call you back within the hour." / "We can hold for a day. Ask me again tomorrow." / "I am asking for federal help. Put your name on it."
Close: "I will report back as soon as I have numbers." / "Call me if anything changes." / "The crews are not stopping."
(Drafts for the director engineer and the words lead to word through the English engine.)
