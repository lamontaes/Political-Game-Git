# Words across the game, graded on five axes: grading batch batch-7

These 100 lines are what the game's English engine produces today for each kind of text, not quotations: a journal entry, the title of a bill, a notice, a roll call in the minutes, a hearing, a chair calling a vote, a campaign speech, an interview answer, a feeling, and a conversation. Each sentence was said in a public-domain federal record, with the names, towns, offices and bills filled from a generated world's own records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The worlds are 5 places drawn at random from all 56 (seed `batch-7`): Runnemede, New Jersey; Ruth, Nevada; Hanson, Kentucky; Valle Vista, New Mexico; La Pica, Puerto Rico.

## What is in this batch

| Kind                                                       | Lines |
| ---------------------------------------------------------- | ----- |
| Journal ("My life")                                        | 14    |
| Legislation (bill text)                                    | 12    |
| Notices                                                    | 4     |
| Minutes                                                    | 4     |
| Hearings                                                   | 4     |
| Meetings (chair, members, public comment)                  | 10    |
| Campaign speech                                            | 8     |
| Interview answers                                          | 8     |
| Emotional register                                         | 18    |
| Conversation (true replies and the scales' false versions) | 18    |

Every line shows its scenario, the line before it and the speaker. The scenario is what the played world held when the line was made (a filed bill and its roll call, a candidate's filing, an interview the press engine ran, a journal entry the director recorded). Where the world held no record for a scenario, nothing was made up; it is listed under "OWNER DECISIONS NEEDED".

## Feelings: what the banks have and lack

A line is tagged with the feeling its own words carry. These are the feelings the whole mined banks carry (parts found):

| Feeling        | In the banks |
| -------------- | ------------ |
| apology        | 10 parts     |
| sadness        | 19 parts     |
| disappointment | 3 parts      |
| resolve        | 3 parts      |
| pride          | 7 parts      |
| gratitude      | 152 parts    |
| joy            | 27 parts     |
| goodwill       | 3 parts      |
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

Write them to `data/english/grades/batch-7.json` in this shape. Axis names are exactly: personality fit, formality, word choice, sentence structure, length. `prefer` holds the number of the better alternative for that axis, and is left out when the line is better.

```json
{
  "batch": "batch-7",
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

- Runnemede: 2 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (67 local bills, 10332 recorded votes); interviews are the press module's
- Ruth: 8 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (24 local bills, 10183 recorded votes); interviews are the press module's
- Hanson: 4 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (32 local bills, 16115 recorded votes); interviews are the press module's
- Valle Vista: 11 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (35 local bills, 12307 recorded votes); interviews are the press module's
- La Pica: 20 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (59 local bills, 14430 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

Each of these is a kind of line or a scenario the simulation cannot produce yet. None was invented for this batch.

- no person has died by the end of the run, so a memorial or condolence scenario (tribute sadness) cannot be produced
- Arrogance, anger and fear have no words in any bank: no part carries a boast, a threat or an alarm, and the composer's `mood` input has no bank that reads it. Owner's intent: temporary emotions are separate from core traits, and cocky and brazen are named traits (docs/coordination/DECISION-REGISTER.md, the personality-vocabulary entry); the wording is the owner's call.
- Local ordinance wording: the only local parts ('An Ordinance concerning', 'Be it ordained by the') come from one Baltimore bill and are marked not shippable, so a town council's measure is worded with the federal bank's short title ('This Act may be cited as') and repeal clause. Owner decision needed on whether a local body's measure uses its own form.
- Bill text is only a bill's title, short title, long title and repeal clause: no composer turns a provision (a policy question and a direction, or a budget line and an amount) into an operative section, and the local ordinance section part needs words nobody writes. Owner decision needed on how a section's operative words are produced without hand-written text.
- Interviews: a recorded answer that opposes a policy has no wording (the bank only commits or deflects), and the 'record' move needs the candidate's recorded vote on the same question, which the press and record modules do not join.
- Minutes: only roll-call lines and a discussion line; 'the next meeting would be held on' needs a recorded next meeting date and 'dissented because' needs a recorded reason, which the legislature module does not keep.
- Meeting agendas and the speech of a real council meeting come only from bills of the town's bodies; a posted agenda record (items in order, with times) is not in the world yet.

## The lines

## Journal ("My life") (14 lines)

### 0. Runnemede, New Jersey

Scenario: The "My life" journal of Moses McKenzie, chapter "Aline Bingham Elementary School", entry dated August 24, 2020.

The line before: Journal: I went on to Aline Bingham Elementary School.

The line: **Moses McKenzie: I went to Mary E. Volz Elementary School.**

| #   | Axis        | Another way to say it                     | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I didn't win. Volz Elementary School.     |                             |        |
| 2   | word choice | I decided to run. Volz Elementary School. |                             |        |
| 3   | length      | I lost. Volz Elementary School.           |                             |        |

### 1. Hanson, Kentucky

Scenario: The "My life" journal of Nathan Dixon, chapter "Hanson Elementary School", entry dated August 25, 2014.

The line before: (this opens it)

The line: **Nathan Dixon: I was at Hanson Elementary School.**

| #   | Axis        | Another way to say it                  | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I died at at Hanson Elementary School. |                             |        |
| 2   | length      | I died.                                |                             |        |

### 2. Hanson, Kentucky

Scenario: The "My life" journal of Luke Dixon, chapter "Hanson Elementary School", entry dated August 27, 1984.

The line before: Journal: I attended South Hopkins Middle School.

The line: **Luke Dixon: I went on to Madisonville North Hopkins High School.**

| #   | Axis        | Another way to say it                              | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I attended Madisonville North Hopkins High School. |                             |        |

### 3. La Pica, Puerto Rico

Scenario: The "My life" journal of John Butler, chapter "My son", entry dated December 18, 2026.

The line before: Journal: My daughter was born.

The line: **John Butler: The bill passed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 4. Hanson, Kentucky

Scenario: The "My life" journal of Luke Dixon, chapter "Hanson Elementary School", entry dated August 25, 1975.

The line before: (this opens it)

The line: **Luke Dixon: Then I went to Hanson Elementary School.**

| #   | Axis        | Another way to say it                | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------ | --------------------------- | ------ |
| 1   | word choice | I attended Hanson Elementary School. |                             |        |

### 5. Runnemede, New Jersey

Scenario: The "My life" journal of Ryan Potter, chapter "Aline Bingham Elementary School", entry dated August 24, 1987.

The line before: (this opens it)

The line: **Ryan Potter: I attended Aline Bingham Elementary School.**

| #   | Axis        | Another way to say it                             | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I graduated from Aline Bingham Elementary School. |                             |        |

### 6. Ruth, Nevada

Scenario: The "My life" journal of Patricia Vaughan, chapter "Farmer's General Store", entry dated February 1, 2027.

The line before: (this opens it)

The line: **Patricia Vaughan: I went to work at Farmer's General Store.**

| #   | Axis        | Another way to say it                         | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I started working for Farmer's General Store. |                             |        |
| 2   | length      | I went to work.                               |                             |        |

### 7. Hanson, Kentucky

Scenario: The "My life" journal of Melissa Dixon, chapter "Hanson Elementary School", entry dated August 30, 1982.

The line before: (this opens it)

The line: **Melissa Dixon: I graduated from Hanson Elementary School.**

| #   | Axis        | Another way to say it                | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------ | --------------------------- | ------ |
| 1   | word choice | I attended Hanson Elementary School. |                             |        |

### 8. Ruth, Nevada

Scenario: The "My life" journal of Eric Vaughan, chapter "Farmer's General Store", entry dated February 1, 2027.

The line before: (this opens it)

The line: **Eric Vaughan: My partner went to work.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 9. Ruth, Nevada

Scenario: The "My life" journal of Eva Vaughan, chapter "McGill Elementary", entry dated August 24, 2020.

The line before: Journal: Then I went to McGill Elementary.

The line: **Eva Vaughan: I went to Lund High School.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | word choice | I decided to run.     |                             |        |
| 2   | length      | I lost.               |                             |        |

### 10. La Pica, Puerto Rico

Scenario: The "My life" journal of Hailey Butler, chapter "Antonio Badillo Hernandez", entry dated August 25, 2014.

The line before: (this opens it)

The line: **Hailey Butler: I was at Antonio Badillo Hernandez.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I died at at Antonio Badillo Hernandez. |                             |        |
| 2   | length      | I died.                                 |                             |        |

### 11. Valle Vista, New Mexico

Scenario: The "My life" journal of Dominic Curtis, chapter "Los Ninos Elementary", entry dated August 24, 2020.

The line before: Journal: I attended Los Ninos Elementary.

The line: **Dominic Curtis: I went on to Nina Otero Community School.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I attended Nina Otero Community School. |                             |        |

### 12. Valle Vista, New Mexico

Scenario: The "My life" journal of Casey Klein, chapter "Los Ninos Elementary", entry dated August 24, 2020.

The line before: Journal: I went to Los Ninos Elementary.

The line: **Casey Klein: Then I went to Nina Otero Community School.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I attended Nina Otero Community School. |                             |        |

### 13. La Pica, Puerto Rico

Scenario: The "My life" journal of Hailey Butler, chapter "Antonio Badillo Hernandez", entry dated December 18, 2026.

The line before: Journal: The bill passed.

The line: **Hailey Butler: The bill passed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Legislation (bill text) (12 lines)

### 14. Runnemede, New Jersey

Scenario: The opening of 2026-001 (enacted), filed in the House on December 15, 2026.

The line before: (this opens it)

The line: **United States Congress (bill text): Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,**

| #   | Axis   | Another way to say it                                             | Grade the line on this axis | Better |
| --- | ------ | ----------------------------------------------------------------- | --------------------------- | ------ |
| 1   | length | Resolved by the House of Representatives (the Senate concurring), |                             |        |

### 15. Ruth, Nevada

Scenario: Its short title. 2026-004 (enacted), introduced October 27, 2026 before the County of White Pine Commissioner: it adopts "Inclusionary requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **County of White Pine Commissioner (bill text): This title may be cited as the "Inclusionary requirement".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 16. Runnemede, New Jersey

Scenario: Its short title. 2026-009 (enacted), introduced November 11, 2026 before the County of Camden commissioner: it repeals "Right to counsel in eviction" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Camden commissioner (bill text): This Act may be cited as the "Right to counsel in eviction".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 17. Runnemede, New Jersey

Scenario: Its repeal clause. 2026-010 (enacted), introduced November 11, 2026 before the Borough of Runnemede council: it repeals "Local minimum wage authority" on the bill's own provision record.

The line before: (this opens it)

The line: **Borough of Runnemede council (bill text): Local minimum wage authority is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 18. Hanson, Kentucky

Scenario: Its short title. 2026-011 (failed), introduced October 27, 2026 before the County of Hopkins commissioner: it adopts "Civilian oversight of police" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Hopkins commissioner (bill text): This title may be cited as the "Civilian oversight of police".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 19. Ruth, Nevada

Scenario: Its short title. 2026-012 (failed), introduced October 27, 2026 before the County of White Pine Commissioner: it adopts "Partner with federal immigration enforcement" on the bill's own provision record.

The line before: (this opens it)

The line: **County of White Pine Commissioner (bill text): This Act may be cited as the "Partner with federal immigration enforcement".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 20. Hanson, Kentucky

Scenario: Its repeal clause. 2026-016 (failed), introduced November 11, 2026 before the County of Hopkins commissioner: it repeals "Medicaid work requirement" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Hopkins commissioner (bill text): Medicaid work requirement is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 21. Valle Vista, New Mexico

Scenario: Its short title. 2026-011 (failed), introduced October 27, 2026 before the County of Santa Fe commissioner: it adopts "Right to work" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Santa Fe commissioner (bill text): This title may be cited as the "Right to work".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 22. Valle Vista, New Mexico

Scenario: Its short title. 2026-009 (failed), introduced October 27, 2026 before the County of Santa Fe commissioner: it adopts "Ban lobbying after office" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Santa Fe commissioner (bill text): This Act may be cited as the "Ban lobbying after office".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 23. Runnemede, New Jersey

Scenario: Its repeal clause. 2026-011 (failed), introduced November 11, 2026 before the County of Camden commissioner: it repeals "Right to work" on the bill's own provision record.

The line before: (this opens it)

The line: **County of Camden commissioner (bill text): Right to work is repealed.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 24. La Pica, Puerto Rico

Scenario: Its short title. 2026-013 (failed), introduced October 27, 2026 before the Camuy Municipio governing body: it adopts "Consumer data privacy law" on the bill's own provision record.

The line before: (this opens it)

The line: **Camuy Municipio governing body (bill text): This title may be cited as the "Consumer data privacy law".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 25. La Pica, Puerto Rico

Scenario: Its short title. 2026-023 (failed), introduced November 11, 2026 before the Camuy Municipio governing body: it adopts "Civilian oversight of police" on the bill's own provision record.

The line before: (this opens it)

The line: **Camuy Municipio governing body (bill text): This Act may be cited as the "Civilian oversight of police".**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Notices (4 lines)

### 26. Runnemede, New Jersey

Scenario: A hearing notice for 2026-005, posted by the County of Camden commissioner.

The line before: (this opens it)

The line: **County of Camden commissioner clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: Allow multifamily in single family zones / DATE OF MEETING: October 27, 2026**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 27. Ruth, Nevada

Scenario: An ordinance listing for 2026-001, posted by the County of White Pine Commissioner.

The line before: (this opens it)

The line: **County of White Pine Commissioner clerk: Council Resolutions and Ordinances: 2026-001, Paid family leave**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 28. Runnemede, New Jersey

Scenario: The notice of the November 6, 2029 election in Runnemede, from the contests the elections module holds.

The line before: (this opens it)

The line: **Runnemede election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Runnemede on November 6, 2029 for the following Officers: Governor, Lieutenant Governor, Council member, Commissioner, Sheriff, County clerk, County treasurer and County assessor.**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

### 29. Hanson, Kentucky

Scenario: An ordinance listing for 2026-010, posted by the County of Hopkins commissioner.

The line before: (this opens it)

The line: **County of Hopkins commissioner clerk: Council Resolutions and Ordinances: 2026-010, Shift highway funds to transit**

No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.

## Minutes (4 lines)

### 30. Runnemede, New Jersey

Scenario: The discussion of "Restrict government facial recognition" at the October 27, 2026 meeting (2026-006).

The line before: (this opens it)

The line: **County of Camden commissioner (minutes): The staff provided an update on restrict government facial recognition.**

| #   | Axis        | Another way to say it                                              | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------------------------ | --------------------------- | ------ |
| 1   | word choice | The manager then turned to restrict government facial recognition. |                             |        |
| 2   | length      | Participants discussed restrict government facial recognition.     |                             |        |

### 31. Ruth, Nevada

Scenario: The discussion of "Paid family leave" at the October 27, 2026 meeting (2026-001).

The line before: (this opens it)

The line: **County of White Pine Commissioner (minutes): The manager turned first to paid family leave.**

| #   | Axis        | Another way to say it                              | Grade the line on this axis | Better |
| --- | ----------- | -------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | The staff provided an update on paid family leave. |                             |        |
| 2   | length      | Participants discussed paid family leave.          |                             |        |

### 32. Valle Vista, New Mexico

Scenario: The discussion of "Shift highway funds to transit" at the October 27, 2026 meeting (2026-002).

The line before: (this opens it)

The line: **County of Santa Fe commissioner (minutes): The manager then turned to shift highway funds to transit.**

| #   | Axis        | Another way to say it                                           | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | The staff provided an update on shift highway funds to transit. |                             |        |
| 2   | length      | Participants discussed shift highway funds to transit.          |                             |        |

### 33. La Pica, Puerto Rico

Scenario: The discussion of "Partner with federal immigration enforcement" at the October 27, 2026 meeting (2026-011).

The line before: (this opens it)

The line: **Camuy Municipio governing body (minutes): The manager turned next to partner with federal immigration enforcement.**

| #   | Axis        | Another way to say it                                                         | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | The staff provided an update on partner with federal immigration enforcement. |                             |        |
| 2   | length      | Participants discussed partner with federal immigration enforcement.          |                             |        |

## Hearings (4 lines)

### 34. Runnemede, New Jersey

Scenario: A hearing on 2026-005 ("Allow multifamily in single family zones") before the County of Camden commissioner; the witness is Kenneth Potter, a resident.

The line before: (this opens it)

The line: **Emil Hopkins (chair): Good afternoon.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | All right.                        |                             |        |
| 2   | word choice | Good morning.                     |                             |        |
| 3   | length      | The gentleman's time has expired. |                             |        |

### 35. Ruth, Nevada

Scenario: A hearing on 2026-012 ("Partner with federal immigration enforcement") before the County of White Pine Commissioner; the witness is Eric Vaughan, a resident.

The line before: (this opens it)

The line (feeling: gratitude): **Eric Vaughan (witness): Thank you, Madam Chair.**

| #   | Axis               | Another way to say it    | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------ | --------------------------- | ------ |
| 1   | formality          | Thank you, Chair.        |                             |        |
| 2   | word choice        | Thank you, sir.          |                             |        |
| 3   | sentence structure | Thank you, Mr. Chairman. |                             |        |

### 36. Hanson, Kentucky

Scenario: A hearing on 2026-011 ("Civilian oversight of police") before the County of Hopkins commissioner; the witness is Edward Holland, a resident.

The line before: (this opens it)

The line (feeling: gratitude): **Edward Holland (witness): Thank you, Chair.**

| #   | Axis               | Another way to say it    | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------ | --------------------------- | ------ |
| 1   | formality          | Thank you, Madam Chair.  |                             |        |
| 2   | word choice        | Thank you.               |                             |        |
| 3   | sentence structure | Thank you, Mr. Chairman. |                             |        |

### 37. Valle Vista, New Mexico

Scenario: A hearing on 2026-007 ("Right to counsel in eviction") before the County of Santa Fe commissioner; the witness is Travis Duncan, a resident.

The line before: (this opens it)

The line (feeling: gratitude): **Travis Duncan (witness): Thank you for that.**

| #   | Axis               | Another way to say it    | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------ | --------------------------- | ------ |
| 1   | formality          | Thank you, sir.          |                             |        |
| 2   | word choice        | Thank you.               |                             |        |
| 3   | sentence structure | Thank you, Mr. Chairman. |                             |        |

## Meetings (chair, members, public comment) (10 lines)

### 38. Runnemede, New Jersey

Scenario: A member of the County of Camden commissioner speaks to the chair during 2026-007 ("Local minimum wage authority").

The line before: (this opens it)

The line: **Emil Hopkins (member): Mr. Chair, I was unavoidably detained.**

| #   | Axis               | Another way to say it                              | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Mr. Chair, I could not make today's vote.          |                             |        |
| 2   | word choice        | Mr. Chair, I demand a recorded vote.               |                             |        |
| 3   | sentence structure | Mr. Chair, may I ask for a clarification?          |                             |        |
| 4   | length             | Mr. Chair, I was otherwise detained off the floor. |                             |        |

### 39. Ruth, Nevada

Scenario: A member of the County of White Pine Commissioner speaks to the chair during 2026-011 ("Medicaid work requirement").

The line before: (this opens it)

The line: **Rachel Garza (member): Madam Chair, I missed a vote today.**

| #   | Axis               | Another way to say it                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.         |                             |        |
| 2   | word choice        | Madam Chair, I demand a recorded vote.              |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?         |                             |        |
| 4   | length             | Madam Chair, I ask unanimous consent to use a prop. |                             |        |

### 40. Hanson, Kentucky

Scenario: A member of the County of Hopkins commissioner speaks to the chair during 2026-004 ("Allow multifamily in single family zones").

The line before: (this opens it)

The line: **Seth Phelps (member): Madam Chair, I was otherwise detained off the floor.**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.       |                             |        |
| 2   | word choice        | Madam Chair, I was absent from the chamber today. |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?       |                             |        |
| 4   | length             | Madam Chair, I was unavoidably detained.          |                             |        |

### 41. Valle Vista, New Mexico

Scenario: A member of the County of Santa Fe commissioner speaks to the chair during 2026-002 ("Shift highway funds to transit").

The line before: (this opens it)

The line: **Hope Brown (member): Madam Chair, I withdraw my motion to proceed.**

| #   | Axis               | Another way to say it                                 | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.           |                             |        |
| 2   | word choice        | Madam Chair, I move to proceed to executive session.  |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?           |                             |        |
| 4   | length             | Madam Chair, I have a motion to recommit at the desk. |                             |        |

### 42. La Pica, Puerto Rico

Scenario: Natalie Butler speaks in the public comment period of a La Pica council meeting.

The line before: Natalie Butler: We need your help.

The line (feeling: gratitude): **Natalie Butler: Thank you for your service.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.                |                             |        |
| 2   | word choice | Thank you for your consideration. |                             |        |
| 3   | length      | Thank you.                        |                             |        |

### 43. Runnemede, New Jersey

Scenario: The County of Camden commissioner takes up 2026-002 ("Medicaid work requirement"); the recorded result is failed.

The line before: Chair: All in favor?

The line: **Emil Hopkins (chair): The noes have it.**

| #   | Axis               | Another way to say it                  | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'll second.                           |                             |        |
| 2   | word choice        | The ayes have it.                      |                             |        |
| 3   | sentence structure | All in favor?                          |                             |        |
| 4   | length             | Please state your name for the record. |                             |        |

### 44. Hanson, Kentucky

Scenario: Luke Dixon speaks in the public comment period of a Hanson council meeting.

The line before: Luke Dixon: We need your help.

The line (feeling: gratitude): **Luke Dixon: Thank you for your consideration.**

| #   | Axis        | Another way to say it       | Grade the line on this axis | Better |
| --- | ----------- | --------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.          |                             |        |
| 2   | word choice | Thank you for your service. |                             |        |
| 3   | length      | Thank you.                  |                             |        |

### 45. La Pica, Puerto Rico

Scenario: A member of the Camuy Municipio governing body speaks to the chair during 2026-010 ("Age verification for social media").

The line before: (this opens it)

The line: **Connie Yoder (member): Madam Chair, I was unavoidably absent and unable to vote.**

| #   | Axis               | Another way to say it                                  | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.            |                             |        |
| 2   | word choice        | Madam Chair, I was unable to be present for this vote. |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?            |                             |        |
| 4   | length             | Madam Chair, I was unavoidably detained.               |                             |        |

### 46. Ruth, Nevada

Scenario: A member of the County of White Pine Commissioner speaks to the chair during 2026-003 ("Rent stabilization").

The line before: (this opens it)

The line: **Jonathan Olsen (member): Madam Chair, may I inquire as to the time remaining.**

| #   | Axis               | Another way to say it                                            | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Madam Chair, I could not make today's vote.                      |                             |        |
| 2   | word choice        | Madam Chair, may I inquire as to how much time is remaining.     |                             |        |
| 3   | sentence structure | Madam Chair, may I ask for a clarification?                      |                             |        |
| 4   | length             | Madam Chair, may I inquire as to how much time I have remaining. |                             |        |

### 47. Hanson, Kentucky

Scenario: Edward Holland speaks in the public comment period of a Hanson council meeting.

The line before: Edward Holland: We need your help.

The line (feeling: gratitude): **Edward Holland: Thank you for your time.**

| #   | Axis        | Another way to say it             | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------- | --------------------------- | ------ |
| 1   | formality   | That's all I have.                |                             |        |
| 2   | word choice | Thank you for your consideration. |                             |        |
| 3   | length      | Thank you.                        |                             |        |

## Campaign speech (8 lines)

### 48. Runnemede, New Jersey

Scenario: Debra McNeil speaks at a rally in Runnemede as a candidate for undefined.

The line before: (this opens it)

The line: **Debra McNeil: It's great to be home.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for coming. |                             |        |
| 2   | word choice | It's good to be home.     |                             |        |
| 3   | length      | Thank you.                |                             |        |

### 49. Ruth, Nevada

Scenario: Pamela Herrera speaks at a rally in Ruth as a candidate for undefined.

The line before: Pamela Herrera: It's great to be here.

The line: **Pamela Herrera: I was born and raised in Ruth.**

| #   | Axis        | Another way to say it       | Grade the line on this axis | Better |
| --- | ----------- | --------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm a small business owner. |                             |        |
| 2   | word choice | I grew up in Ruth.          |                             |        |
| 3   | length      | I'm a farmer.               |                             |        |

### 50. Valle Vista, New Mexico

Scenario: Charles Stark speaks at a rally in Valle Vista as a candidate for undefined.

The line before: Charles Stark: Thank you so much.

The line: **Charles Stark: I grew up in Valle Vista.**

| #   | Axis        | Another way to say it                 | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm a small business owner.           |                             |        |
| 2   | word choice | I was born and raised in Valle Vista. |                             |        |
| 3   | length      | I'm a farmer.                         |                             |        |

### 51. La Pica, Puerto Rico

Scenario: Heather Benítez speaks at a rally in La Pica as a candidate for undefined.

The line before: Heather Benítez: Go vote.

The line (feeling: gratitude): **Heather Benítez: Thank you, and God bless.**

| #   | Axis        | Another way to say it                 | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------- | --------------------------- | ------ |
| 1   | formality   | God bless you, and God bless America. |                             |        |
| 2   | word choice | Thank you all.                        |                             |        |
| 3   | length      | Thank you.                            |                             |        |

### 52. Runnemede, New Jersey

Scenario: Jennifer Jackson speaks at a rally in Runnemede as a candidate for undefined.

The line before: (this opens it)

The line: **Jennifer Jackson: It's good to be home.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for coming. |                             |        |
| 2   | word choice | It's great to be home.    |                             |        |
| 3   | length      | Thank you.                |                             |        |

### 53. Hanson, Kentucky

Scenario: Mike Stephenson speaks at a rally in Hanson as a candidate for undefined.

The line before: Mike Stephenson: We can do this.

The line (feeling: gratitude): **Mike Stephenson: Thank you, and God bless you.**

| #   | Axis        | Another way to say it                 | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------- | --------------------------- | ------ |
| 1   | formality   | God bless you, and God bless America. |                             |        |
| 2   | word choice | Thank you so much.                    |                             |        |
| 3   | length      | Thank you.                            |                             |        |

### 54. Runnemede, New Jersey

Scenario: Thomas Rojas speaks at a rally in Runnemede as a candidate for undefined.

The line before: (this opens it)

The line: **Thomas Rojas: It's good to be back in Runnemede.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you all for coming. |                             |        |
| 2   | word choice | It's good to be home.     |                             |        |
| 3   | length      | Thank you so much.        |                             |        |

### 55. Hanson, Kentucky

Scenario: Mike Stephenson speaks at a rally in Hanson as a candidate for undefined.

The line before: (this opens it)

The line (feeling: gratitude): **Mike Stephenson: Thank you all for coming.**

| #   | Axis        | Another way to say it         | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm glad to be here.          |                             |        |
| 2   | word choice | Thank you all for being here. |                             |        |
| 3   | length      | Thank you.                    |                             |        |

## Interview answers (8 lines)

### 56. Runnemede, New Jersey

Scenario: A local reporter's interview of Amy McKenzie (a candidate in Runnemede, 2026-10-19); asked about stand your ground; the candidate's recorded answer is support.

The line before: Reporter: How are you going to pay for it?

The line: **Amy McKenzie: I will.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'll do it.           |                             |        |
| 2   | word choice | You have my word.     |                             |        |

### 57. Ruth, Nevada

Scenario: A local reporter's interview of Gary Cortez (a candidate in Ruth, 2026-11-02); asked about shift highway funds to transit; the candidate's recorded answer is to decline.

The line before: Reporter: What would you do about shift highway funds to transit?

The line: **Gary Cortez: Look.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Here's the thing.                       |                             |        |
| 2   | word choice | Time will tell.                         |                             |        |
| 3   | length      | I don't have anything to share on that. |                             |        |

### 58. Hanson, Kentucky

Scenario: A local reporter's interview of Seth Phelps (a candidate in Hanson, 2026-10-26); asked about shift highway funds to transit; the candidate's recorded answer is support.

The line before: Reporter: What would you do about shift highway funds to transit?

The line: **Seth Phelps: That's a promise.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | I'll do it.           |                             |        |

### 59. Runnemede, New Jersey

Scenario: A local reporter's interview of Jennifer Jackson (a candidate in Runnemede, 2026-10-26); asked about stand your ground; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about stand your ground?

The line: **Jennifer Jackson: I'm committed to stand your ground.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | You have my word.     |                             |        |
| 2   | length    | I will.               |                             |        |

### 60. Ruth, Nevada

Scenario: A local reporter's interview of Gary Cortez (a candidate in Ruth, 2026-11-02); asked about stand your ground; the candidate's recorded answer is to decline.

The line before: Reporter: What would you do about stand your ground?

The line: **Gary Cortez: I haven't made a decision.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Let me be clear.                        |                             |        |
| 2   | word choice | I haven't made that decision yet.       |                             |        |
| 3   | length      | I don't have anything to share on that. |                             |        |

### 61. Runnemede, New Jersey

Scenario: A local reporter's interview of Jason Watts (a candidate in Runnemede, 2026-10-19); asked about shift highway funds to transit; the candidate's recorded answer is support.

The line before: Reporter: What are you going to do about shift highway funds to transit?

The line: **Jason Watts: I'll do it.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I will.               |                             |        |
| 2   | word choice | That's a promise.     |                             |        |

### 62. Ruth, Nevada

Scenario: A local reporter's interview of Gary Cortez (a candidate in Ruth, 2026-11-02); asked about shift highway funds to transit; the candidate's recorded answer is to decline.

The line before: Reporter: How are you going to pay for it?

The line: **Gary Cortez: I'm not going to get into that.**

| #   | Axis        | Another way to say it               | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------- | --------------------------- | ------ |
| 1   | formality   | Let me be very clear.               |                             |        |
| 2   | word choice | I'm not going to get ahead of that. |                             |        |
| 3   | length      | Here's the thing.                   |                             |        |

### 63. Ruth, Nevada

Scenario: A local reporter's interview of Gary Cortez (a candidate in Ruth, 2026-11-02); asked about stand your ground; the candidate's recorded answer is to decline.

The line before: Reporter: What are you going to do about stand your ground?

The line: **Gary Cortez: That's a hypothetical question.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Let me be clear.                        |                             |        |
| 2   | word choice | I haven't made a decision.              |                             |        |
| 3   | length      | I don't have anything to share on that. |                             |        |

## Emotional register (18 lines)

### 64. Ruth, Nevada

Scenario: Derek Chavez lost the race for undefined to Shawn Roman (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: disappointment): **Derek Chavez: We didn't win.**

| #   | Axis      | Another way to say it | Grade the line on this axis | Better |
| --- | --------- | --------------------- | --------------------------- | ------ |
| 1   | formality | We will be back.      |                             |        |

### 65. Runnemede, New Jersey

Scenario: A colleague honors Christina Bridges, a sitting official in Runnemede (closer).

The line before: (this opens it)

The line (feeling: goodwill): **A colleague: I wish Christina Bridges continued success.**

| #   | Axis        | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I thank Christina Bridges for Christina Bridges's service. |                             |        |
| 2   | length      | I am proud to represent Christina Bridges in Congress.     |                             |        |

### 66. Ruth, Nevada

Scenario: Gary Cortez lost the race for undefined to Kelsey Vargas (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: goodwill): **Gary Cortez: I wish him well.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything. |                             |        |
| 2   | word choice | The fight goes on.        |                             |        |

### 67. La Pica, Puerto Rico

Scenario: Megan Colón lost the race for undefined to Susan Quiñones (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: goodwill): **Megan Colón: I wish Susan Quiñones well.**

| #   | Axis        | Another way to say it          | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------ | --------------------------- | ------ |
| 1   | formality   | Thank you for everything.      |                             |        |
| 2   | word choice | I congratulate Susan Quiñones. |                             |        |
| 3   | length      | We didn't win.                 |                             |        |

### 68. Runnemede, New Jersey

Scenario: A colleague honors Maria Noble, a sitting official in Runnemede (closer).

The line before: (this opens it)

The line (feeling: gratitude): **A colleague: I thank Maria Noble for Maria Noble's service.**

| #   | Axis        | Another way to say it                 | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I wish Maria Noble continued success. |                             |        |
| 2   | length      | Happy retirement, Maria Noble.        |                             |        |

### 69. Hanson, Kentucky

Scenario: Brian Boyd honors Heather Rosa, a fellow sitting official, on the floor.

The line before: Brian Boyd: Heather Rosa graduated from Hanson Elementary School.

The line (feeling: gratitude): **Brian Boyd: I thank Heather Rosa for her service.**

| #   | Axis        | Another way to say it                          | Grade the line on this axis | Better |
| --- | ----------- | ---------------------------------------------- | --------------------------- | ------ |
| 1   | formality   | Please join me in congratulating Heather Rosa. |                             |        |
| 2   | word choice | Heather Rosa will be missed.                   |                             |        |
| 3   | length      | I congratulate Heather Rosa.                   |                             |        |

### 70. Runnemede, New Jersey

Scenario: Debra McNeil won the race for undefined against Julie Wong (the voting module's recorded result) and speaks on election night.

The line before: (this opens it)

The line (feeling: gratitude): **Debra McNeil: I am grateful.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | I'm grateful.         |                             |        |
| 2   | word choice | I am honored.         |                             |        |

### 71. Runnemede, New Jersey

Scenario: Tara Sweeney honors Maria Noble, a fellow sitting official, on the floor.

The line before: (this opens it)

The line (feeling: joy): **Tara Sweeney: Madam Speaker, I rise today to congratulate Maria Noble.**

| #   | Axis               | Another way to say it                                         | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise to honor Maria Noble.                   |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise today to congratulate Maria Noble.        |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Maria Noble. |                             |        |

### 72. Ruth, Nevada

Scenario: Rachel Garza honors Christine Tate, a fellow sitting official, on the floor.

The line before: (this opens it)

The line (feeling: joy): **Rachel Garza: Madam Speaker, I rise today to celebrate Christine Tate.**

| #   | Axis               | Another way to say it                                            | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise to honor Christine Tate.                   |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise today to celebrate Christine Tate.           |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Christine Tate. |                             |        |

### 73. Hanson, Kentucky

Scenario: Christian Patrick honors Brian Boyd, a fellow sitting official, on the floor.

The line before: (this opens it)

The line (feeling: joy): **Christian Patrick: Mr. Speaker, I rise today to celebrate Brian Boyd.**

| #   | Axis               | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Mr. Speaker, I rise to honor Brian Boyd.                   |                             |        |
| 2   | sentence structure | Madam Speaker, I rise today to celebrate Brian Boyd.       |                             |        |
| 3   | length             | Mr. Speaker, I rise today to honor the life of Brian Boyd. |                             |        |

### 74. Runnemede, New Jersey

Scenario: A colleague honors Christina Bridges, a sitting official in Runnemede (opener).

The line before: (this opens it)

The line (feeling: pride): **A colleague: Madam Speaker, it is my honor to recognize Christina Bridges.**

| #   | Axis        | Another way to say it                                                         | Grade the line on this axis | Better |
| --- | ----------- | ----------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | Madam Speaker, I rise to honor Christina Bridges.                             |                             |        |
| 2   | length      | Madam Speaker, I rise today with a heavy heart to remember Christina Bridges. |                             |        |

### 75. Ruth, Nevada

Scenario: A colleague honors Sherry Schwartz, a sitting official in Ruth (closer).

The line before: (this opens it)

The line (feeling: pride): **A colleague: I am proud to represent Sherry Schwartz in Congress.**

| #   | Axis        | Another way to say it                                  | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------------ | --------------------------- | ------ |
| 1   | word choice | I thank Sherry Schwartz for Sherry Schwartz's service. |                             |        |
| 2   | length      | Happy birthday to Sherry Schwartz.                     |                             |        |

### 76. Runnemede, New Jersey

Scenario: A colleague honors Tara Sweeney, a sitting official in Runnemede (closer).

The line before: (this opens it)

The line (feeling: pride): **A colleague: It is my privilege to recognize Tara Sweeney.**

| #   | Axis        | Another way to say it                             | Grade the line on this axis | Better |
| --- | ----------- | ------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice | I am proud to represent Tara Sweeney in Congress. |                             |        |
| 2   | length      | Happy birthday to Tara Sweeney.                   |                             |        |

### 77. Runnemede, New Jersey

Scenario: Heidi Woodard lost the race for undefined to Douglas Yarbrough (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Heidi Woodard: This is not the end.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything. |                             |        |
| 2   | word choice | The fight goes on.        |                             |        |

### 78. Ruth, Nevada

Scenario: Brian Donovan lost the race for undefined to Christopher Love (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Brian Donovan: We will be back.**

| #   | Axis        | Another way to say it | Grade the line on this axis | Better |
| --- | ----------- | --------------------- | --------------------------- | ------ |
| 1   | formality   | We didn't win.        |                             |        |
| 2   | word choice | The fight goes on.    |                             |        |

### 79. Ruth, Nevada

Scenario: Laura Reese lost the race for undefined to Andrew Tillman (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: resolve): **Laura Reese: The fight goes on.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything. |                             |        |
| 2   | word choice | This is not the end.      |                             |        |

### 80. Runnemede, New Jersey

Scenario: The whole house honor turn, said in one go (a floor tribute).

The line before: (this opens it)

The line (feeling: joy): **Blair Pugh: Madam Speaker, I rise to honor Christina Bridges. Christina Bridges grew up in Runnemede. Congratulations, Christina Bridges. Madam Speaker, I yield back the balance of my time.**

| #   | Axis               | Another way to say it                                                                                                                                                                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Madam Speaker, I rise today to celebrate Christina Bridges. Christina Bridges grew up in Runnemede. Congratulations, Christina Bridges. Madam Speaker, I yield back the balance of my time.         |                             |        |
| 2   | sentence structure | Mr. Speaker, I rise to honor Christina Bridges. Christina Bridges grew up in Runnemede. Congratulations, Christina Bridges. Madam Speaker, I yield back the balance of my time.                     |                             |        |
| 3   | length             | Madam Speaker, I rise today to honor the life of Christina Bridges. Christina Bridges grew up in Runnemede. Congratulations, Christina Bridges. Madam Speaker, I yield back the balance of my time. |                             |        |

### 81. Hanson, Kentucky

Scenario: William Mason lost the race for undefined to Tony Khan (the voting module's recorded result) and concedes.

The line before: (this opens it)

The line (feeling: joy): **William Mason: I want to congratulate Tony Khan.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Thank you for everything. |                             |        |
| 2   | word choice | I congratulate Tony Khan. |                             |        |
| 3   | length      | We didn't win.            |                             |        |

## Conversation (true replies and the scales' false versions) (18 lines)

### 82. Runnemede, New Jersey

Scenario: Justin Potter talks with Ella McIntosh, in Runnemede, New Jersey, on day 4.

The line before: (this opens it)

The line: **Ella McIntosh: It's good to see you.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Good to see you.      |                             |        |
| 2   | word choice        | It's nice to see you. |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good afternoon.       |                             |        |

### 83. Ruth, Nevada

Scenario: Eva Vaughan talks with Caleb Randall, in Ruth, Nevada, on day 6. A reply the player could pick.

The line before: Caleb Randall: How's Madeline?

The line: **Eva Vaughan: Have you seen Madeline Hines?**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | word choice        | How about you?        |                             |        |
| 2   | sentence structure | Not for a long time.  |                             |        |
| 3   | length             | Have you?             |                             |        |

### 84. Hanson, Kentucky

Scenario: Nathan Dixon talks with Brianna Cabrera, in Hanson, Kentucky, on day 1. A reply the player could pick.

The line before: Brianna Cabrera: Have you talked to Taylor?

The line: **Nathan Dixon: I haven't.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Not recently.         |                             |        |
| 2   | word choice        | No, I haven't.        |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 85. La Pica, Puerto Rico

Scenario: Hailey Butler talks with James Butler, in La Pica, Puerto Rico, on day 6. A reply the player could pick.

The line before: James Butler: Have you seen Natalie Butler?

The line: **Hailey Butler: I talked to Natalie Butler today.**

| #   | Axis               | Another way to say it       | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------- | --------------------------- | ------ |
| 1   | word choice        | I saw Natalie Butler today. |                             |        |
| 2   | sentence structure | Have you seen Natalie?      |                             |        |
| 3   | length             | I haven't.                  |                             |        |

### 86. Runnemede, New Jersey

Scenario: Justin Potter talks with Sage Noble, in Runnemede, New Jersey, on day 6. A reply the player could pick.

The line before: Sage Noble: How's Michael Spence doing?

The line: **Justin Potter: Not for a long time.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't.        |                             |        |
| 2   | sentence structure | How about you?        |                             |        |
| 3   | length             | Not recently.         |                             |        |

### 87. Hanson, Kentucky

Scenario: Nathan Dixon talks with Brianna Cabrera, in Hanson, Kentucky, on day 1. A reply the player could pick.

The line before: Brianna Cabrera: Remember South Hopkins Middle School?

The line: **Nathan Dixon: Oh, yes.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Oh, sure.                 |                             |        |
| 2   | word choice | Yes.                      |                             |        |
| 3   | length      | That was a long time ago. |                             |        |

### 88. Valle Vista, New Mexico

Scenario: Alyssa Chan talks with Olivia Roberson, in Valle Vista, New Mexico, on day 5. A reply the player could pick.

The line before: Olivia Roberson: Where do you come from?

The line: **Alyssa Chan: I'm from Valle Vista.**

| #   | Axis               | Another way to say it                 | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Here in Valle Vista.                  |                             |        |
| 2   | sentence structure | Where are you from?                   |                             |        |
| 3   | length             | I was born and raised in Valle Vista. |                             |        |

### 89. Ruth, Nevada

Scenario: Eva Vaughan talks with John Vaughan, in Ruth, Nevada, on day 3. A reply the player could pick.

The line before: John Vaughan: How is Sofia Vaughan doing?

The line: **Eva Vaughan: I saw Sofia Vaughan today.**

| #   | Axis               | Another way to say it            | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't.                   |                             |        |
| 2   | word choice        | I talked to Sofia Vaughan today. |                             |        |
| 3   | sentence structure | Have you seen Sofia?             |                             |        |
| 4   | length             | I haven't.                       |                             |        |

### 90. Runnemede, New Jersey

Scenario: Justin Potter talks with Mary Moss, a neighbor, in Runnemede, New Jersey, on day 5. A reply the player could pick.

The line before: Mary Moss: Where did you go to school?

The line: **Justin Potter: I graduated from Mary E. Volz Elementary School.**

| #   | Axis        | Another way to say it                   | Grade the line on this axis | Better |
| --- | ----------- | --------------------------------------- | --------------------------- | ------ |
| 1   | formality   | I'm at Mary E. Volz Elementary School.  |                             |        |
| 2   | word choice | I go to Mary E. Volz Elementary School. |                             |        |
| 3   | length      | I graduated. Volz Elementary School.    |                             |        |

### 91. Hanson, Kentucky

Scenario: Nathan Dixon talks with Brianna Cabrera, in Hanson, Kentucky, on day 1. A reply the player could pick.

The line before: Brianna Cabrera: Where do you come from?

The line: **Nathan Dixon: I grew up in Hanson.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Hanson.      |                             |        |
| 2   | word choice        | I grew up here.       |                             |        |
| 3   | sentence structure | How about you?        |                             |        |
| 4   | length             | Right here.           |                             |        |

### 92. Ruth, Nevada

Scenario: Eva Vaughan talks with Violet Wooten, in Ruth, Nevada, on day 5. A reply the player could pick.

The line before: Violet Wooten: Have you seen Lily Kelly?

The line: **Eva Vaughan: No, I haven't.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | No.                   |                             |        |
| 2   | word choice        | I haven't.            |                             |        |
| 3   | sentence structure | Have you?             |                             |        |

### 93. Runnemede, New Jersey

Scenario: Justin Potter talks with Ian Lynch, in Runnemede, New Jersey, on day 3.

The line before: (this opens it)

The line: **Ian Lynch: Good to see you, Justin.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | It's good to see you. |                             |        |
| 2   | word choice        | Nice to see you.      |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good afternoon.       |                             |        |

### 94. Ruth, Nevada

Scenario: Eva Vaughan talks with Violet Wooten, in Ruth, Nevada, on day 5. A reply the player could pick.

The line before: Violet Wooten: You remember Lund High School?

The line: **Eva Vaughan: Oh, sure.**

| #   | Axis        | Another way to say it     | Grade the line on this axis | Better |
| --- | ----------- | ------------------------- | --------------------------- | ------ |
| 1   | formality   | Oh, yes.                  |                             |        |
| 2   | word choice | Sure.                     |                             |        |
| 3   | length      | That was a long time ago. |                             |        |

### 95. Hanson, Kentucky

Scenario: Nathan Dixon talks with Brianna Cabrera, in Hanson, Kentucky, on day 1.

The line before: (this opens it)

The line: **Brianna Cabrera: Hi, Nathan.**

| #   | Axis               | Another way to say it    | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------ | --------------------------- | ------ |
| 1   | formality          | Hello, Nathan.           |                             |        |
| 2   | word choice        | Hi.                      |                             |        |
| 3   | sentence structure | How are things going?    |                             |        |
| 4   | length             | Good to see you, Nathan. |                             |        |

### 96. Runnemede, New Jersey

Scenario: Justin Potter talks with Ian Lynch, in Runnemede, New Jersey, on day 2. This is one of the scales' false versions: a reply that is not true of the speaker. A reply the player could pick.

The line before: Ian Lynch: Where do you come from?

The line (a false version): **Justin Potter: I'm from Camden County.**

| #   | Axis               | Another way to say it                   | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Here in Camden County.                  |                             |        |
| 2   | sentence structure | Where are you from?                     |                             |        |
| 3   | length             | I was born and raised in Camden County. |                             |        |

### 97. Runnemede, New Jersey

Scenario: Justin Potter talks with Sarah Riley, in Runnemede, New Jersey, on day 5. This is one of the scales' false versions: a reply that is not true of the speaker. A reply the player could pick.

The line before: Sarah Riley: Where do you come from?

The line (a false version): **Justin Potter: Not here. And you?**

| #   | Axis               | Another way to say it             | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------- | --------------------------- | ------ |
| 1   | word choice        | Not here. You too?                |                             |        |
| 2   | sentence structure | Not here. Fine, thank you.        |                             |        |
| 3   | length             | Not here. What are you doing now? |                             |        |

### 98. La Pica, Puerto Rico

Scenario: Hailey Butler talks with James Butler, in La Pica, Puerto Rico, on day 1. This is one of the scales' false versions: a reply that is not true of the speaker. A reply the player could pick.

The line before: James Butler: Where are you from?

The line (a false version): **Hailey Butler: Not here. How about you?**

| #   | Axis               | Another way to say it      | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------- | --------------------------- | ------ |
| 1   | word choice        | Not here. What about you?  |                             |        |
| 2   | sentence structure | Not here. Fine, thank you. |                             |        |

### 99. La Pica, Puerto Rico

Scenario: Hailey Butler talks with Christina Bell, a neighbor, in La Pica, Puerto Rico, on day 4. This is one of the scales' false versions: a reply that is not true of the speaker. A reply the player could pick.

The line before: Christina Bell: Where do you come from?

The line (a false version): **Hailey Butler: Not here. What about you?**

| #   | Axis               | Another way to say it      | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------- | --------------------------- | ------ |
| 1   | word choice        | Not here. How about you?   |                             |        |
| 2   | sentence structure | Not here. Fine, thank you. |                             |        |
