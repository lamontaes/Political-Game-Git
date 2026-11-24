# Words in thirty scenes: grading batch batch-10

Thirty different scenes from one place, Westerly, Rhode Island, played 365 days from 2026-10-12 (seed `7e210acb7a79c1f50b2f42db0ed4ad0ed1372e9c840477670b0a53c0bea69d1c`). Its year passed real local laws: 2026-1 ("Rent stabilization"); 2026-2 ("Inclusionary requirement"); 2026-3 ("Civilian oversight of police"); 2026-4 ("Restrict government facial recognition"); 2026-5 ("Allow multifamily in single family zones"); 2026-9 ("Right to counsel in eviction"); 2026-10 ("Universal preschool"); 2026-11 ("Limit groundwater withdrawal"). Places drawn before it and passed over: Waterford, California: the played world stopped before its year ended (Only a current standing obligation can end.).

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 12 lines and 0 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 12 lines were left out: held-by-grades 12.

| Scene kind             | Scenes |
| ---------------------- | ------ |
| A chapter of "My life" | 2      |
| A conversation turn    | 6      |
| A meeting              | 2      |
| The minutes            | 3      |
| Bill text              | 3      |
| A notice               | 2      |
| A rally                | 2      |
| An interview           | 3      |

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to `data/english/grades/batch-10.json`:

```json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger.

## Facts that were stood in

- Westerly: 0 decided races, office levels federal/state/township; bills and roll calls are the legislature module's own rows (16 local bills, 10224 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet
- no race was decided by the end of the run, so victory and concession lines (which need a recorded winner and loser) cannot be produced
- defect for OPUS-GOV: 1 local bill(s) passed with no title on record (2027-3, no provisions); a bill needs a title the words can name
- A town body member's words to the chair: the meeting bank holds Congress's floor procedure, which a town council never hears, so no member speaks to the chair until a local body's own words are mined.
- Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.
- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.
- Only 23 different scenes passed: the world held no more scenes whose phrases were not already shown.

## The scenes

### 0. A chapter of "My life"

The scene: The "My life" journal of Lara Graves, chapter "My daughter".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated January 5, 1971

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lara Graves: My daughter was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 1. A conversation turn

The scene: Aaliyah Peck talks with Addison Peck, day 1, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Aaliyah Peck's traits (conversation.reply-reach: leans toward carrying the talk on, 0.53). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Addison Peck: Good to see you.
2. Addison Peck: Have you heard from Blair?

| #   | Reply              | Lie | Good here? |
| --- | ------------------ | --- | ---------- |
| 1   | Have you?          |     |            |
| 2   | I saw Blair today. |     |            |
| 3   | No, I haven't.     |     |            |
| 4   | All right.         |     |            |
|     | (Say nothing)      |     |            |

### 2. A meeting

The scene: The Town of Westerly council takes up 2026-1 ("Rent stabilization"); the recorded result is enacted.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (word choice).

1. Jennifer Franco (chair): **The meeting will come to order.**
2. Jennifer Franco (chair): All in favor?
3. Jennifer Franco (chair): The motion carries.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | The committee will come to order.              |         |

### 3. The minutes

The scene: The roll call on 2026-1 ("Rent stabilization") before the Town of Westerly council: 4 for, 1 against; the bill enacted. Each name is read from a member's recorded vote.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. Town of Westerly council (minutes): Voting for this action: Amanda Pittman, Amir Elliott, Nina Ramsey and Derek Sanders.
2. Town of Westerly council (minutes): Voting against this action: Jennifer Franco.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 4. Bill text

The scene: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the Town of Westerly council: it adopts "Rent stabilization" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. Town of Westerly council (bill text): This title may be cited as the "Rent stabilization".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. A notice

The scene: A hearing notice for 2026-1, posted by the Town of Westerly council.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Town of Westerly council clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Rent stabilization" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A rally

The scene: Wanda Riddle speaks at a rally in Westerly as a candidate for U.S. Senator.

How it was made: composeAddress (src/presentation/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Wanda Riddle: It's good to be back in Westerly.
2. Wanda Riddle: I grew up in Westerly.
3. Wanda Riddle: Get out and vote.
4. Wanda Riddle: **Thank you all.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you.                                     |         |

### 7. An interview

The scene: A local reporter's interview of David Miles (a candidate in Westerly, 2026-10-19); asked about "Shift highway funds to transit"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. David Miles: You have my word.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 8. A chapter of "My life"

The scene: The "My life" journal of Sophia Pittman, chapter "Westerly, Rhode Island".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated October 1, 2027

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Sophia Pittman: I lost my job. We got through it.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 9. A conversation turn

The scene: Aaliyah Peck talks with Addison Peck, day 1, turn 2.

How it was made: The replies are the four the engine offers this turn, ranked by Aaliyah Peck's traits (conversation.reply-reach: leans toward carrying the talk on, 0.53). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Aaliyah Peck: No, I haven't.
2. Addison Peck: I see.
3. Addison Peck: How is your uncle?

| #   | Reply                 | Lie | Good here? |
| --- | --------------------- | --- | ---------- |
| 1   | He's fine.            |     |            |
| 2   | Thank you for asking. |     |            |
| 3   | All right.            |     |            |
| 4   | Okay.                 |     |            |
|     | (Say nothing)         |     |            |

### 10. A meeting

The scene: Blair Graves speaks in the public comment period of a Westerly council meeting.

How it was made: composeAddress (src/presentation/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Blair Graves: **Good evening, everyone.**
2. Blair Graves: My name is Blair Graves, and I live in Westerly.
3. Blair Graves: Thank you very much.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Good evening.                                  |         |

### 11. The minutes

The scene: The discussion of "Rent stabilization" at the October 27, 2026 meeting (2026-1).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. Town of Westerly council (minutes): Participants discussed "Rent stabilization".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 12. Bill text

The scene: Its short title. 2026-2 (enacted), introduced October 27, 2026 before the Town of Westerly council: it adopts "Inclusionary requirement" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. Town of Westerly council (bill text): This Act may be cited as the "Inclusionary requirement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 13. A notice

The scene: The notice of the November 7, 2028 election in Westerly, from the contests the elections module holds.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Westerly election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Westerly on November 7, 2028 for the following Officers: President, Town council member, State Senator, State Representative and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 14. A rally

The scene: Stephanie McKay speaks at a rally in Westerly as a candidate for Lieutenant Governor.

How it was made: composeAddress (src/presentation/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Stephanie McKay: Thank you all for being here.
2. Stephanie McKay: My name is Stephanie McKay.
3. Stephanie McKay: God bless America.
4. Stephanie McKay: **Thank you, and God bless you.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | God bless you, and God bless America.        |         |

### 15. An interview

The scene: A local reporter's interview of David Miles (a candidate in Westerly, 2026-10-19); asked about "Automatic voter registration"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. David Miles: That's a promise.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. A conversation turn

The scene: Aaliyah Peck talks with Lara Graves, day 2, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Aaliyah Peck's traits (conversation.reply-reach: leans toward carrying the talk on, 0.53). The lies are what the scales offer: the same moves made false about the player's own record. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Lara Graves: It's nice to see you.
2. Lara Graves: Where are you from?

| #   | Reply                             | Lie | Good here? |
| --- | --------------------------------- | --- | ---------- |
| 1   | I'm from Westerly. How about you? |     |            |
| 2   | I grew up here.                   |     |            |
| 3   | I'm from Westerly.                |     |            |
| 4   | Here in Westerly.                 |     |            |
| 5   | Not here. How about you?          | yes |            |
| 6   | I'm from Washington County.       | yes |            |
| 7   | Not here.                         | yes |            |
|     | (Say nothing)                     |     |            |

### 17. The minutes

The scene: The discussion of "Inclusionary requirement" at the October 27, 2026 meeting (2026-2).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. Town of Westerly council (minutes): The staff provided an update on "Inclusionary requirement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 18. Bill text

The scene: Its long title. 2026-2 (enacted), introduced October 27, 2026 before the Town of Westerly council: it adopts "Inclusionary requirement" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. Town of Westerly council (bill text): To provide for inclusionary requirement, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 19. An interview

The scene: A local reporter's interview of David Miles (a candidate in Westerly, 2026-10-19); asked about "Clean electricity standard"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. David Miles: I'll do it.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 20. A conversation turn

The scene: Aaliyah Peck talks with Tyler Ramsey, day 3, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Aaliyah Peck's traits (conversation.reply-reach: leans toward carrying the talk on, 0.53). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Tyler Ramsey: Hello there.
2. Tyler Ramsey: You remember Westerly Middle School?

| #   | Reply                 | Lie | Good here? |
| --- | --------------------- | --- | ---------- |
| 1   | Yeah.                 |     |            |
| 2   | That was 6 years ago. |     |            |
| 3   | I remember that.      |     |            |
| 4   | Yes, I do.            |     |            |
|     | (Say nothing)         |     |            |

### 21. A conversation turn

The scene: Aaliyah Peck talks with Dale Peck, day 5, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Aaliyah Peck's traits (conversation.reply-reach: leans toward carrying the talk on, 0.53). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Dale Peck: Hi there.
2. Dale Peck: I work at Peck Tool and Die.

| #   | Reply                         | Lie | Good here? |
| --- | ----------------------------- | --- | ---------- |
| 1   | How long have you been there? |     |            |
| 2   | That's great.                 |     |            |
| 3   | Sure.                         |     |            |
| 4   | All right.                    |     |            |
|     | (Say nothing)                 |     |            |

### 22. A conversation turn

The scene: Aaliyah Peck talks with Lara Graves, day 6, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Aaliyah Peck's traits (conversation.reply-reach: leans toward carrying the talk on, 0.53). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Lara Graves: It's good to see you.
2. Lara Graves: Have you talked to Blair?

| #   | Reply                            | Lie | Good here? |
| --- | -------------------------------- | --- | ---------- |
| 1   | Why?                             |     |            |
| 2   | I talked to Blair on October 12. |     |            |
| 3   | Nope.                            |     |            |
| 4   | All right.                       |     |            |
|     | (Say nothing)                    |     |            |
