# Words across the game, graded on five axes: grading batch batch-9

These 100 lines are what the game's English engine produces today for each kind of text, not quotations: a journal entry, the title of a bill, a notice, a roll call in the minutes, a hearing, a chair calling a vote, a campaign speech, an interview answer, a feeling, and a conversation. Each sentence was said in a public-domain federal record, with the names, towns, offices and bills filled from a generated world's own records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The worlds are 5 places drawn at random from all 56 (seed `batch-9`), each played 365 days from 2026-10-12: Junction City, Wisconsin; Vauxhall, New Jersey; San Vicente, Northern Mariana Islands; Northchase, North Carolina; Tilden, Texas.

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

Your grades were applied first: 0 candidate lines and 14 alternatives used a part you failed (a school or a job as an entry, "The bill passed.", "the manager turned to"), and 0 lines or alternatives were not whole English (such as "My daughter was born years old."); none of them is on this page.

Before this page was written, every kind was checked for repetition (owner, Oct 14: batch 7 was "still super repetitive"). Each kind is measured on the share of distinct openers (first two words), distinct sentence shapes (names, titles, numbers and dates masked) and distinct main verbs; a kind under its threshold, or any line whose event is a school, a workplace, an institution or a filing office, or a bill title worded as a bare command, fails. The thresholds are estimated from real samples of the same size (`src/director/data/director.json`, `dialogueGuard*` rows). The worlds were played 365 days each.

| Kind                                                       | Lines | Openers (threshold) | Shapes (threshold) | Verbs (threshold) | Candidates | Looked at before it passed |
| ---------------------------------------------------------- | ----- | ------------------- | ------------------ | ----------------- | ---------- | -------------------------- |
| Journal ("My life")                                        | 20    | 0.85 (0.48)         | 1.00 (0.59)        | 0.40 (0.37)       | 50         | 21                         |
| Legislation (bill text)                                    | 12    | 0.50 (0.33)         | 0.58 (0.37)        | 0.33 (0.31)       | 21         | 12                         |
| Notices                                                    | 2     | 0.50 (0.49)         | 1.00 (0.59)        | 0.50 (0.49)       | 12         | 2                          |
| Minutes                                                    | 4     | 1.00 (0.8)          | 1.00 (0.82)        | 0.75 (0.64)       | 24         | 4                          |
| Hearings                                                   | 4     | 1.00 (0.6)          | 1.00 (0.86)        | 1.00 (0.47)       | 38         | 13                         |
| Meetings (chair, members, public comment)                  | 12    | 0.67 (0.09)         | 1.00 (0.91)        | 0.67 (0.52)       | 116        | 34                         |
| Campaign speech                                            | 8     | 1.00 (0.45)         | 1.00 (0.73)        | 1.00 (0.35)       | 100        | 21                         |
| Interview answers                                          | 8     | 0.63 (0.37)         | 0.63 (0.38)        | 0.38 (0.34)       | 30         | 8                          |
| Emotional register                                         | 18    | 0.61 (0.38)         | 0.83 (0.6)         | 0.50 (0.24)       | 40         | 23                         |
| Conversation (true replies and the scales' false versions) | 12    | 1.00 (0.71)         | 1.00 (0.71)        | 1.00 (0.21)       | 436        | 89                         |

Rejected: 134 candidates.

| Rule              | Rejected | By kind                                                       |
| ----------------- | -------- | ------------------------------------------------------------- |
| repeated-opener   | 40       | journal 1, hearing 6, meeting 19, campaign 10, conversation 4 |
| repeated-verb     | 82       | hearing 3, meeting 3, campaign 3, conversation 73             |
| institution-event | 12       | emotion 12                                                    |

- repeated-opener (journal): Lara McCarthy got elected.
- repeated-opener (hearing): Thank you, Chairman.
- repeated-opener (hearing): Thank you for that answer.
- repeated-verb (hearing): Oh, thank you.
- repeated-verb (hearing): Good afternoon.
- repeated-verb (hearing): Thanks, Mr. Chairman.
- institution-event (emotion): Sam Hawkins: Gabriel Day graduated from Nicholas S. Lacorte-Peterstown School No. 3.
- institution-event (emotion): Rowan McKenzie: James McCarthy graduated from Napaaqtugmiut School.
- institution-event (emotion): Michael Gordon: Rowan McKenzie graduated from Napaaqtugmiut School.

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

Write them to `data/english/grades/batch-9.json` in this shape. Axis names are exactly: personality fit, formality, word choice, sentence structure, length. `prefer` holds the number of the better alternative for that axis, and is left out when the line is better.

```json
{
  "batch": "batch-9",
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

- Junction City: 5 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (43 local bills, 14057 recorded votes); interviews are the press module's
- Vauxhall: 1 decided races, office levels federal/state/township/county; bills and roll calls are the legislature module's own rows (7 local bills, 9734 recorded votes); interviews are the press module's
- San Vicente: 0 decided races, office levels federal/state; bills and roll calls are the legislature module's own rows (0 local bills, 13201 recorded votes); interviews are the press module's
- Tilden: 5 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (21 local bills, 11057 recorded votes); interviews are the press module's
- Noatak: 2 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (34 local bills, 9401 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

Each of these is a kind of line or a scenario the simulation cannot produce yet. None was invented for this batch.

- no race was decided by the end of the run, so victory and concession lines (which need a recorded winner and loser) cannot be produced
- the played world stopped before its year ended (A job ends before its day's work, from calendar work.); another place was drawn
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

### 0. Junction City, Wisconsin

Scenario: The "My life" journal of Skyler Mejia, chapter "My daughter", entry dated March 12, 1995.

The line before: Journal: My daughter was born.

The line: **Skyler Mejia: My daughter was born.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | I got married.        |                             |        |

### 1. Tilden, Texas

Scenario: The "My life" journal of Kevin Pratt, chapter "Tilden, Texas", entry dated August 1, 2027.

The line before: (this opens it)

The line: **Kevin Pratt: I lost my job. That was tough.**

| #   | Axis        | Another way to say it                        | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I lost my job. It was really tough.          |                             |        |
| 2   | word choice | I lost my job. It was tough.                 |                             |        |
| 3   | length      | I lost my job. It was a very difficult time. |                             |        |

### 2. Noatak, Alaska

Scenario: The "My life" journal of Alexander McCarthy, chapter "Noatak, Alaska", entry dated October 5, 2027.

The line before: (this opens it)

The line: **Alexander McCarthy: My father was elected. I didn't know at the time.**

| #   | Axis        | Another way to say it                                   | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My father was elected. Little did I know.               |                             |        |
| 2   | word choice | My father was elected. I didn't realize it at the time. |                             |        |
| 3   | length      | My father was elected. I never knew.                    |                             |        |

### 3. Vauxhall, New Jersey

Scenario: The "My life" journal of Elijah Norton, chapter "Vauxhall, New Jersey", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Elijah Norton: My mother won. I didn't know that at the time.**

| #   | Axis        | Another way to say it                           | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My mother won. That was a turning point.        |                             |        |
| 2   | word choice | My mother won. I didn't realize it at the time. |                             |        |
| 3   | length      | My mother won. Little did I know.               |                             |        |

### 4. Tilden, Texas

Scenario: The "My life" journal of Autumn Pratt, chapter "Tilden, Texas", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Autumn Pratt: My sister got elected. That's how it started.**

| #   | Axis        | Another way to say it                                | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My sister got elected. I had no clue.                |                             |        |
| 2   | word choice | My sister got elected. That's where it began.        |                             |        |
| 3   | length      | My sister got elected. I didn't know it at the time. |                             |        |

### 5. Noatak, Alaska

Scenario: The "My life" journal of Michael Travis, chapter "Commissioner", entry dated October 5, 2027.

The line before: Journal: Sofia lost.

The line: **Michael Travis: It was close.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | It wasn't close.      |                             |        |
| 2   | word choice | We lost.              |                             |        |

### 6. Noatak, Alaska

Scenario: The "My life" journal of Daniel Travis, chapter "Alaska", entry dated November 13, 2026.

The line before: (this opens it)

The line: **Daniel Travis: I moved back to Alaska.**

| #   | Axis        | Another way to say it    | Grade the line on this axis | Better |
| --- | ----------- | ------------------------ | --------------------------- | ------ |
| 1   | word choice | We moved back to Alaska. |                             |        |
| 2   | length      | We moved.                |                             |        |

### 7. Noatak, Alaska

Scenario: The "My life" journal of Ethan Travis, chapter "Alaska", entry dated November 12, 2026.

The line before: (this opens it)

The line: **Ethan Travis: I came to Alaska.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | I moved to Alaska.    |                             |        |

### 8. Vauxhall, New Jersey

Scenario: The "My life" journal of Michael Goodwin, chapter "My son", entry dated October 15, 2008.

The line before: Journal: My son was born. That's how it started.

The line: **Michael Goodwin: My daughter was born. That was the beginning.**

| #   | Axis        | Another way to say it                                 | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My daughter was born. I'll never forget that.         |                             |        |
| 2   | word choice | My daughter was born. That was a turning point.       |                             |        |
| 3   | length      | My daughter was born. I didn't know that at the time. |                             |        |

### 9. Noatak, Alaska

Scenario: The "My life" journal of Susan Travis, chapter "My son", entry dated November 21, 2008.

The line before: Journal: My son was born.

The line: **Susan Travis: My daughter was born. I didn't know it at the time.**

| #   | Axis        | Another way to say it                                | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My daughter was born. That was a turning point.      |                             |        |
| 2   | word choice | My daughter was born. I didn't know what that meant. |                             |        |
| 3   | length      | My daughter was born. Little did I know.             |                             |        |

### 10. Tilden, Texas

Scenario: The "My life" journal of Autumn Pratt, chapter "Tilden, Texas", entry dated November 3, 2026.

The line before: Journal: My sister got elected. That's how it started.

The line: **Autumn Pratt: My father got elected. That was a turning point.**

| #   | Axis        | Another way to say it                          | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My father got elected. I'll never forget that. |                             |        |
| 2   | word choice | My father got elected. That was the beginning. |                             |        |

### 11. Noatak, Alaska

Scenario: The "My life" journal of Ashley Travis, chapter "Commissioner", entry dated October 5, 2027.

The line before: (this opens it)

The line: **Ashley Travis: Quinn won. I'll never forget it.**

| #   | Axis        | Another way to say it                    | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Quinn won. I never knew.                 |                             |        |
| 2   | word choice | Quinn won. I'll never forget that.       |                             |        |
| 3   | length      | Quinn won. I didn't know it at the time. |                             |        |

### 12. Vauxhall, New Jersey

Scenario: The "My life" journal of Michael Goodwin, chapter "My son", entry dated May 2, 1998.

The line before: (this opens it)

The line: **Michael Goodwin: My son was born. I didn't realize it at the time.**

| #   | Axis        | Another way to say it                       | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | My son was born. That was a turning point.  |                             |        |
| 2   | word choice | My son was born. I didn't know at the time. |                             |        |
| 3   | length      | My son was born. I never knew.              |                             |        |

### 13. Noatak, Alaska

Scenario: The "My life" journal of Anthony Romero, chapter "Commissioner", entry dated October 5, 2027.

The line before: Journal: Sofia Raymond was elected.

The line: **Anthony Romero: Lara McCarthy lost. Little did I know.**

| #   | Axis        | Another way to say it                             | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Lara McCarthy lost. I didn't know at the time.    |                             |        |
| 2   | word choice | Lara McCarthy lost. I never knew.                 |                             |        |
| 3   | length      | Lara McCarthy lost. I didn't know it at the time. |                             |        |

### 14. Vauxhall, New Jersey

Scenario: The "My life" journal of Grace Armstrong, chapter "Vauxhall, New Jersey", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Grace Armstrong: Matthew was elected.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | Matthew got elected.  |                             |        |

### 15. Tilden, Texas

Scenario: The "My life" journal of Lauren Meyers, chapter "Tilden, Texas", entry dated November 3, 2026.

The line before: (this opens it)

The line: **Lauren Meyers: Cynthia lost.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | Cynthia won.          |                             |        |

### 16. Noatak, Alaska

Scenario: The "My life" journal of Tyler McCarthy, chapter "Noatak, Alaska", entry dated October 5, 2027.

The line before: (this opens it)

The line: **Tyler McCarthy: Thomas won. We had no idea.**

| #   | Axis        | Another way to say it                     | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Thomas won. I didn't know at the time.    |                             |        |
| 2   | word choice | Thomas won. I had no idea.                |                             |        |
| 3   | length      | Thomas won. I didn't know it at the time. |                             |        |

### 17. Noatak, Alaska

Scenario: The "My life" journal of Alexander Raymond, chapter "Noatak, Alaska", entry dated October 5, 2027.

The line before: Journal: Lara lost.

The line: **Alexander Raymond: Damian lost. I didn't know what that meant.**

| #   | Axis        | Another way to say it                        | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Damian lost. Little did I know.              |                             |        |
| 2   | word choice | Damian lost. I didn't know that at the time. |                             |        |
| 3   | length      | Damian lost. I never knew.                   |                             |        |

### 18. Tilden, Texas

Scenario: The "My life" journal of Lauren Meyers, chapter "Tilden, Texas", entry dated November 3, 2026.

The line before: Journal: Cynthia lost.

The line: **Lauren Meyers: Arthur won.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | Arthur lost.          |                             |        |

### 19. Noatak, Alaska

Scenario: The "My life" journal of Joshua Pitts, chapter "Noatak, Alaska", entry dated October 5, 2027.

The line before: Journal: Thomas McCarthy was elected.

The line: **Joshua Pitts: Sofia won. That's where it began.**

| #   | Axis        | Another way to say it                    | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Sofia won. I had no clue.                |                             |        |
| 2   | word choice | Sofia won. That's how it started.        |                             |        |
| 3   | length      | Sofia won. I didn't know it at the time. |                             |        |

## Legislation (bill text) (12 lines)

### 20. Junction City, Wisconsin

Scenario: The opening of H.R. 1 (enacted), filed in the House on October 13, 2026.

The line before: (this opens it)

The line: **United States Congress (bill text): Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,**

| #   | Axis   | Another way to say it                                             | Grade the line on this axis | Better |
| --- | ------ | ----------------------------------------------------------------- | --------------------------- | ------ |
| 1   | length | Resolved by the House of Representatives (the Senate concurring), |                             |        |

### 21. Vauxhall, New Jersey

Scenario: Its long title. 2026-1 (enacted), introduced November 26, 2026 before the Township of Union committee: it adopts "Inclusionary requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **Township of Union committee (bill text): To provide for inclusionary requirement, and for other purposes.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 22. Noatak, Alaska

Scenario: Its repeal clause. 2027-11 (failed), introduced June 9, 2027 before the Borough of Northwest Arctic commissioner: it repeals "Civilian oversight of police" on the bill's own provision record.

The line before: (this opens it)

The line: **Borough of Northwest Arctic commissioner (bill text): "Civilian oversight of police" is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 23. Junction City, Wisconsin

Scenario: Its short title. 2026-14 (failed), introduced November 11, 2026 before the Village of Junction City council: it adopts "Raise minimum wage" on the bill's own provision record.

The line before: (this opens it)

The line: **Village of Junction City council (bill text): This Act may be cited as the "Raise minimum wage".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 24. Noatak, Alaska

Scenario: Its short title. 2026-8 (failed), introduced October 27, 2026 before the Borough of Northwest Arctic commissioner: it adopts "Protect farmland from development" on the bill's own provision record.

The line before: (this opens it)

The line: **Borough of Northwest Arctic commissioner (bill text): This title may be cited as the "Protect farmland from development".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 25. Tilden, Texas

Scenario: Its long title. 2026-5 (failed), introduced October 27, 2026 before the County of Mcmullen commissioner: it adopts "Civilian oversight of police" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Mcmullen commissioner (bill text): To provide for civilian oversight of police, and for other purposes.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 26. Vauxhall, New Jersey

Scenario: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the County of Union commissioner: it adopts "Rent stabilization" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Union commissioner (bill text): This Act may be cited as the "Rent stabilization".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 27. Junction City, Wisconsin

Scenario: Its short title. 2026-9 (failed), introduced October 27, 2026 before the County of Portage commissioner: it adopts "Legalize cannabis sales" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Portage commissioner (bill text): This title may be cited as the "Legalize cannabis sales".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 28. Junction City, Wisconsin

Scenario: Its repeal clause. 2027-2 (failed), introduced January 10, 2027 before the Village of Junction City council: it repeals "Universal preschool" on the bill's own provision record.

The line before: (this opens it)

The line: **Village of Junction City council (bill text): "Universal preschool" is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 29. Tilden, Texas

Scenario: Its short title. 2026-9 (failed), introduced November 11, 2026 before the County of Mcmullen commissioner: it adopts "Limit groundwater withdrawal" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Mcmullen commissioner (bill text): This Act may be cited as the "Limit groundwater withdrawal".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 30. Junction City, Wisconsin

Scenario: Its long title. 2026-2 (failed), introduced October 27, 2026 before the County of Portage commissioner: it adopts "Universal preschool" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Portage commissioner (bill text): To provide for universal preschool, and for other purposes.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 31. Vauxhall, New Jersey

Scenario: Its short title. 2026-1 (enacted), introduced November 26, 2026 before the Township of Union committee: it adopts "Inclusionary requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **Township of Union committee (bill text): This title may be cited as the "Inclusionary requirement".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Notices (2 lines)

### 32. Junction City, Wisconsin

Scenario: A hearing notice for 2026-7, posted by the County of Portage commissioner.

The line before: (this opens it)

The line: **County of Portage commissioner clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Raise minimum wage" / DATE OF MEETING: October 27, 2026**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 33. Vauxhall, New Jersey

Scenario: The notice of the November 2, 2027 election in Vauxhall, from the contests the elections module holds.

The line before: (this opens it)

The line: **Vauxhall election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Vauxhall on November 2, 2027 for the following Officers: State Senator, State Representative, Committee member and Commissioner.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Minutes (4 lines)

### 34. Junction City, Wisconsin

Scenario: The discussion of "Universal preschool" at the October 27, 2026 meeting (2026-2).

The line before: (this opens it)

The line: **County of Portage commissioner (minutes): The staff provided an update on "Universal preschool".**

| #   | Axis   | Another way to say it                         | Grade the line on this axis | Better |
| --- | ------ | --------------------------------------------- | --------------------------- | ------ |
| 1   | length | Participants discussed "Universal preschool". |                             |        |

### 35. Noatak, Alaska

Scenario: The discussion of "Protect farmland from development" at the October 27, 2026 meeting (2026-8).

The line before: (this opens it)

The line: **Borough of Northwest Arctic commissioner (minutes): Participants discussed "Protect farmland from development".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 36. Noatak, Alaska

Scenario: The roll call on 2026-2 ("Ban discrimination in housing and work") before the Borough of Northwest Arctic commissioner: 1 for, 6 against; the bill failed. Each name is read from a member's recorded vote.

The line before: (this opens it)

The line: **Borough of Northwest Arctic commissioner (minutes): Voting against this action: Quinn Noel, Michael Gordon, Jennifer Montoya, Paul Romero, James McCarthy and Thomas McCarthy.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 37. Noatak, Alaska

Scenario: The roll call on 2026-1 ("Partner with federal immigration enforcement") before the Borough of Northwest Arctic commissioner: 4 for, 3 against; the bill enacted. Each name is read from a member's recorded vote.

The line before: (this opens it)

The line: **Borough of Northwest Arctic commissioner (minutes): Voting for this action: Quinn Noel, Michael Gordon, Jennifer Montoya and Thomas McCarthy.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Hearings (4 lines)

### 38. Junction City, Wisconsin

Scenario: A hearing on 2026-3 ("Ban discrimination in housing and work") before the County of Portage commissioner; the witness is Maya Cook, a resident.

The line before: (this opens it)

The line: **Stephanie Ramsey (chair): All right.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | Good afternoon.                   |                             |        |
| 2   | word choice | The gentlelady yields back.       |                             |        |
| 3   | length      | The gentleman's time has expired. |                             |        |

### 39. Vauxhall, New Jersey

Scenario: A hearing on 2026-5 ("Allow multifamily in single family zones") before the County of Union commissioner; the witness is Denise Norton, a resident.

The line before: (this opens it)

The line (feeling: gratitude): **Denise Norton (witness): Thank you, Chair.**

| #   | Axis               | Another way to say it    | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------ | --------------------------- | ------ |
| 1   | formality          | Thank you, Madam Chair.  |                             |        |
| 2   | word choice        | Thank you.               |                             |        |
| 3   | sentence structure | Thank you, Mr. Chairman. |                             |        |

### 40. Tilden, Texas

Scenario: A hearing on 2026-3 ("Ban discrimination in housing and work") before the County of Mcmullen commissioner; the witness is Jo Pratt, a resident.

The line before: (this opens it)

The line: **Jo Pratt (witness): I got you.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I appreciate it.      |                             |        |
| 2   | word choice | I agree.              |                             |        |

### 41. Junction City, Wisconsin

Scenario: A hearing on 2026-3 ("Ban discrimination in housing and work") before the County of Portage commissioner; the witness is Maya Cook, a resident.

The line before: (this opens it)

The line: **Maya Cook (witness): I agree.**

| #   | Axis        | Another way to say it        | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------- | --------------------------- | ------ |
| 1   | formality   | I couldn't agree more.       |                             |        |
| 2   | word choice | I completely agree.          |                             |        |
| 3   | length      | I appreciate that very much. |                             |        |

## Meetings (chair, members, public comment) (12 lines)

### 42. Junction City, Wisconsin

Scenario: A member of the Village of Junction City council speaks to the chair during 2026-3 ("Allow multifamily in single family zones").

The line before: (this opens it)

The line: **Charles Ramsey (member): Mr. Chair, I move to proceed to legislative session.**

| #   | Axis               | Another way to say it                                             | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Mr. Chair, I could not make today's vote.                         |                             |        |
| 2   | word choice        | Mr. Chair, I ask unanimous consent to resume legislative session. |                             |        |
| 3   | sentence structure | Mr. Chair, may I ask for a clarification?                         |                             |        |
| 4   | length             | Mr. Chair, I was unavoidably detained.                            |                             |        |

### 43. Vauxhall, New Jersey

Scenario: A member of the County of Union commissioner speaks to the chair during 2026-1 ("Rent stabilization").

The line before: (this opens it)

The line: **Mary Velazquez (member): Madam Chair, I was otherwise detained off the floor.**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.       |                             |        |
| 2   | word choice        | Madam Chair, I was absent from the chamber today. |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?       |                             |        |
| 4   | length             | Madam Chair, I was unavoidably detained.          |                             |        |

### 44. San Vicente, Northern Mariana Islands

Scenario: Charles Carey speaks in the public comment period of a San Vicente council meeting.

The line before: Charles Carey: We need your help.

The line (feeling: gratitude): **Charles Carey: Thank you.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.                |                             |        |
| 2   | word choice | Thank you for listening.          |                             |        |
| 3   | length      | Thank you for your consideration. |                             |        |

### 45. San Vicente, Northern Mariana Islands

Scenario: Marcus Carey speaks in the public comment period of a San Vicente council meeting.

The line before: Marcus Carey: Thank you for letting me speak.

The line: **Marcus Carey: My name is Marcus Carey, and I live in San Vicente.**

| #   | Axis   | Another way to say it  | Grade the line on this axis | Better |
| --- | ------ | ---------------------- | --------------------------- | ------ |
| 1   | length | I live in San Vicente. |                             |        |

### 46. Junction City, Wisconsin

Scenario: The Village of Junction City council takes up 2026-1 ("Universal preschool"); the recorded result is enacted.

The line before: Chair: All in favor?

The line: **Charles Ramsey (chair): The motion carries.**

| #   | Axis               | Another way to say it         | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------- | --------------------------- | ------ |
| 1   | formality          | I'll second.                  |                             |        |
| 2   | word choice        | The motion passes.            |                             |        |
| 3   | sentence structure | Is there a motion?            |                             |        |
| 4   | length             | The clerk will call the roll. |                             |        |

### 47. Junction City, Wisconsin

Scenario: The County of Portage commissioner takes up 2026-1 ("Paid family leave"); the recorded result is failed.

The line before: (this opens it)

The line: **Stephanie Ramsey (chair): The meeting will come to order.**

| #   | Axis               | Another way to say it                  | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Please state your name for the record. |                             |        |
| 2   | word choice        | The committee will come to order.      |                             |        |
| 3   | sentence structure | Is there a motion?                     |                             |        |
| 4   | length             | The motion carries.                    |                             |        |

### 48. San Vicente, Northern Mariana Islands

Scenario: Charles Carey speaks in the public comment period of a San Vicente council meeting.

The line before: Charles Carey: I live in San Vicente.

The line: **Charles Carey: We need your help.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 49. Tilden, Texas

Scenario: A member of the County of Mcmullen commissioner speaks to the chair during 2026-4 ("Legalize cannabis sales").

The line before: (this opens it)

The line: **Michelle Armstrong (member): Madam Chair, I withdraw my motion to proceed.**

| #   | Axis               | Another way to say it                                 | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.           |                             |        |
| 2   | word choice        | Madam Chair, I move to proceed to executive session.  |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?           |                             |        |
| 4   | length             | Madam Chair, I have a motion to recommit at the desk. |                             |        |

### 50. Noatak, Alaska

Scenario: A member of the Borough of Northwest Arctic commissioner speaks to the chair during 2026-11 ("Allow multifamily in single family zones").

The line before: (this opens it)

The line: **Michael Gordon (member): Mr. Chair, I was unavoidably absent and unable to vote.**

| #   | Axis               | Another way to say it                                | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Mr. Chair, I could not make today's vote.            |                             |        |
| 2   | word choice        | Mr. Chair, I was unable to be present for this vote. |                             |        |
| 3   | sentence structure | Mr. Chair, may I ask for a clarification?            |                             |        |
| 4   | length             | Mr. Chair, I was unavoidably detained.               |                             |        |

### 51. Junction City, Wisconsin

Scenario: The County of Portage commissioner takes up 2026-1 ("Paid family leave"); the recorded result is failed.

The line before: Chair: The meeting will come to order.

The line: **Stephanie Ramsey (chair): Is there a motion?**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | word choice        | Is there a second?    |                             |        |
| 2   | sentence structure | The motion carries.   |                             |        |
| 3   | length             | Opposed?              |                             |        |

### 52. Vauxhall, New Jersey

Scenario: A member of the County of Union commissioner speaks to the chair during 2026-4 ("Right to counsel in eviction").

The line before: (this opens it)

The line: **Mary Velazquez (member): Madam Chair, may I inquire how much time is remaining.**

| #   | Axis               | Another way to say it                                            | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.                      |                             |        |
| 2   | word choice        | Madam Chair, may I inquire how much time remains.                |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?                      |                             |        |
| 4   | length             | Madam Chair, may I inquire as to how much time I have remaining. |                             |        |

### 53. Tilden, Texas

Scenario: A member of the County of Mcmullen commissioner speaks to the chair during 2027-1 ("Protect farmland from development").

The line before: (this opens it)

The line: **Michelle Armstrong (member): Madam Chair, reserving the right to object.**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.       |                             |        |
| 2   | word choice        | Madam Chair, I reserve the right to object.       |                             |        |
| 3   | sentence structure | Madam Chair, how much time is remaining?          |                             |        |
| 4   | length             | Madam Chair, I send a cloture motion to the desk. |                             |        |

## Campaign speech (8 lines)

### 54. Junction City, Wisconsin

Scenario: Donna Hopkins speaks at a rally in Junction City as a candidate for undefined.

The line before: Donna Hopkins: Thank you so much.

The line: **Donna Hopkins: I grew up in Junction City.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm a small business owner.             |                             |        |
| 2   | word choice | I was born and raised in Junction City. |                             |        |
| 3   | length      | I'm a farmer.                           |                             |        |

### 55. Vauxhall, New Jersey

Scenario: Mary Velazquez speaks at a rally in Vauxhall as a candidate for undefined.

The line before: (this opens it)

The line (feeling: gratitude): **Mary Velazquez: Thank you all for being here.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm glad to be here.      |                             |        |
| 2   | word choice | Thank you all for coming. |                             |        |
| 3   | length      | Thank you.                |                             |        |

### 56. Tilden, Texas

Scenario: Charles Stein speaks at a rally in Tilden as a candidate for undefined.

The line before: Charles Stein: Thank you very much.

The line: **Charles Stein: I was born and raised in Tilden.**

| #   | Axis        | Another way to say it       | Grade the line on this axis | Better |
| --- | ----------- | --------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm a small business owner. |                             |        |
| 2   | word choice | I grew up in Tilden.        |                             |        |
| 3   | length      | I'm a farmer.               |                             |        |

### 57. Junction City, Wisconsin

Scenario: Russell Jackson speaks at a rally in Junction City as a candidate for undefined.

The line before: (this opens it)

The line (feeling: joy): **Russell Jackson: I'm glad to be here.**

| #   | Axis        | Another way to say it         | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for being here. |                             |        |
| 2   | word choice | It's great to be here.        |                             |        |
| 3   | length      | Thank you.                    |                             |        |

### 58. Vauxhall, New Jersey

Scenario: Robert Noel speaks at a rally in Vauxhall as a candidate for undefined.

The line before: (this opens it)

The line: **Robert Noel: It's great to be back in Vauxhall.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for coming. |                             |        |
| 2   | word choice | It's great to be here.    |                             |        |
| 3   | length      | Thank you so much.        |                             |        |

### 59. Junction City, Wisconsin

Scenario: Russell Jackson speaks at a rally in Junction City as a candidate for undefined.

The line before: Russell Jackson: I was born and raised in Junction City.

The line: **Russell Jackson: Go vote.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | Let's get to work.    |                             |        |
| 2   | word choice | Get out and vote.     |                             |        |

### 60. San Vicente, Northern Mariana Islands

Scenario: Timothy Gaines speaks at a rally in San Vicente as a candidate for undefined.

The line before: Timothy Gaines: I grew up in San Vicente.

The line: **Timothy Gaines: I need your vote.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | Let's get to work.    |                             |        |
| 2   | word choice | I need your help.     |                             |        |

### 61. Vauxhall, New Jersey

Scenario: Dana Beck speaks at a rally in Vauxhall as a candidate for undefined.

The line before: Dana Beck: I was born and raised in Vauxhall.

The line: **Dana Beck: Tell your friends.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | Let's get to work.    |                             |        |
| 2   | word choice | I need your help.     |                             |        |

## Interview answers (8 lines)

### 62. Junction City, Wisconsin

Scenario: A local reporter's interview of Russell Jackson (a candidate in Junction City, 2026-10-19); asked about "Bottle deposit"; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about "Bottle deposit"?

The line: **Russell Jackson: I'm committed to "Bottle deposit".**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | You have my word.     |                             |        |
| 2   | word choice | I'll do it.           |                             |        |
| 3   | length      | I will.               |                             |        |

### 63. San Vicente, Northern Mariana Islands

Scenario: A local reporter's interview of Sam Edwards (a candidate in San Vicente, 2026-10-26); asked about "All mail voting"; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about "All mail voting"?

The line: **Sam Edwards: I'll do it.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | That's a promise.     |                             |        |

### 64. Noatak, Alaska

Scenario: A local reporter's interview of Christina Garcia (a candidate in Noatak, 2026-10-26); asked about "Stand your ground"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Stand your ground"?

The line: **Christina Garcia: That's a promise.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | I'll do it.           |                             |        |

### 65. San Vicente, Northern Mariana Islands

Scenario: A local reporter's interview of Sam Edwards (a candidate in San Vicente, 2026-10-26); asked about "Permit to carry concealed"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Permit to carry concealed"?

The line: **Sam Edwards: You have my word.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | I will.               |                             |        |

### 66. Tilden, Texas

Scenario: A local reporter's interview of Thomas Salazar (a candidate in Tilden, 2026-10-19); asked about "Public sector collective bargaining"; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about "Public sector collective bargaining"?

The line: **Thomas Salazar: I will.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | You have my word.     |                             |        |

### 67. Vauxhall, New Jersey

Scenario: A local reporter's interview of Jacob McIntyre (a candidate in Vauxhall, 2026-10-19); asked about "Restrict abortion"; the candidate's recorded answer is support.

The line before: Reporter: How are you going to pay for it?

The line: **Jacob McIntyre: I'm committed to "Restrict abortion".**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | You have my word.     |                             |        |
| 2   | word choice | I'll do it.           |                             |        |
| 3   | length      | I will.               |                             |        |

### 68. Tilden, Texas

Scenario: A local reporter's interview of Thomas Salazar (a candidate in Tilden, 2026-10-19); asked about "Bottle deposit"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Bottle deposit"?

The line: **Thomas Salazar: I'll do it.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | That's a promise.     |                             |        |

### 69. Tilden, Texas

Scenario: A local reporter's interview of Thomas Salazar (a candidate in Tilden, 2026-10-19); asked about "Clean electricity standard"; the candidate's recorded answer is support.

The line before: Reporter: What would you do about "Clean electricity standard"?

The line: **Thomas Salazar: That's a promise.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | I'll do it.           |                             |        |

## Emotional register (18 lines)

### 70. Junction City, Wisconsin

Scenario: Donna Hopkins lost the race for undefined to Russell Stanley (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: disappointment): **Donna Hopkins: We didn't win.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | We will be back.      |                             |        |

### 71. Junction City, Wisconsin

Scenario: Timothy Stuart lost the race for undefined to Walter Solomon (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: goodwill): **Timothy Stuart: I wish Walter Solomon well.**

| #   | Axis        | Another way to say it          | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------ | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.      |                             |        |
| 2   | word choice | I congratulate Walter Solomon. |                             |        |

### 72. Junction City, Wisconsin

Scenario: Donald Murphy honors Veronica Barrett, a fellow sitting official, on the floor.

The line before: (this opens it)

The line (feeling: joy): **Donald Murphy: Mr. Speaker, I rise today to celebrate Veronica Barrett.**

| #   | Axis               | Another way to say it                                            | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Mr. Speaker, I rise to honor Veronica Barrett.                   |                             |        |
| 2   | sentence structure | Madam Speaker, I rise today to celebrate Veronica Barrett.       |                             |        |
| 3   | length             | Mr. Speaker, I rise today to honor the life of Veronica Barrett. |                             |        |

### 73. Junction City, Wisconsin

Scenario: Walter Solomon won the race for undefined against Timothy Stuart (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: pride): **Walter Solomon: I am honored.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm honored.          |                             |        |
| 2   | word choice | I am grateful.        |                             |        |

### 74. Junction City, Wisconsin

Scenario: Daniel Clark lost the race for undefined to Jeremy Strong (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Daniel Clark: This is not the end.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything. |                             |        |
| 2   | word choice | The fight goes on.        |                             |        |

### 75. Junction City, Wisconsin

Scenario: Jessica Russell lost the race for undefined to Sharon McCarty (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Jessica Russell: We will be back.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | We didn't win.        |                             |        |
| 2   | word choice | The fight goes on.    |                             |        |

### 76. Noatak, Alaska

Scenario: Lara McCarthy lost the race for undefined to Michael Travis (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: gratitude): **Lara McCarthy: Thank you for everything.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | The fight goes on.    |                             |        |

### 77. Tilden, Texas

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: joy): **Dean Villarreal: Madam Speaker, I rise today to congratulate Maria Villarreal. Maria Villarreal was born in Tilden. I congratulate Maria Villarreal. I yield back.**

| #   | Axis               | Another way to say it                                                                                                                                  | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise to honor Maria Villarreal. Maria Villarreal was born in Tilden. I congratulate Maria Villarreal. I yield back.                   |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise today to congratulate Maria Villarreal. Maria Villarreal was born in Tilden. I congratulate Maria Villarreal. I yield back.        |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Maria Villarreal. Maria Villarreal was born in Tilden. I congratulate Maria Villarreal. I yield back. |                             |        |

### 78. San Vicente, Northern Mariana Islands

Scenario: Marc Young honors Brandy Walton, a fellow sitting official, on the floor.

The line before: Marc Young: Brandy Walton was born in San Vicente.

The line (feeling: joy): **Marc Young: I congratulate Brandy Walton.**

| #   | Axis        | Another way to say it                           | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | Congratulations, Brandy Walton.                 |                             |        |
| 2   | length      | Please join me in congratulating Brandy Walton. |                             |        |

### 79. Tilden, Texas

Scenario: Kevin Graham lost the race for undefined to Michelle Fowler (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: goodwill): **Kevin Graham: I wish Michelle Fowler well.**

| #   | Axis        | Another way to say it           | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.       |                             |        |
| 2   | word choice | I congratulate Michelle Fowler. |                             |        |

### 80. Tilden, Texas

Scenario: Tammy Poole won the race for undefined against Joseph Molina (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: gratitude): **Tammy Poole: I am grateful.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm grateful.         |                             |        |
| 2   | word choice | I am honored.         |                             |        |

### 81. Tilden, Texas

Scenario: Thomas Salazar won the race for undefined against Julie McNeil (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: pride): **Thomas Salazar: I'm honored.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I am honored.         |                             |        |
| 2   | word choice | I'm grateful.         |                             |        |

### 82. Tilden, Texas

Scenario: Megan Shannon lost the race for undefined to Sharon Velez (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: goodwill): **Megan Shannon: I wish Sharon Velez well.**

| #   | Axis        | Another way to say it        | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.    |                             |        |
| 2   | word choice | I congratulate Sharon Velez. |                             |        |

### 83. San Vicente, Northern Mariana Islands

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: joy): **Marc Young: Mr. Speaker, I rise today to recognize Brandy Walton. Brandy Walton was born in San Vicente. I congratulate Brandy Walton. I yield back.**

| #   | Axis               | Another way to say it                                                                                                                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------ |
| 1   | word choice        | Mr. Speaker, I rise to honor Brandy Walton. Brandy Walton was born in San Vicente. I congratulate Brandy Walton. I yield back.                   |                             |        |
| 2   | sentence structure | Madam Speaker, I rise today to recognize Brandy Walton. Brandy Walton was born in San Vicente. I congratulate Brandy Walton. I yield back.       |                             |        |
| 3   | length             | Mr. Speaker, I rise today to honor the life of Brandy Walton. Brandy Walton was born in San Vicente. I congratulate Brandy Walton. I yield back. |                             |        |

### 84. Tilden, Texas

Scenario: Sharon Velez won the race for undefined against Megan Shannon (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: pride): **Sharon Velez: I am humbled.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm grateful.         |                             |        |
| 2   | word choice | I am grateful.        |                             |        |

### 85. Junction City, Wisconsin

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: joy): **Charles Ramsey: Mr. Speaker, I rise to honor Robert Brooks. Robert Brooks was born in Junction City. I congratulate Robert Brooks. Mr. Speaker, I yield back the balance of my time.**

| #   | Axis               | Another way to say it                                                                                                                                                                  | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Mr. Speaker, I rise today to celebrate Robert Brooks. Robert Brooks was born in Junction City. I congratulate Robert Brooks. Mr. Speaker, I yield back the balance of my time.         |                             |        |
| 2   | sentence structure | Madam Speaker, I rise to honor Robert Brooks. Robert Brooks was born in Junction City. I congratulate Robert Brooks. Mr. Speaker, I yield back the balance of my time.                 |                             |        |
| 3   | length             | Mr. Speaker, I rise today to honor the life of Robert Brooks. Robert Brooks was born in Junction City. I congratulate Robert Brooks. Mr. Speaker, I yield back the balance of my time. |                             |        |

### 86. Vauxhall, New Jersey

Scenario: Jacob McIntyre lost the race for undefined to Joseph McLaughlin (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: joy): **Jacob McIntyre: I congratulate Joseph McLaughlin.**

| #   | Axis        | Another way to say it                     | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.                 |                             |        |
| 2   | word choice | I want to congratulate Joseph McLaughlin. |                             |        |

### 87. Vauxhall, New Jersey

Scenario: Joseph McLaughlin won the race for undefined against Jacob McIntyre (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: joy): **Joseph McLaughlin: We did it.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm grateful.         |                             |        |
| 2   | word choice | We won.               |                             |        |

## Conversation (true replies and the scales' false versions) (12 lines)

### 88. Junction City, Wisconsin

Scenario: Jason Mejia talks with Samuel Romero, in Junction City, Wisconsin, on day 2. A reply the player could pick.

The line before: Samuel Romero: Have you heard from Jace Cook?

The line: **Jason Mejia: No.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't.        |                             |        |
| 2   | word choice        | Not recently.         |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 89. Junction City, Wisconsin

Scenario: Jason Mejia talks with Thomas Pope, a neighbor, in Junction City, Wisconsin, on day 2.

The line before: Thomas Pope: Oh.

The line: **Thomas Pope: Take care of yourself.**

| #   | Axis            | Another way to say it | Grade the line on this axis | Better |
| --- | --------------- | --------------------- | --------------------------- | ------ |
| 1   | personality fit | Have a nice day.      |                             |        |
| 2   | formality       | I'll see you.         |                             |        |
| 3   | word choice     | Take care.            |                             |        |
| 4   | length          | Bye.                  |                             |        |

### 90. Vauxhall, New Jersey

Scenario: Sophia Norton talks with Trevor Velazquez, in Vauxhall, New Jersey, on day 2. A reply the player could pick.

The line before: Trevor Velazquez: Have you seen Alina Sims?

The line: **Sophia Norton: Have you seen Alina Sims?**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | word choice        | How about you?        |                             |        |
| 2   | sentence structure | Not for a long time.  |                             |        |
| 3   | length             | Have you?             |                             |        |

### 91. Junction City, Wisconsin

Scenario: Jason Mejia talks with Brittney Mejia, in Junction City, Wisconsin, on day 3. A reply the player could pick.

The line before: Brittney Mejia: Where are you from?

The line: **Jason Mejia: I was born in Junction City.**

| #   | Axis               | Another way to say it       | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Junction City.     |                             |        |
| 2   | word choice        | I grew up in Junction City. |                             |        |
| 3   | sentence structure | Where do you live?          |                             |        |
| 4   | length             | Right here.                 |                             |        |

### 92. Vauxhall, New Jersey

Scenario: Sophia Norton talks with Haley Moran, in Vauxhall, New Jersey, on day 3. A reply the player could pick.

The line before: Haley Moran: Have you talked to Trevor?

The line: **Sophia Norton: I talked to Trevor Velazquez yesterday.**

| #   | Axis               | Another way to say it             | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------- | --------------------------- | ------ |
| 1   | word choice        | I saw Trevor Velazquez yesterday. |                             |        |
| 2   | sentence structure | Have you seen Trevor?             |                             |        |
| 3   | length             | I haven't.                        |                             |        |

### 93. Vauxhall, New Jersey

Scenario: Sophia Norton talks with Haley Moran, in Vauxhall, New Jersey, on day 3. A reply the player could pick.

The line before: Haley Moran: You remember Nicholas S. Lacorte-Peterstown School No. 3?

The line: **Sophia Norton: I do.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Yes, I do.                |                             |        |
| 2   | word choice | I do remember.            |                             |        |
| 3   | length      | That was a long time ago. |                             |        |

### 94. Tilden, Texas

Scenario: Autumn Pratt talks with Sharon Pratt, in Tilden, Texas, on day 5. A reply the player could pick.

The line before: Sharon Pratt: Where are you from?

The line: **Autumn Pratt: I grew up in Tilden.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Tilden.      |                             |        |
| 2   | word choice        | I grew up here.       |                             |        |
| 3   | sentence structure | How about you?        |                             |        |
| 4   | length             | Right here.           |                             |        |

### 95. Junction City, Wisconsin

Scenario: Jason Mejia talks with Dominic Hart, a neighbor, in Junction City, Wisconsin, on day 6.

The line before: Dominic Hart: Got it.

The line: **Dominic Hart: I have to run.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I've got to run.      |                             |        |
| 2   | word choice | I have to go.         |                             |        |
| 3   | length      | Bye.                  |                             |        |

### 96. Vauxhall, New Jersey

Scenario: Sophia Norton talks with Michael Snyder, in Vauxhall, New Jersey, on day 5. A reply the player could pick.

The line before: Michael Snyder: Remember Nicholas S. Lacorte-Peterstown School No. 3?

The line: **Sophia Norton: I remember that.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Yes, I remember.          |                             |        |
| 2   | word choice | I remember.               |                             |        |
| 3   | length      | That was a long time ago. |                             |        |

### 97. Tilden, Texas

Scenario: Autumn Pratt talks with Carlos Pratt, in Tilden, Texas, on day 1. A reply the player could pick.

The line before: Carlos Pratt: Where did you go to school?

The line: **Autumn Pratt: I'm going to Mcmullen County School.**

| #   | Axis        | Another way to say it           | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------- | --------------------------- | ------ |
| 1   | formality   | I go to Mcmullen County School. |                             |        |
| 2   | word choice | I'm at Mcmullen County School.  |                             |        |
| 3   | length      | It's going well.                |                             |        |

### 98. Tilden, Texas

Scenario: Autumn Pratt talks with Kevin Pratt, in Tilden, Texas, on day 4. A reply the player could pick.

The line before: Kevin Pratt: I work for Harrell Sand and Gravel.

The line: **Autumn Pratt: How long have you been doing that?**

| #   | Axis               | Another way to say it         | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------- | --------------------------- | ------ |
| 1   | word choice        | How long have you been there? |                             |        |
| 2   | sentence structure | I'm sorry to hear that.       |                             |        |
| 3   | length             | How long?                     |                             |        |

### 99. Northchase, North Carolina

Scenario: Priya Harrell talks with Laura Lucas, a neighbor, in Northchase, North Carolina, on day 4.

The line before: Laura Lucas: Yeah.

The line: **Laura Lucas: I need to go.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I've got to go.       |                             |        |
| 2   | word choice | I have to go.         |                             |        |
| 3   | length      | Bye.                  |                             |        |
