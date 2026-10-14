# Words across the game, graded on five axes: grading batch batch-8

These 100 lines are what the game's English engine produces today for each kind of text, not quotations: a journal entry, the title of a bill, a notice, a roll call in the minutes, a hearing, a chair calling a vote, a campaign speech, an interview answer, a feeling, and a conversation. Each sentence was said in a public-domain federal record, with the names, towns, offices and bills filled from a generated world's own records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The worlds are 5 places drawn at random from all 56 (seed `batch-8`), each played 365 days from 2026-10-12: Macksburg, Iowa; Dexter, Michigan; Ellsworth, Maine; Baldwin, New York; West Laurel, Maryland.

## What is in this batch

| Kind                                                       | Lines |
| ---------------------------------------------------------- | ----- |
| Journal ("My life")                                        | 20    |
| Legislation (bill text)                                    | 12    |
| Notices                                                    | 2     |
| Minutes                                                    | 4     |
| Hearings                                                   | 4     |
| Meetings (chair, members, public comment)                  | 12    |
| Campaign speech                                            | 8     |
| Interview answers                                          | 8     |
| Emotional register                                         | 18    |
| Conversation (true replies and the scales' false versions) | 12    |

Every line shows its scenario, the line before it and the speaker. The scenario is what the played world held when the line was made (a filed bill and its roll call, a candidate's filing, an interview the press engine ran, a journal entry the director recorded). Where the world held no record for a scenario, nothing was made up; it is listed under "OWNER DECISIONS NEEDED".

## What the repetition guard did

Before this page was written, every kind was checked for repetition (owner, Oct 14: batch 7 was "still super repetitive"). Each kind is measured on the share of distinct openers (first two words), distinct sentence shapes (names, titles, numbers and dates masked) and distinct main verbs; a kind under its threshold, or any line whose event is a school, a workplace, an institution or a filing office, or a bill title worded as a bare command, fails. The thresholds are estimated from real samples of the same size (`src/director/data/director.json`, `dialogueGuard*` rows). The worlds were played 365 days each.

| Kind                                                       | Lines | Openers (threshold) | Shapes (threshold) | Verbs (threshold) | Candidates | Looked at before it passed |
| ---------------------------------------------------------- | ----- | ------------------- | ------------------ | ----------------- | ---------- | -------------------------- |
| Journal ("My life")                                        | 20    | 0.65 (0.48)         | 0.95 (0.59)        | 0.40 (0.37)       | 29         | 20                         |
| Legislation (bill text)                                    | 12    | 0.58 (0.33)         | 0.50 (0.37)        | 0.42 (0.31)       | 24         | 12                         |
| Notices                                                    | 2     | 0.50 (0.49)         | 1.00 (0.59)        | 0.50 (0.49)       | 12         | 2                          |
| Minutes                                                    | 4     | 1.00 (0.8)          | 1.00 (0.82)        | 0.75 (0.64)       | 24         | 4                          |
| Hearings                                                   | 4     | 1.00 (0.6)          | 1.00 (0.86)        | 1.00 (0.47)       | 38         | 14                         |
| Meetings (chair, members, public comment)                  | 12    | 0.75 (0.09)         | 1.00 (0.91)        | 0.83 (0.52)       | 144        | 41                         |
| Campaign speech                                            | 8     | 1.00 (0.45)         | 1.00 (0.73)        | 1.00 (0.35)       | 103        | 17                         |
| Interview answers                                          | 8     | 0.63 (0.37)         | 0.63 (0.38)        | 0.38 (0.34)       | 30         | 8                          |
| Emotional register                                         | 18    | 0.72 (0.38)         | 1.00 (0.6)         | 0.61 (0.24)       | 44         | 23                         |
| Conversation (true replies and the scales' false versions) | 12    | 1.00 (0.71)         | 1.00 (0.71)        | 1.00 (0.21)       | 439        | 46                         |

Rejected: 87 candidates.

| Rule              | Rejected | By kind                                                      |
| ----------------- | -------- | ------------------------------------------------------------ |
| repeated-opener   | 48       | hearing 7, meeting 26, campaign 8, emotion 2, conversation 5 |
| repeated-verb     | 36       | hearing 3, meeting 3, campaign 1, conversation 29            |
| institution-event | 3        | emotion 3                                                    |

- repeated-opener (hearing): Thank you.
- repeated-opener (hearing): Thank you very much.
- repeated-opener (hearing): Thank you all.
- repeated-verb (hearing): Well, thank you.
- repeated-verb (hearing): Good morning.
- repeated-verb (hearing): Very good.
- institution-event (emotion): Mr. Speaker, I rise to recognize Warren Chambers. Warren Chambers graduated from Woodland Elementary School. Please join
- institution-event (emotion): Mr. Speaker, I rise to recognize Christopher Chang. Christopher Chang graduated from Chestnut Hill Elementary School. I
- institution-event (emotion): Mr. Speaker, I rise to honor Dawn Brooks. Dawn Brooks graduated from Chestnut Hill Elementary School. I congratulate Daw

## Feelings: what the banks have and lack

A line is tagged with the feeling its own words carry. These are the feelings the whole mined banks carry (parts found):

| Feeling        | In the banks |
| -------------- | ------------ |
| apology        | 6 parts      |
| sadness        | 14 parts     |
| disappointment | 3 parts      |
| resolve        | 3 parts      |
| pride          | 4 parts      |
| gratitude      | 141 parts    |
| joy            | 20 parts     |
| goodwill       | 2 parts      |
| arrogance      | none         |

## How to grade

Each line has a few numbered alternatives. Each alternative is tagged with the one axis it differs on:

- **personality fit**: whether the words suit the person saying them (an outgoing person warmer, a reserved one briefer).
- **formality**: how formal or casual the words are.
- **word choice**: the same length and shape, but different words.
- **sentence structure**: a question against a statement, or one sentence against two.
- **length**: a much longer or shorter way to say it.

For each axis that appears, grade the line itself on that axis, as the owner hears it:

- **GOOD**: the line is right on this axis; keep it.
- **BAD**: the line is wrong on this axis; never say it in that spot.
- **FIX**: close, but it needs rewording.

Then, if one of the alternatives is better than the line on that axis, write its number. If the line is better, leave it blank. Skip any axis you have no opinion on. Lines marked "a false version" are what the scales offer as a lie; grade whether they would pass as the speaker's. Grades never block a merge.

## Where the grades go

Write them to `data/english/grades/batch-8.json` in this shape. Axis names are exactly: personality fit, formality, word choice, sentence structure, length. `prefer` holds the number of the better alternative for that axis, and is left out when the line is better.

```json
{
  "batch": "batch-8",
  "grades": [
    {
      "i": 0,
      "axes": { "formality": "GOOD", "length": "BAD" },
      "prefer": { "length": 2 },
      "note": "optional"
    }
  ]
}
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger (`data/english/part-grades.json`).

## Facts that were stood in

- Macksburg: 7 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (29 local bills, 8405 recorded votes); interviews are the press module's
- Dexter: 0 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (16 local bills, 10844 recorded votes); interviews are the press module's
- Ellsworth: 0 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (19 local bills, 8879 recorded votes); interviews are the press module's
- Baldwin: 0 decided races, office levels federal/state/township/county; bills and roll calls are the legislature module's own rows (10 local bills, 8290 recorded votes); interviews are the press module's
- West Laurel: 0 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (5 local bills, 7804 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

Each of these is a kind of line or a scenario the simulation cannot produce yet. None was invented for this batch.

- no race was decided by the end of the run, so victory and concession lines (which need a recorded winner and loser) cannot be produced
- Arrogance, anger and fear have no words in any bank: no part carries a boast, a threat or an alarm, and the composer's `mood` input has no bank that reads it. Owner's intent: temporary emotions are separate from core traits, and cocky and brazen are named traits (docs/coordination/DECISION-REGISTER.md, the personality-vocabulary entry); the wording is the owner's call.
- Local ordinance wording: the only local parts ('An Ordinance concerning', 'Be it ordained by the') come from one Baltimore bill and are marked not shippable, so a town council's measure is worded with the federal bank's short title ('This Act may be cited as') and repeal clause. Owner decision needed on whether a local body's measure uses its own form.
- Bill text is only a bill's title, short title, long title and repeal clause: no composer turns a provision (a policy question and a direction, or a budget line and an amount) into an operative section, and the local ordinance section part needs words nobody writes. Owner decision needed on how a section's operative words are produced without hand-written text.
- Interviews: a recorded answer that opposes a policy has no wording (the bank only commits or deflects), and the 'record' move needs the candidate's recorded vote on the same question, which the press and record modules do not join.
- Minutes: only roll-call lines and a discussion line; 'the next meeting would be held on' needs a recorded next meeting date and 'dissented because' needs a recorded reason, which the legislature module does not keep.
- Meeting agendas and the speech of a real council meeting come only from bills of the town's bodies; a posted agenda record (items in order, with times) is not in the world yet.
- Bill titles in the real form: a bill's title should read 'A bill to ...' (a verb phrase after 'To'), but the bill catalog names each policy as a bare phrase, some a noun ('Paid family leave') and some a command ('Shift highway funds to transit'). Until each policy carries its own purpose phrase, notices, minutes, interviews and the repeal clause carry the title as a name in quotation marks, the short title carries it as before, and the long title ('To provide for ...') is made only for noun titles. Owner decision needed: who writes a purpose phrase per policy, or whether a quoted name is the form.
- Workplaces and schools are settings, never entries: the guard fails any line whose event is a school, a workplace, a filing office or an institution. Business names (for example 'Farmer's General Store') are another engine's work and are not fixed here.

## The lines

## Journal ("My life") (20 lines)

### 0. Macksburg, Iowa

Scenario: The "My life" journal of Jordan Peters, chapter "COUNTY OF MADISON treasury", entry dated August 1, 2027.

The line before: (this opens it)

The line: **Jordan Peters: I lost my job. It was a terrible time.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I lost my job. It was really tough.     |                             |        |
| 2   | word choice | I lost my job. It was a difficult time. |                             |        |

### 1. Dexter, Michigan

Scenario: The "My life" journal of Francis Weiss, chapter "My daughter", entry dated June 16, 1986.

The line before: Journal: My son was born.

The line: **Francis Weiss: My daughter was born.**

| #   | Axis        | Another way to say it           | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------- | --------------------------- | ------ |
| 1   | word choice | My daughter was born years old. |                             |        |

### 2. Ellsworth, Maine

Scenario: The "My life" journal of Douglas Stephens, chapter "Chestnut Hill Elementary School", entry dated August 24, 1981.

The line before: (this opens it)

The line: **Douglas Stephens: Except for Dawn Chang. I knew Dawn Chang from Chestnut Hill Elementary School. Dawn Chang became a council member.**

| #   | Axis        | Another way to say it                                                                          | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | Except for Dawn Chang. Dawn Chang and I were good friends. Dawn Chang became a council member. |                             |        |
| 2   | length      | Except for Dawn Chang. I worked with Dawn Chang. Dawn Chang became a council member.           |                             |        |

### 3. West Laurel, Maryland

Scenario: The "My life" journal of Noor Haynes, chapter "Gladys Noon Spellman Elementary", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Noor Haynes: My mother got elected. I didn't know what that meant.**

| #   | Axis        | Another way to say it                                  | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------------ | --------------------------- | ------ |
| 1   | formality   | My mother got elected. Little did I know.              |                             |        |
| 2   | word choice | My mother got elected. I didn't know that at the time. |                             |        |
| 3   | length      | My mother got elected. I never knew.                   |                             |        |

### 4. Macksburg, Iowa

Scenario: The "My life" journal of Tyler McLean, chapter "Brookview Elementary School", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Tyler McLean: Maya won.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | Maya lost.            |                             |        |

### 5. West Laurel, Maryland

Scenario: The "My life" journal of Rachel Wilson, chapter "Gladys Noon Spellman Elementary", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Rachel Wilson: My father was elected. I didn't realize it at the time.**

| #   | Axis        | Another way to say it                             | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My father was elected. That was a turning point.  |                             |        |
| 2   | word choice | My father was elected. I didn't know at the time. |                             |        |
| 3   | length      | My father was elected. I never knew.              |                             |        |

### 6. Macksburg, Iowa

Scenario: The "My life" journal of Maya McLean, chapter "CITY OF MACKSBURG treasury", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Maya McLean: It wasn't close.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | It was close.         |                             |        |

### 7. West Laurel, Maryland

Scenario: The "My life" journal of Paige Villanueva, chapter "Maryland", entry dated November 1, 2026.

The line before: (this opens it)

The line: **Paige Villanueva: I moved to Maryland.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | I came to Maryland.   |                             |        |

### 8. Baldwin, New York

Scenario: The "My life" journal of Scott Guerrero, chapter "My son", entry dated May 8, 1996.

The line before: Journal: My son was born.

The line: **Scott Guerrero: My daughter was born. That's where it began.**

| #   | Axis        | Another way to say it                               | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My daughter was born. I had no clue.                |                             |        |
| 2   | word choice | My daughter was born. That's how it started.        |                             |        |
| 3   | length      | My daughter was born. I didn't know it at the time. |                             |        |

### 9. Ellsworth, Maine

Scenario: The "My life" journal of Ruby Stephens, chapter "Chestnut Hill Elementary School", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Ruby Stephens: My mother lost.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | My mother won.        |                             |        |

### 10. Baldwin, New York

Scenario: The "My life" journal of Liam Choi, chapter "Steele Elementary School", entry dated November 3, 2026.

The line before: Journal: My father was elected. I didn't know what that meant.

The line: **Liam Choi: Nicole won. I didn't know that at the time.**

| #   | Axis        | Another way to say it                        | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Nicole won. That was a turning point.        |                             |        |
| 2   | word choice | Nicole won. I didn't realize it at the time. |                             |        |
| 3   | length      | Nicole won. Little did I know.               |                             |        |

### 11. Baldwin, New York

Scenario: The "My life" journal of Scott Guerrero, chapter "My son", entry dated October 14, 2009.

The line before: Journal: My daughter was born.

The line: **Scott Guerrero: My daughter was born. I didn't know at the time.**

| #   | Axis        | Another way to say it                                  | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------------ | --------------------------- | ------ |
| 1   | formality   | My daughter was born. Little did I know.               |                             |        |
| 2   | word choice | My daughter was born. I didn't realize it at the time. |                             |        |
| 3   | length      | My daughter was born. I never knew.                    |                             |        |

### 12. West Laurel, Maryland

Scenario: The "My life" journal of Gabriella Francis, chapter "Gladys Noon Spellman Elementary", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Gabriella Francis: Emma lost. I'll never forget that.**

| #   | Axis        | Another way to say it                      | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------ | --------------------------- | ------ |
| 1   | formality   | Emma lost. I never knew.                   |                             |        |
| 2   | word choice | Emma lost. I'll never forget it.           |                             |        |
| 3   | length      | Emma lost. I didn't know that at the time. |                             |        |

### 13. West Laurel, Maryland

Scenario: The "My life" journal of Cora Haynes, chapter "Gladys Noon Spellman Elementary", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Cora Haynes: My mother won. That was a turning point.**

| #   | Axis        | Another way to say it                  | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My mother won. I'll never forget that. |                             |        |
| 2   | word choice | My mother won. That was the beginning. |                             |        |

### 14. Baldwin, New York

Scenario: The "My life" journal of Stephen Guerrero, chapter "Plaza Elementary School", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Stephen Guerrero: My father got elected.**

| #   | Axis        | Another way to say it  | Grade the line on this axis | Better |
| --- | ----------- | ---------------------- | --------------------------- | ------ |
| 1   | word choice | My father was elected. |                             |        |

### 15. Dexter, Michigan

Scenario: The "My life" journal of Francis Weiss, chapter "My daughter", entry dated November 12, 1977.

The line before: Journal: My daughter was born.

The line: **Francis Weiss: My daughter was born.**

| #   | Axis        | Another way to say it           | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------- | --------------------------- | ------ |
| 1   | word choice | My daughter was born years old. |                             |        |

### 16. West Laurel, Maryland

Scenario: The "My life" journal of Jasper Haynes, chapter "Gladys Noon Spellman Elementary", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Jasper Haynes: Crystal won. I didn't know what that meant.**

| #   | Axis        | Another way to say it                        | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Crystal won. Little did I know.              |                             |        |
| 2   | word choice | Crystal won. I didn't know that at the time. |                             |        |
| 3   | length      | Crystal won. I never knew.                   |                             |        |

### 17. West Laurel, Maryland

Scenario: The "My life" journal of Zane Tillman, chapter "Gladys Noon Spellman Elementary", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Zane Tillman: Jennifer lost. I didn't know at the time.**

| #   | Axis        | Another way to say it                           | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Jennifer lost. Little did I know.               |                             |        |
| 2   | word choice | Jennifer lost. I didn't realize it at the time. |                             |        |
| 3   | length      | Jennifer lost. I never knew.                    |                             |        |

### 18. Baldwin, New York

Scenario: The "My life" journal of Ivy Guerrero, chapter "Meadow Elementary School", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Ivy Guerrero: Scott lost.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | Scott won.            |                             |        |

### 19. Baldwin, New York

Scenario: The "My life" journal of Devon Vinson, chapter "Meadow Elementary School", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Devon Vinson: My mother won.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | My mother lost.       |                             |        |

## Legislation (bill text) (12 lines)

### 20. Macksburg, Iowa

Scenario: The opening of 2026-001 (enacted), filed in the House on December 15, 2026.

The line before: (this opens it)

The line: **United States Congress (bill text): Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,**

| #   | Axis   | Another way to say it                                             | Grade the line on this axis | Better |
| --- | ------ | ----------------------------------------------------------------- | --------------------------- | ------ |
| 1   | length | Resolved by the House of Representatives (the Senate concurring), |                             |        |

### 21. Dexter, Michigan

Scenario: Its long title. 2026-002 (enacted), introduced October 27, 2026 before the County of Washtenaw commissioner: it adopts "Civilian oversight of police" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Washtenaw commissioner (bill text): To provide for civilian oversight of police, and for other purposes.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 22. Ellsworth, Maine

Scenario: Its short title. 2026-004 (vetoed), introduced October 27, 2026 before the City of Ellsworth council: it adopts "Rent stabilization" on the bill's own provision record.

The line before: (this opens it)

The line: **City of Ellsworth council (bill text): This Act may be cited as the "Rent stabilization".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 23. Baldwin, New York

Scenario: Its repeal clause. 2026-006 (failed), introduced November 11, 2026 before the County of Nassau commissioner: it repeals "Inclusionary requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Nassau commissioner (bill text): "Inclusionary requirement" is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 24. Macksburg, Iowa

Scenario: Its short title. 2026-011 (failed), introduced November 11, 2026 before the City of Macksburg council: it adopts "Paid family leave" on the bill's own provision record.

The line before: (this opens it)

The line: **City of Macksburg council (bill text): This title may be cited as the "Paid family leave".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 25. Dexter, Michigan

Scenario: Its short title. 2026-008 (failed), introduced October 27, 2026 before the County of Washtenaw commissioner: it adopts "Partner with federal immigration enforcement" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Washtenaw commissioner (bill text): This Act may be cited as the "Partner with federal immigration enforcement".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 26. Ellsworth, Maine

Scenario: Its short title. 2026-001 (failed), introduced October 27, 2026 before the County of Hancock Commissioner: it adopts "Rent stabilization" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Hancock Commissioner (bill text): This title may be cited as the "Rent stabilization".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 27. Ellsworth, Maine

Scenario: Its repeal clause. 2027-005 (failed), introduced June 24, 2027 before the City of Ellsworth council: it repeals "Limit groundwater withdrawal" on the bill's own provision record.

The line before: (this opens it)

The line: **City of Ellsworth council (bill text): "Limit groundwater withdrawal" is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 28. Macksburg, Iowa

Scenario: Its long title. 2026-007 (failed), introduced October 27, 2026 before the City of Macksburg council: it adopts "Paid family leave" on the bill's own provision record.

The line before: (this opens it)

The line: **City of Macksburg council (bill text): To provide for paid family leave, and for other purposes.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 29. Macksburg, Iowa

Scenario: Its short title. 2026-003 (failed), introduced October 27, 2026 before the City of Macksburg council: it adopts "Inclusionary requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **City of Macksburg council (bill text): This Act may be cited as the "Inclusionary requirement".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 30. Macksburg, Iowa

Scenario: Its repeal clause. 2026-014 (failed), introduced November 11, 2026 before the City of Macksburg council: it repeals "Right to counsel in eviction" on the bill's own provision record.

The line before: (this opens it)

The line: **City of Macksburg council (bill text): "Right to counsel in eviction" is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 31. Dexter, Michigan

Scenario: Its short title. 2026-003 (enacted), introduced October 27, 2026 before the County of Washtenaw commissioner: it adopts "Inclusionary requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Washtenaw commissioner (bill text): This title may be cited as the "Inclusionary requirement".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Notices (2 lines)

### 32. Macksburg, Iowa

Scenario: A hearing notice for 2027-001, posted by the City of Macksburg council.

The line before: (this opens it)

The line: **City of Macksburg council clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Inclusionary requirement" / DATE OF MEETING: May 10, 2027**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 33. Dexter, Michigan

Scenario: The notice of the November 5, 2030 election in Dexter, from the contests the elections module holds.

The line before: (this opens it)

The line: **Dexter election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Dexter on November 5, 2030 for the following Officers: U.S. Senator, Governor, Lieutenant Governor, Attorney General, Secretary of State and State Senator.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Minutes (4 lines)

### 34. Macksburg, Iowa

Scenario: The discussion of "Paid family leave" at the October 27, 2026 meeting (2026-007).

The line before: (this opens it)

The line: **City of Macksburg council (minutes): The staff provided an update on "Paid family leave".**

| #   | Axis        | Another way to say it                           | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | The manager then turned to "Paid family leave". |                             |        |
| 2   | length      | Participants discussed "Paid family leave".     |                             |        |

### 35. West Laurel, Maryland

Scenario: The roll call on 2026-003 ("Allow multifamily in single family zones") before the County of Prince Georges commissioner: 5 for, 2 against; the bill enacted. Each name is read from a member's recorded vote.

The line before: (this opens it)

The line: **County of Prince Georges commissioner (minutes): Voting for this action: Rowan Wilson, Emma Francis, Jennifer Tillman, Crystal Haynes and Joseph Blanchard.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 36. Ellsworth, Maine

Scenario: The discussion of "Rent stabilization" at the October 27, 2026 meeting (2026-001).

The line before: (this opens it)

The line: **County of Hancock Commissioner (minutes): Participants discussed "Rent stabilization".**

| #   | Axis   | Another way to say it                            | Grade the line on this axis | Better |
| --- | ------ | ------------------------------------------------ | --------------------------- | ------ |
| 1   | length | The manager then turned to "Rent stabilization". |                             |        |

### 37. Baldwin, New York

Scenario: The roll call on 2026-003 ("Allow multifamily in single family zones") before the County of Nassau commissioner: 6 for, 1 against; the bill enacted. Each name is read from a member's recorded vote.

The line before: (this opens it)

The line: **County of Nassau commissioner (minutes): Voting against this action: Daniel McKinney.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Hearings (4 lines)

### 38. Macksburg, Iowa

Scenario: A hearing on 2026-005 ("Right to counsel in eviction") before the City of Macksburg council; the witness is Madison McLean, a resident.

The line before: (this opens it)

The line (feeling: gratitude): **Madison McLean (witness): Thank you, sir.**

| #   | Axis               | Another way to say it    | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------ | --------------------------- | ------ |
| 1   | formality          | Thank you.               |                             |        |
| 2   | word choice        | Thank you, Madam Chair.  |                             |        |
| 3   | sentence structure | Thank you, Mr. Chairman. |                             |        |

### 39. Macksburg, Iowa

Scenario: A hearing on 2026-008 ("Ban discrimination in housing and work") before the City of Macksburg council; the witness is Susan McLean, a resident.

The line before: (this opens it)

The line: **Susan McLean (witness): Appreciate that.**

| #   | Axis        | Another way to say it        | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------- | --------------------------- | ------ |
| 1   | formality   | That is great.               |                             |        |
| 2   | word choice | I appreciate that.           |                             |        |
| 3   | length      | I appreciate that very much. |                             |        |

### 40. Ellsworth, Maine

Scenario: A hearing on 2026-001 ("Limit groundwater withdrawal") before the City of Ellsworth council; the witness is Melissa Whitfield, a resident.

The line before: (this opens it)

The line: **Melissa Whitfield (witness): That is great.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | That would be great.  |                             |        |
| 2   | word choice | I agree.              |                             |        |

### 41. Dexter, Michigan

Scenario: A hearing on 2026-002 ("Civilian oversight of police") before the County of Washtenaw commissioner; the witness is Thomas Weiss, a resident.

The line before: (this opens it)

The line: **Thomas Weiss (witness): I know.**

| #   | Axis        | Another way to say it        | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------- | --------------------------- | ------ |
| 1   | formality   | I appreciate it.             |                             |        |
| 2   | word choice | I agree.                     |                             |        |
| 3   | length      | I appreciate that very much. |                             |        |

## Meetings (chair, members, public comment) (12 lines)

### 42. Macksburg, Iowa

Scenario: A member of the City of Macksburg council speaks to the chair during 2026-007 ("Paid family leave").

The line before: (this opens it)

The line: **Morgan Ruiz (member): Chair Ruiz, I know of no further debate.**

| #   | Axis               | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Chair Ruiz, I could not make today's vote.                 |                             |        |
| 2   | word choice        | Chair Ruiz, I missed a series of votes.                    |                             |        |
| 3   | sentence structure | Chair Ruiz, may I ask for a clarification?                 |                             |        |
| 4   | length             | Chair Ruiz, I know of no further debate on the nomination. |                             |        |

### 43. Dexter, Michigan

Scenario: Sara Weiss speaks in the public comment period of a Dexter council meeting.

The line before: Sara Weiss: We need your help.

The line (feeling: gratitude): **Sara Weiss: Thank you.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.                |                             |        |
| 2   | word choice | Thank you for listening.          |                             |        |
| 3   | length      | Thank you for your consideration. |                             |        |

### 44. Baldwin, New York

Scenario: A member of the County of Nassau commissioner speaks to the chair during 2026-006 ("Inclusionary requirement").

The line before: (this opens it)

The line: **Nicole Choi (member): Madam Chair, I demand a recorded vote.**

| #   | Axis               | Another way to say it                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.         |                             |        |
| 2   | word choice        | Madam Chair, I missed a vote today.                 |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?         |                             |        |
| 4   | length             | Madam Chair, I ask unanimous consent to use a prop. |                             |        |

### 45. West Laurel, Maryland

Scenario: A member of the County of Prince Georges commissioner speaks to the chair during 2026-002 ("Rent stabilization").

The line before: (this opens it)

The line: **Rowan Wilson (member): Mr. Chair, I withdraw my motion to proceed.**

| #   | Axis               | Another way to say it                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Mr. Chair, I could not make today's vote.           |                             |        |
| 2   | word choice        | Mr. Chair, I move to proceed to executive session.  |                             |        |
| 3   | sentence structure | Mr. Chair, may I ask for a clarification?           |                             |        |
| 4   | length             | Mr. Chair, I have a motion to recommit at the desk. |                             |        |

### 46. Macksburg, Iowa

Scenario: The City of Macksburg council takes up 2026-003 ("Inclusionary requirement"); the recorded result is failed.

The line before: Chair: All in favor?

The line: **Morgan Ruiz (chair): The noes have it.**

| #   | Axis               | Another way to say it                  | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'll second.                           |                             |        |
| 2   | word choice        | The ayes have it.                      |                             |        |
| 3   | sentence structure | All in favor?                          |                             |        |
| 4   | length             | Please state your name for the record. |                             |        |

### 47. Macksburg, Iowa

Scenario: The City of Macksburg council takes up 2026-001 ("Partner with federal immigration enforcement"); the recorded result is enacted.

The line before: Chair: All in favor?

The line: **Morgan Ruiz (chair): The motion carries.**

| #   | Axis               | Another way to say it         | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------- | --------------------------- | ------ |
| 1   | formality          | I'll second.                  |                             |        |
| 2   | word choice        | The motion passes.            |                             |        |
| 3   | sentence structure | Is there a motion?            |                             |        |
| 4   | length             | The clerk will call the roll. |                             |        |

### 48. West Laurel, Maryland

Scenario: Brian Palmer speaks in the public comment period of a West Laurel council meeting.

The line before: Brian Palmer: Thank you for having me.

The line: **Brian Palmer: My name is Brian Palmer, and I live in West Laurel.**

| #   | Axis   | Another way to say it  | Grade the line on this axis | Better |
| --- | ------ | ---------------------- | --------------------------- | ------ |
| 1   | length | I live in West Laurel. |                             |        |

### 49. West Laurel, Maryland

Scenario: Crystal Haynes speaks in the public comment period of a West Laurel council meeting.

The line before: Crystal Haynes: My name is Crystal Haynes.

The line: **Crystal Haynes: We need your help.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 50. Macksburg, Iowa

Scenario: The City of Macksburg council takes up 2026-001 ("Partner with federal immigration enforcement"); the recorded result is enacted.

The line before: (this opens it)

The line: **Morgan Ruiz (chair): The meeting will come to order.**

| #   | Axis               | Another way to say it                  | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Please state your name for the record. |                             |        |
| 2   | word choice        | The committee will come to order.      |                             |        |
| 3   | sentence structure | Is there a motion?                     |                             |        |
| 4   | length             | The motion carries.                    |                             |        |

### 51. Ellsworth, Maine

Scenario: Douglas Stephens speaks in the public comment period of a Ellsworth council meeting.

The line before: Douglas Stephens: We need your help.

The line (feeling: gratitude): **Douglas Stephens: Thank you for your consideration.**

| #   | Axis        | Another way to say it       | Grade the line on this axis | Better |
| --- | ----------- | --------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.          |                             |        |
| 2   | word choice | Thank you for your service. |                             |        |
| 3   | length      | Thank you.                  |                             |        |

### 52. Dexter, Michigan

Scenario: A member of the County of Washtenaw commissioner speaks to the chair during 2026-006 ("Allow multifamily in single family zones").

The line before: (this opens it)

The line: **Dawn McLaughlin (member): Madam Chair, I move to proceed to executive session.**

| #   | Axis               | Another way to say it                         | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.   |                             |        |
| 2   | word choice        | Madam Chair, I withdraw my motion to proceed. |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?   |                             |        |
| 4   | length             | Madam Chair, I was unavoidably detained.      |                             |        |

### 53. Ellsworth, Maine

Scenario: Kevin Stephens speaks in the public comment period of a Ellsworth council meeting.

The line before: Kevin Stephens: We need your help.

The line (feeling: gratitude): **Kevin Stephens: Thank you for your time.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.                |                             |        |
| 2   | word choice | Thank you for your consideration. |                             |        |
| 3   | length      | Thank you.                        |                             |        |

## Campaign speech (8 lines)

### 54. Macksburg, Iowa

Scenario: Tracey Caldwell speaks at a rally in Macksburg as a candidate for undefined.

The line before: Tracey Caldwell: Tell your friends.

The line (feeling: gratitude): **Tracey Caldwell: Thank you, and God bless you.**

| #   | Axis        | Another way to say it                 | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------- | --------------------------- | ------ |
| 1   | formality   | God bless you, and God bless America. |                             |        |
| 2   | word choice | Thank you so much.                    |                             |        |
| 3   | length      | Thank you.                            |                             |        |

### 55. Dexter, Michigan

Scenario: Heather Carey speaks at a rally in Dexter as a candidate for undefined.

The line before: (this opens it)

The line: **Heather Carey: It's great to be back in Dexter.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for coming. |                             |        |
| 2   | word choice | It's great to be here.    |                             |        |
| 3   | length      | Thank you so much.        |                             |        |

### 56. Ellsworth, Maine

Scenario: Sherry Davis speaks at a rally in Ellsworth as a candidate for undefined.

The line before: Sherry Davis: It's great to be here.

The line: **Sherry Davis: I was born and raised in Ellsworth.**

| #   | Axis        | Another way to say it       | Grade the line on this axis | Better |
| --- | ----------- | --------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm a small business owner. |                             |        |
| 2   | word choice | I grew up in Ellsworth.     |                             |        |
| 3   | length      | I'm a farmer.               |                             |        |

### 57. West Laurel, Maryland

Scenario: Robert Moon speaks at a rally in West Laurel as a candidate for undefined.

The line before: Robert Moon: Thank you.

The line: **Robert Moon: I grew up in West Laurel.**

| #   | Axis        | Another way to say it                 | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm a small business owner.           |                             |        |
| 2   | word choice | I was born and raised in West Laurel. |                             |        |
| 3   | length      | I'm a farmer.                         |                             |        |

### 58. Baldwin, New York

Scenario: Janice Lowe speaks at a rally in Baldwin as a candidate for undefined.

The line before: Janice Lowe: Tell your friends.

The line: **Janice Lowe: God bless you, and God bless America.**

| #   | Axis      | Another way to say it     | Grade the line on this axis | Better |
| --- | --------- | ------------------------- | --------------------------- | ------ |
| 1   | formality | Thank you, and God bless. |                             |        |
| 2   | length    | Thank you.                |                             |        |

### 59. Baldwin, New York

Scenario: Sydney Wilkerson speaks at a rally in Baldwin as a candidate for undefined.

The line before: Sydney Wilkerson: I grew up in Baldwin.

The line: **Sydney Wilkerson: Get out and vote.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | Let's get to work.    |                             |        |
| 2   | word choice | Go vote.              |                             |        |

### 60. Macksburg, Iowa

Scenario: Donald McLeod speaks at a rally in Macksburg as a candidate for undefined.

The line before: (this opens it)

The line: **Donald McLeod: It's good to be home.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for coming. |                             |        |
| 2   | word choice | It's great to be home.    |                             |        |
| 3   | length      | Thank you.                |                             |        |

### 61. Baldwin, New York

Scenario: Camila Wells speaks at a rally in Baldwin as a candidate for undefined.

The line before: Camila Wells: I grew up in Baldwin.

The line: **Camila Wells: Tell your friends.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | Let's get to work.    |                             |        |
| 2   | word choice | I need your help.     |                             |        |

## Interview answers (8 lines)

### 62. Macksburg, Iowa

Scenario: A local reporter's interview of Erin Sargent (a candidate in Macksburg, 2026-10-19); asked about "Stand your ground"; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about "Stand your ground"?

The line: **Erin Sargent: You have my word.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | I will.               |                             |        |

### 63. Dexter, Michigan

Scenario: A local reporter's interview of Veronica Miles (a candidate in Dexter, 2026-10-19); asked about "Price carbon"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Price carbon"?

The line: **Veronica Miles: I'm committed to "Price carbon".**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | You have my word.     |                             |        |
| 2   | word choice | I'll do it.           |                             |        |
| 3   | length      | I will.               |                             |        |

### 64. Macksburg, Iowa

Scenario: A local reporter's interview of Robert Alexander (a candidate in Macksburg, 2026-10-19); asked about "Stand your ground"; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about "Stand your ground"?

The line: **Robert Alexander: That's a promise.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | I'll do it.           |                             |        |

### 65. West Laurel, Maryland

Scenario: A local reporter's interview of Lori Blanchard (a candidate in West Laurel, 2026-10-19); asked about "Permit to carry concealed"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Permit to carry concealed"?

The line: **Lori Blanchard: I will.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | You have my word.     |                             |        |

### 66. Dexter, Michigan

Scenario: A local reporter's interview of Veronica Miles (a candidate in Dexter, 2026-10-19); asked about "End cash bail"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "End cash bail"?

The line: **Veronica Miles: I'll do it.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | That's a promise.     |                             |        |

### 67. Ellsworth, Maine

Scenario: A local reporter's interview of Richard Montgomery (a candidate in Ellsworth, 2026-10-19); asked about "Restrict abortion"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Restrict abortion"?

The line: **Richard Montgomery: I'm committed to "Restrict abortion".**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | You have my word.     |                             |        |
| 2   | word choice | I'll do it.           |                             |        |
| 3   | length      | I will.               |                             |        |

### 68. Ellsworth, Maine

Scenario: A local reporter's interview of Reese Riddle (a candidate in Ellsworth, 2026-10-19); asked about "Require photo id to vote"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Require photo id to vote"?

The line: **Reese Riddle: You have my word.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | I will.               |                             |        |

### 69. Ellsworth, Maine

Scenario: A local reporter's interview of Robin Melton (a candidate in Ellsworth, 2026-10-26); asked about "Public sector collective bargaining"; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about "Public sector collective bargaining"?

The line: **Robin Melton: I will.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | You have my word.     |                             |        |

## Emotional register (18 lines)

### 70. Macksburg, Iowa

Scenario: Charles Greer lost the race for undefined to Donald McLeod (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: disappointment): **Charles Greer: We didn't win.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | We will be back.      |                             |        |

### 71. Macksburg, Iowa

Scenario: Doris Montgomery lost the race for undefined to Robert Alexander (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: goodwill): **Doris Montgomery: I wish Robert Alexander well.**

| #   | Axis        | Another way to say it            | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.        |                             |        |
| 2   | word choice | I congratulate Robert Alexander. |                             |        |

### 72. Macksburg, Iowa

Scenario: Julia Bennett lost the race for undefined to Kathryn Barton (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: gratitude): **Julia Bennett: Thank you for everything.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | The fight goes on.    |                             |        |

### 73. Macksburg, Iowa

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: joy): **Lance Summers: Mr. Speaker, I rise to recognize Morgan Ruiz. Morgan Ruiz was born in Macksburg. I congratulate Morgan Ruiz. I yield back the balance of my time.**

| #   | Axis               | Another way to say it                                                                                                                                            | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Mr. Speaker, I rise to recognize Morgan Ruiz. Morgan Ruiz was born in Macksburg. I congratulate Morgan Ruiz. Madam Speaker, I yield back the balance of my time. |                             |        |
| 2   | word choice        | Mr. Speaker, I rise to recognize Morgan Ruiz. Morgan Ruiz was born in Macksburg. I congratulate Morgan Ruiz. I reserve the balance of my time.                   |                             |        |
| 3   | sentence structure | Mr. Speaker, I rise to recognize Morgan Ruiz. Morgan Ruiz was born in Macksburg. I congratulate Morgan Ruiz. Mr. Speaker, I yield back the balance of my time.   |                             |        |
| 4   | length             | Mr. Speaker, I rise to recognize Morgan Ruiz. Morgan Ruiz was born in Macksburg. I congratulate Morgan Ruiz. I yield back.                                       |                             |        |

### 74. Macksburg, Iowa

Scenario: Donald McLeod won the race for undefined against Charles Greer (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: pride): **Donald McLeod: I am honored.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm honored.          |                             |        |
| 2   | word choice | I am grateful.        |                             |        |

### 75. Macksburg, Iowa

Scenario: Michael Weaver lost the race for undefined to Amy Cobb (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Michael Weaver: This is not the end.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything. |                             |        |
| 2   | word choice | The fight goes on.        |                             |        |

### 76. Macksburg, Iowa

Scenario: Joyce Mercer lost the race for undefined to Laurie Jones (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Joyce Mercer: We will be back.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | We didn't win.        |                             |        |
| 2   | word choice | The fight goes on.    |                             |        |

### 77. Baldwin, New York

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: gratitude + joy): **Reese Petty: Madam Speaker, I rise today to celebrate Carrie Ford. Carrie Ford grew up in Baldwin. I thank Carrie Ford for her service. I yield back.**

| #   | Axis               | Another way to say it                                                                                                                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise to honor Carrie Ford. Carrie Ford grew up in Baldwin. I thank Carrie Ford for her service. I yield back.                   |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise today to celebrate Carrie Ford. Carrie Ford grew up in Baldwin. I thank Carrie Ford for her service. I yield back.           |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Carrie Ford. Carrie Ford grew up in Baldwin. I thank Carrie Ford for her service. I yield back. |                             |        |

### 78. Macksburg, Iowa

Scenario: Stephanie Walters lost the race for undefined to Dawn Davenport (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: joy): **Stephanie Walters: I want to congratulate Dawn Davenport.**

| #   | Axis        | Another way to say it          | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------ | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.      |                             |        |
| 2   | word choice | I congratulate Dawn Davenport. |                             |        |
| 3   | length      | We didn't win.                 |                             |        |

### 79. Dexter, Michigan

Scenario: Neil Ward honors Warren Chambers, a fellow sitting official, on the floor.

The line before: Neil Ward: Warren Chambers graduated from Woodland Elementary School.

The line (feeling: joy): **Neil Ward: Please join me in congratulating Warren Chambers.**

| #   | Axis      | Another way to say it             | Grade the line on this axis | Better |
| --- | --------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality | Warren Chambers will be missed.   |                             |        |
| 2   | length    | Congratulations, Warren Chambers. |                             |        |

### 80. West Laurel, Maryland

Scenario: Janet Mack honors Michael Weeks, a fellow sitting official, on the floor.

The line before: Janet Mack: Michael Weeks was born in West Laurel.

The line (feeling: joy): **Janet Mack: I congratulate Michael Weeks.**

| #   | Axis        | Another way to say it                           | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | Congratulations, Michael Weeks.                 |                             |        |
| 2   | length      | Please join me in congratulating Michael Weeks. |                             |        |

### 81. Ellsworth, Maine

Scenario: Dawn Brooks honors Christopher Chang, a fellow sitting official, on the floor.

The line before: Dawn Brooks: Christopher Chang graduated from Chestnut Hill Elementary School.

The line (feeling: gratitude): **Dawn Brooks: I thank Christopher Chang for his service.**

| #   | Axis        | Another way to say it                               | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Please join me in congratulating Christopher Chang. |                             |        |
| 2   | word choice | Christopher Chang will be missed.                   |                             |        |
| 3   | length      | I congratulate Christopher Chang.                   |                             |        |

### 82. Macksburg, Iowa

Scenario: Laurie Jones won the race for undefined against Joyce Mercer (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: pride): **Laurie Jones: I'm honored.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I am honored.         |                             |        |
| 2   | word choice | I'm grateful.         |                             |        |

### 83. Ellsworth, Maine

Scenario: Christopher Chang honors Jason Rodgers, a fellow sitting official, on the floor.

The line before: (this opens it)

The line (feeling: joy): **Christopher Chang: Mr. Speaker, I rise today to congratulate Jason Rodgers.**

| #   | Axis               | Another way to say it                                         | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Mr. Speaker, I rise to honor Jason Rodgers.                   |                             |        |
| 2   | sentence structure | Madam Speaker, I rise today to congratulate Jason Rodgers.    |                             |        |
| 3   | length             | Mr. Speaker, I rise today to honor the life of Jason Rodgers. |                             |        |

### 84. Macksburg, Iowa

Scenario: John Wiggins won the race for undefined against Kelly O'Connor (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: pride): **John Wiggins: I am humbled.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm grateful.         |                             |        |
| 2   | word choice | I am grateful.        |                             |        |

### 85. West Laurel, Maryland

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: gratitude): **Michael Weeks: Madam Speaker, I rise to honor Diana Stephenson. Diana Stephenson grew up in West Laurel. I thank Diana Stephenson for her service. Madam Speaker, I yield back the balance of my time.**

| #   | Axis               | Another way to say it                                                                                                                                                                                     | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise today to celebrate Diana Stephenson. Diana Stephenson grew up in West Laurel. I thank Diana Stephenson for her service. Madam Speaker, I yield back the balance of my time.         |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise to honor Diana Stephenson. Diana Stephenson grew up in West Laurel. I thank Diana Stephenson for her service. Madam Speaker, I yield back the balance of my time.                     |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Diana Stephenson. Diana Stephenson grew up in West Laurel. I thank Diana Stephenson for her service. Madam Speaker, I yield back the balance of my time. |                             |        |

### 86. Baldwin, New York

Scenario: Carrie Ford honors Bo Villegas, a fellow sitting official, on the floor.

The line before: (this opens it)

The line (feeling: joy): **Carrie Ford: Madam Speaker, I rise today to celebrate Bo Villegas.**

| #   | Axis               | Another way to say it                                         | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise to honor Bo Villegas.                   |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise today to celebrate Bo Villegas.           |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Bo Villegas. |                             |        |

### 87. Baldwin, New York

Scenario: Reese Petty honors Carrie Ford, a fellow sitting official, on the floor.

The line before: Reese Petty: Carrie Ford grew up in Baldwin.

The line (feeling: gratitude): **Reese Petty: I thank Carrie Ford for her service.**

| #   | Axis        | Another way to say it                         | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Please join me in congratulating Carrie Ford. |                             |        |
| 2   | word choice | Carrie Ford will be missed.                   |                             |        |
| 3   | length      | I congratulate Carrie Ford.                   |                             |        |

## Conversation (true replies and the scales' false versions) (12 lines)

### 88. Macksburg, Iowa

Scenario: Tyler McLean talks with Madison McLean, in Macksburg, Iowa, on day 2. A reply the player could pick.

The line before: Madison McLean: Have you talked to Maya McLean?

The line: **Tyler McLean: I talked to Maya McLean yesterday.**

| #   | Axis               | Another way to say it        | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------- | --------------------------- | ------ |
| 1   | word choice        | I saw Maya McLean yesterday. |                             |        |
| 2   | sentence structure | Have you seen Maya?          |                             |        |
| 3   | length             | I haven't.                   |                             |        |

### 89. Dexter, Michigan

Scenario: Jose Rivas talks with Ayanna Wyatt, a neighbor, in Dexter, Michigan, on day 6. A reply the player could pick.

The line before: Ayanna Wyatt: Where do you come from?

The line: **Jose Rivas: I'm from Dexter. What about you?**

| #   | Axis               | Another way to say it                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | Here in Dexter. What about you?                  |                             |        |
| 2   | sentence structure | Where are you from? What about you?              |                             |        |
| 3   | length             | I was born and raised in Dexter. What about you? |                             |        |

### 90. Ellsworth, Maine

Scenario: Caleb Stephens talks with Melissa Whitfield, in Ellsworth, Maine, on day 2. A reply the player could pick.

The line before: Melissa Whitfield: Have you heard from Mary Whitfield?

The line: **Caleb Stephens: Have you seen Mary Whitfield?**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | word choice        | How about you?        |                             |        |
| 2   | sentence structure | Not for a long time.  |                             |        |
| 3   | length             | Have you?             |                             |        |

### 91. West Laurel, Maryland

Scenario: Noor Haynes talks with Carrie Petty, a neighbor, in West Laurel, Maryland, on day 3.

The line before: Carrie Petty: Sure.

The line: **Carrie Petty: I have to go.**

| #   | Axis            | Another way to say it | Grade the line on this axis | Better |
| --- | --------------- | --------------------- | --------------------------- | ------ |
| 1   | personality fit | Have a nice day.      |                             |        |
| 2   | formality       | I've got to go.       |                             |        |
| 3   | word choice     | I have to run.        |                             |        |
| 4   | length          | Bye.                  |                             |        |

### 92. Ellsworth, Maine

Scenario: Caleb Stephens talks with Judy Ortega, a neighbor, in Ellsworth, Maine, on day 2. A reply the player could pick.

The line before: Judy Ortega: Where did you go to school?

The line: **Caleb Stephens: I graduated from Ellsworth Elementary-Middle School.**

| #   | Axis        | Another way to say it                       | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm at Ellsworth Elementary-Middle School.  |                             |        |
| 2   | word choice | I go to Ellsworth Elementary-Middle School. |                             |        |
| 3   | length      | I graduated.                                |                             |        |

### 93. Baldwin, New York

Scenario: Ivy Guerrero talks with David Donovan, in Baldwin, New York, on day 2. A reply the player could pick.

The line before: David Donovan: Remember Baldwin Middle School?

The line: **Ivy Guerrero: That was 6 years ago.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll never forget it. |                             |        |
| 2   | word choice | That was a while ago. |                             |        |
| 3   | length      | Sure.                 |                             |        |

### 94. Macksburg, Iowa

Scenario: Tyler McLean talks with Ruby Mays, a neighbor, in Macksburg, Iowa, on day 2. A reply the player could pick.

The line before: Ruby Mays: Where do you come from?

The line: **Tyler McLean: I grew up in Macksburg.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Macksburg.   |                             |        |
| 2   | word choice        | I grew up here.       |                             |        |
| 3   | sentence structure | How about you?        |                             |        |
| 4   | length             | Right here.           |                             |        |

### 95. Ellsworth, Maine

Scenario: Caleb Stephens talks with Emma Stanley, in Ellsworth, Maine, on day 4. A reply the player could pick.

The line before: Emma Stanley: Do you remember Ellsworth Elementary-Middle School?

The line: **Caleb Stephens: I remember.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Yes, I remember.          |                             |        |
| 2   | word choice | I remember that.          |                             |        |
| 3   | length      | That was a long time ago. |                             |        |

### 96. Baldwin, New York

Scenario: Ivy Guerrero talks with David Taylor, a neighbor, in Baldwin, New York, on day 5.

The line before: Ivy Guerrero: I'm from Baldwin. How about you?

The line: **David Taylor: I've got to go.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I have to go.         |                             |        |
| 2   | word choice | I've got to run.      |                             |        |
| 3   | length      | Bye.                  |                             |        |

### 97. Macksburg, Iowa

Scenario: Tyler McLean talks with Maya McLean, in Macksburg, Iowa, on day 3.

The line before: Tyler McLean: How long have you been there?

The line: **Maya McLean: Stay in touch.**

| #   | Axis            | Another way to say it | Grade the line on this axis | Better |
| --- | --------------- | --------------------- | --------------------------- | ------ |
| 1   | personality fit | Have a nice day.      |                             |        |
| 2   | formality       | I'll see you.         |                             |        |
| 3   | word choice     | Bye.                  |                             |        |

### 98. Baldwin, New York

Scenario: Ivy Guerrero talks with Kai Palmer, in Baldwin, New York, on day 5. A reply the player could pick.

The line before: Kai Palmer: Where are you from?

The line: **Ivy Guerrero: I was born in Baldwin.**

| #   | Axis               | Another way to say it             | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Baldwin.                 |                             |        |
| 2   | word choice        | I was born and raised in Baldwin. |                             |        |
| 3   | sentence structure | How about you?                    |                             |        |
| 4   | length             | Right here.                       |                             |        |

### 99. Macksburg, Iowa

Scenario: Tyler McLean talks with Evan Roy, in Macksburg, Iowa, on day 6.

The line before: Evan Roy: All right.

The line: **Evan Roy: Say hi to Madison.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | Say hello to Madison. |                             |        |
| 2   | word choice | I've got to go.       |                             |        |
| 3   | length      | Bye.                  |                             |        |
