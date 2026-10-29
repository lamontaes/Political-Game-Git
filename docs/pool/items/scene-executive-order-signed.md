---
id: scene-executive-order-signed
title: "When a governor signs an order, a resident it reaches comes into the room and asks one thing"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by: 
pr:
blocked-on:
source: scene researcher Helper D, Oct 27; scenes-from-life episode executive-order-voting-rights (a governor restoring the vote by order, a supporter at the signing)
lead: director
claimed-at: 
---

**What.** A scene researcher's item for the director engineer. On the day a governor issues an executive order, the governor's aide sets it on the desk and a resident the order reaches comes into the room and says what it means to them. The governor answers one of four ways: promise to ask the legislature to write it into law, own the order, warn that it lasts only as long as the governor holds the office, or ask what else they need. A governor's revocation of an earlier order is the mirror, with the same resident asking what happens to them. The resident is filled in from the state's counted adults the order reaches, as the two-level population rule has it.

**Rules.** No dice: whether an order is issued follows the governor's powers, views and law in force already, and what the resident says follows their traits, never a roll. Wire to the world: the order's law row, the state's felony-disenfranchisement share and the filled-in person's record are read by the director, and the scene cites each by record id. One model, two tiers: the resident is the counted group's rule made one person, matching the state's share, never a separate simulation.

**Done when.** In a played world (buildBenchWorld) in a drawn place whose state lets the governor order the restoration, and a seed the director engineer did not choose, an office-act record for the order casts a filled-in resident the order reaches and composes the scene citing the act, the order's law row and the filled-in person by id; a governor with no aide, or a state with no counted adults the order reaches, fires none; the four replies are four moves; a revoke fires the mirror; a test fails when the act record is absent.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/civic-roles.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, docs/design/scenes/from-life/executive-order-voting-rights.md

**Notes.** Packet: docs/design/scenes/from-life/executive-order-voting-rights.md. Trigger record kind: office-act (entry executive-order, subject restore-voting-after-sentence; names the governor today; its facts carry entry, subject, by, choice). A revoke (choice.revoke true) is the mirror cause. Place kind: the governor's office or a ceremony room, the day the order is issued. Cast rule: the aide is one of the governor's serving staff (servingStaffOf); the guest is a resident the order reaches, filled in with fillInPerson from the state's counted adults with a finished sentence (felonyDisenfranchisedShare times the restored fraction), seeded from the world so the same person returns; no filled-in guest, no scene. Outcome write: scene.reply and the tie contact (existing); the promise reply should open the office screen's bills (a bill asking the legislature to write the order into law); proposed kept record order-promise:<order>:<date> for the legislature engine. Facts the lines need, each from a record: name (the guest), aide (name), years (whole years since the guest's sentence ended, from the justice record the director fills in), order (the order's plain name), revoked (true on a revoke).

Lines (scene-standard rule 4: by the guest's top trait and tie to the governor, none here; four replies are four stances).
Narration: "{name} stands near the desk while the order is read. It reaches {name}." / "The order is on the desk. {aide} sets the pen beside it and steps back."
Open: "May I say something before you sign?" / "I read the order twice. May I ask one thing?"
State, by top trait: warm and agreeable: "I wanted to thank you. I have not voted in {years} years." / deliberate and reliable: "I read it. It leaves out people with charges pending, and I understand why." / hostile and argumentative: "An order can be undone by the next one. I would rather see it in law." / persistent: "I will register the day it takes effect. I hope you will keep it."
Replies (four stances): promise the law: "I will ask the legislature to write it into law." / own it: "It is what I said I would do." / warn: "It lasts as long as I hold this chair, and I mean to hold it." / ask: "What would you need that this order does not give you?"
Follow, by trait: warm: "Thank you. People will remember that you came to the room." / deliberate: "Then I will wait to see the bill." / hostile: "Then I will be at the hearing." / persistent: "Then I will be one of the first in line."
Revoke mirror: guest: "I registered last year. What happens to me now?" Replies: "Nothing changes for you today. I will say so in public." / "The law is the law. I will ask the legislature for yours." / "I am sorry. It is the next order." / "Tell me what you need to keep the vote."
Close: "I will tell the others." / "You will hear from us at the hearing." / "That is all I came to say."
(Drafts for the director engineer and the words lead to word through the English engine.)
