# A court case (W1, job D)

AFTER: claude/w1-conversation-justice at 33c56f37b5 (every AFTER talk). BEFORE: claude/words-telling-said-as-talk at 657f1cd009.

Places were drawn with drawPlace(<label>, "w1-talks"); the world seed is the draw's own hash.

| Draw      | Place                    | Place key | World seed                                                       | Player            | Relative charged (adult housemate) | Official refused                                      | Charged        | Convicted       |
| --------- | ------------------------ | --------- | ---------------------------------------------------------------- | ----------------- | ---------------------------------- | ----------------------------------------------------- | -------------- | --------------- |
| w1-jobD-1 | Cheyenne Wells, Colorado | 0814175   | d0b3126ea4320873acb2f58ff3edb46776b27ed2b39ed061e938b6cdc0e0fafe | Austin McFarland  | Tim McFarland                      | Randy Luna, Cheyenne Wells Board of Trustees          | March 23, 2025 | August 24, 2025 |
| w1-jobD-2 | Pena, Texas              | 4856644   | 2bca3c5fc840289f158680472bf5061383974bf85f27e473173685fb6f8a24dc | Elizabeth Stevens | Cameron Stevens (her mother)       | Sharon Norris, Starr County Board of Commissioners    | March 23, 2025 | July 23, 2025   |
| w1-jobD-4 | Keene, Kentucky          | 2141716   | bce2d3139f1b3bcae3248ed3df9f87a553c812c678c41b91327f984e17e8d8a3 | Kieran Gallagher  | Dean Gallagher (his father)        | Nancy Meyers, Jessamine County Board of Commissioners | March 23, 2025 | July 12, 2025   |

Passed over: w1-jobD-3, Chalan Kanoa IV, Northern Mariana Islands. It has no local lawmaking body with named members to put a bill before.

How the case came about, the same way in both copies. Nothing was forced by hand; each step after the offer is the engine's own.

1. A new life with the seed and place key (no person).
2. One day was run with dev mode's advance.
3. Dev mode's Bills introduced a bill before the first local body with named members: a minimum wage of 15.00, sponsored by its first member.
4. Dev mode's Government > Bribe (considerBribe) was used with each adult housemate as offerer and each member of that body as official, in order, with a stake of 1,000,000 dollars. The engine decided both the offer and the answer.
   - With a stake of 5,000 dollars, no housemate made an offer in Cheyenne Wells (24 tries).
   - With the larger stake, the first offer made was refused in each place, by the officials named above.
5. Dev mode's run-until {kind: "justice.charged", person: offerer} ran 61 days in every place: the official reported, the investigation opened and the charge came on March 23, 2025.
   - For the verdict, run-until {kind: "justice.convicted"} ran on to the conviction. All three were convicted; there was no acquittal.
6. The play screen was reloaded. The person on the room strip was clicked, and the talk request was rewritten to the charged housemate (they were not on the strip at 8:30 PM). The server opened a real talk with them.
7. Each reply was played from its own fresh life (same seed, same day).

Pictures: after/<place>-<charged|verdict>/1.jpg and before/<place>-<charged|verdict>/1.jpg are the talk as it opens. 2.jpg onward is the screen after reply 1, 2, 3 (and 4), each reply played from its own fresh life.

BEFORE: in every telling of the case, the box after the player's reply shows only the reply and Continue; the housemate says nothing back. AFTER: the housemate answers each reply, shown below.

The record: in all three places the charged housemate is the one who offered the bribe; the official refused it. In Pena, Cameron Stevens has not pleaded (her trial is set) and says she did not do it; she is convicted at trial on July 23.

## Cheyenne Wells, Colorado (Tim McFarland; the official was Randy Luna)

### Charge (Sunday, March 23, 2025, 8:30 PM)

AFTER: "They charged me with offering a bribe. I'm pleading guilty."
Replies: 1. What happened? | 2. I'm sorry. | 3. I'm with you. (pictures 2 to 4)

- 1. What happened? → "I tried to pay off someone on the Cheyenne Wells Board of Trustees. It didn't work."
- 2. I'm sorry. → "I know, Austin. I brought it on myself."
- 3. I'm with you. → "Thank you."

BEFORE: "I've been charged with a crime."
Replies: 1. I'm here. | 2. You're not alone in this. | 3. You should have known better. (pictures 2 to 4; no answer back)

### Conviction (Sunday, August 24, 2025, 8:30 PM)

AFTER: "Guilty of offering a bribe. I'm going away for four years."
Replies: 1. What happens now? | 2. That's hard. | 3. I'll be here. | 4. You did this. (pictures 2 to 5)

- 1. What happens now? → "I report to prison soon, Austin."
- 2. That's hard. → "Write to me?"
- 3. I'll be here. → "Thank you."
- 4. You did this. → "Fair enough."

BEFORE: "I've been convicted."
Replies: 1. That's hard. | 2. I'll be here when it's over. | 3. You did this to yourself. (pictures 2 to 4; no answer back)

## Pena, Texas (Cameron Stevens, the player's mother; the official was Sharon Norris)

### Charge (Sunday, March 23, 2025, 8:30 PM)

AFTER: "They charged me with offering a bribe. The trial is July 23."
Replies: 1. I'm sorry. | 2. I'm with you. | 3. What happened? | 4. You did it? (pictures 2 to 5)

- 1. I'm sorry. → "I know. Thanks."
- 2. I'm with you. → "That means a lot, Elizabeth."
- 3. What happened? → "My lawyer says not to talk about it, Elizabeth."
- 4. You did it? → "No, Elizabeth. And I'll say so in court."

BEFORE: "I've been charged."
Replies: 1. I'm so sorry. That's family. | 2. I'll stand by you. | 3. You should have known better. (pictures 2 to 4; no answer back)

### Conviction (Wednesday, July 23, 2025, 8:30 PM)

AFTER: "They didn't believe me. I got 30 months."
Replies: 1. I'm sorry. | 2. I'll be here. | 3. You did this. | 4. What happens now? (pictures 2 to 5)

- 1. I'm sorry. → "I'll be okay, Elizabeth."
- 2. I'll be here. → "I'm counting on that, Elizabeth."
- 3. You did this. → "I told everyone I didn't, Elizabeth. I'm sorry."
- 4. What happens now? → "I report to prison soon, Elizabeth."

BEFORE (not about the case): "Automatic voter registration made the news last week. I'm for it."
Replies: 1. I've wanted that a while, Mom. | 2. Who's behind it? I'd want to know before Pena tries it. (pictures 2 and 3)

- 1 → "Good. I'll watch the paper for what comes next, Elizabeth."
- 2 → "Not that I read. Automatic voter registration is the right call."

## Keene, Kentucky (Dean Gallagher, the player's father; the official was Nancy Meyers)

### Charge (Sunday, March 23, 2025, 8:30 PM)

AFTER: "They charged me with offering a bribe. I'm pleading guilty."
Replies: 1. That's hard. | 2. I'm with you. | 3. What happened? (pictures 2 to 4)

- 1. That's hard. → "I know, Kieran. I brought it on myself."
- 2. I'm with you. → "Thank you."
- 3. What happened? → "I tried to pay off someone on the Jessamine County Board of Commissioners. It didn't work."

BEFORE (not about the case): "Statehood for the nation's capital was in the news a few days ago. About time, I say."
Replies: 1. I'd vote against it, Dad. | 2. Did they say why? Folks in Keene will ask. (pictures 2 and 3)

- 1 → "We see it differently, then, Kieran. I'm still for it."
- 2 → "The story didn't say. I've been for statehood for the nation's capital for years."

### Conviction (Saturday, July 12, 2025, 8:30 PM)

AFTER: "Guilty of offering a bribe. I'm going away for five years."
Replies: 1. That's hard. | 2. I'll be here. | 3. You did this. | 4. What happens now? (pictures 2 to 5)

- 1. That's hard. → "Write to me?"
- 2. I'll be here. → "Then I'll see you when I'm out, Kieran."
- 3. You did this. → "Fair enough."
- 4. What happens now? → "Prison, then. I'll call when I can, Kieran."

BEFORE (not about the case): "I read about apartments in single-family neighborhoods a few days ago. I'm for it, myself."
Replies: 1. I'd vote against it, Dad. | 2. Did they say why? Folks in Keene will ask. (pictures 2 and 3)

- 1 → "We see it differently, then, Kieran. I'm still for it."
- 2 → "The story didn't say. I've been for apartments in single-family neighborhoods for years."

## Not tried

- The player as an official: no. The player is not an official at the start, and the brief's two-hour cap was spent on the relative route, which worked.
- An acquittal: none came; all three cases ended in a conviction.
