# Get in touch: Visit and Call on a person's card, lines as played

Instruction: the Account lead's assignment of Nov 14, 2026, 07:06Z (no owner quote for this exact ask; the promises, family-life and eviction-talk threads each found that "I'll come by" and "I'll call" have no act that keeps them), and the Words lead's ruling on #9171 at a01d3159 (heading, first-name reasons, died line, no false reason, by-phone fact). Owner's Nov 14 06:38Z rule applied: plain American English.

Every new string, all in `src/bench/data/controls.json` under `person`:

- Section heading: **Get in touch**
- Buttons: **Visit**, **Call**
- Place name after a home visit: **{name}'s home** (a workplace shows its own name)
- Why a Visit is closed, with the person's first name, under the buttons:
  - They are in the room: {first} is right here with you.
  - They live outside the town: {first} lives too far away to visit.
  - No picture of where they are: You can't get to where {first} is right now.
  - A stop holds the clock: Finish what you're in the middle of first.
- Someone who has died: one line, no buttons: {first} has died.
- A Call that cannot open (the game has no talk for that person) is not shown, with no reason.

No bank lines changed. A call's talk carries the fact `by-phone`; the phone openers and goodbyes and holding in-person greetings off that fact are the bank's (Words lead, through the conversation engine). Until they land a call still opens with in-person greetings, as 1-call.png shows ("Funny running into you"): that is the known gap the fact is for.

Pictures at 1440x900 in three drawn places. Before is the same card with the Get in touch section hidden, since the section is purely additive.

| Place (seed)                                              | Picture                                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Rayland, Ohio (eae652bc-5253-4cee-9f54-425121a3ea01)      | 3-card-before.png, 3-card-after.png (Visit and Call shown), 3-visit.png (Liam Little's home, 9:14 AM after the trip and the visit hours) |
| Wellston, Ohio (6c89938b-5488-4cd2-8a46-a284da48ce7d)     | 1-call.png (a call opening, Charles Vance)                                                                                               |
| Mansura, Louisiana (0ec0064b-b07b-40df-a698-2fbccebd6f3e) | 2-call.png (a call opening, Jade Peck)                                                                                                   |
