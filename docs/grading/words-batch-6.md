# Conversations, graded on five axes: grading batch batch-6

These 100 lines are what the story director says when its words come from the mined conversation bank. Each sentence was said in a public-domain federal record, with the names, employers and towns filled from a generated person's records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The lines come from 5 drawn places: Washington, District of Columbia; Bell, Florida; Palmer Lake, Colorado; North Clarendon, Vermont; Forkland, Alabama.

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

Then, if one of the alternatives is better than the line on that axis, write its number. If the line is better, leave it blank. Skip any axis you have no opinion on. Grades never block a merge.

## Where the grades go

Write them to `data/english/grades/batch-6.json` in this shape. Axis names are exactly: personality fit, formality, word choice, sentence structure, length. `prefer` holds the number of the better alternative for that axis, and is left out when the line is better.

```json
{
  "batch": "batch-6",
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

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger (`data/english/part-grades.json`). A line graded BAD or FIX on an axis, and never GOOD there, is held back on that axis; an alternative you prefer counts as GOOD on its axis.

## The lines

### 0. Washington, District of Columbia

The line before: Camila Murray: Where do you come from?

The line (a reply you could pick): **Alex Moseley: Here in Washington. What do you do?**

| #   | Axis               | Another way to say it                                | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Washington. What do you do?                 |                             |        |
| 2   | word choice        | I grew up in Washington. What do you do?             |                             |        |
| 3   | sentence structure | And you? What do you do?                             |                             |        |
| 4   | length             | I was born and raised in Washington. What do you do? |                             |        |

### 1. Washington, District of Columbia

The line before: Chad Moseley: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Oh. How's Skyler doing?**

| #   | Axis               | Another way to say it                       | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. How's Skyler doing?               |                             |        |
| 2   | word choice        | Oh, no. How's Skyler doing?                 |                             |        |
| 3   | sentence structure | Oh, really? How's Skyler doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Skyler doing? |                             |        |

### 2. Washington, District of Columbia

The line before: Chad Moseley: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Sure. Have you seen Jimmy Moseley?**

| #   | Axis               | Another way to say it                                | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. Have you seen Jimmy Moseley?                     |                             |        |
| 2   | word choice        | Okay. Have you seen Jimmy Moseley?                   |                             |        |
| 3   | sentence structure | Oh, really? Have you seen Jimmy Moseley?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you seen Jimmy Moseley? |                             |        |

### 3. Washington, District of Columbia

The line before: (the talk opens)

The line: **George Rhodes: It's good to see you.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Good to see you.      |                             |        |
| 2   | word choice        | It's nice to see you. |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good afternoon.       |                             |        |

### 4. Washington, District of Columbia

The line before: Caleb Cross: Where do you come from?

The line: **Alex Moseley: Right here in Washington. What are you doing now?**

| #   | Axis               | Another way to say it                                        | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | I'm from Washington. What are you doing now?                 |                             |        |
| 2   | word choice        | Right here. What are you doing now?                          |                             |        |
| 3   | sentence structure | And you? What are you doing now?                             |                             |        |
| 4   | length             | I was born and raised in Washington. What are you doing now? |                             |        |

### 5. Washington, District of Columbia

The line before: Caleb Cross: Where do you come from?

The line (a reply you could pick): **Alex Moseley: Here in Washington. Have you talked to Omar Dean?**

| #   | Axis               | Another way to say it                                              | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | I'm from Washington. Have you talked to Omar Dean?                 |                             |        |
| 2   | word choice        | I grew up in Washington. Have you talked to Omar Dean?             |                             |        |
| 3   | sentence structure | And you? Have you talked to Omar Dean?                             |                             |        |
| 4   | length             | I was born and raised in Washington. Have you talked to Omar Dean? |                             |        |

### 6. Washington, District of Columbia

The line before: Abigail Murray: Not at the moment.

The line: **Alex Moseley: Oh, okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | formality          | Oh.                     |                             |        |
| 2   | word choice        | Okay.                   |                             |        |
| 3   | sentence structure | Oh, really?             |                             |        |
| 4   | length             | I'm sorry to hear that. |                             |        |

### 7. Washington, District of Columbia

The line before: (the talk opens)

The line: **Chad Moseley: Hello, Alex.**

| #   | Axis               | Another way to say it  | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------- | --------------------------- | ------ |
| 1   | formality          | Hey, Alex.             |                             |        |
| 2   | word choice        | Hello.                 |                             |        |
| 3   | sentence structure | How are things going?  |                             |        |
| 4   | length             | Good to see you, Alex. |                             |        |

### 8. Washington, District of Columbia

The line before: Chad Moseley: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Oh. Have you heard from Kyle Moseley?**

| #   | Axis               | Another way to say it                                     | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. Have you heard from Kyle Moseley?               |                             |        |
| 2   | word choice        | Oh, no. Have you heard from Kyle Moseley?                 |                             |        |
| 3   | sentence structure | Oh, really? Have you heard from Kyle Moseley?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you heard from Kyle Moseley? |                             |        |

### 9. Washington, District of Columbia

The line before: (the talk opens)

The line: **Camila Murray: Hi.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Good afternoon.       |                             |        |
| 2   | word choice        | Hi there.             |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good to see you.      |                             |        |

### 10. Washington, District of Columbia

The line before: Chad Moseley: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Sorry to hear that.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | formality          | I'm sorry to hear that. |                             |        |
| 2   | word choice        | Oh, no.                 |                             |        |
| 3   | sentence structure | Oh, really?             |                             |        |
| 4   | length             | Okay.                   |                             |        |

### 11. Washington, District of Columbia

The line before: (the talk opens)

The line: **Kennedy Chavez: Hey, Alex.**

| #   | Axis               | Another way to say it  | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------- | --------------------------- | ------ |
| 1   | formality          | Hello, Alex.           |                             |        |
| 2   | word choice        | Hey.                   |                             |        |
| 3   | sentence structure | How are things going?  |                             |        |
| 4   | length             | Good to see you, Alex. |                             |        |

### 12. Washington, District of Columbia

The line before: Abigail Murray: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Sure. How is Kyle Moseley?**

| #   | Axis               | Another way to say it                        | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. How is Kyle Moseley?                     |                             |        |
| 2   | word choice        | Okay. How is Kyle Moseley?                   |                             |        |
| 3   | sentence structure | Oh, really? How is Kyle Moseley?             |                             |        |
| 4   | length             | I'm sorry to hear that. How is Kyle Moseley? |                             |        |

### 13. Washington, District of Columbia

The line before: Abigail Murray: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Okay. How's Teresa Murray doing?**

| #   | Axis               | Another way to say it                              | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. How's Teresa Murray doing?                     |                             |        |
| 2   | word choice        | Oh, okay. How's Teresa Murray doing?               |                             |        |
| 3   | sentence structure | Oh, really? How's Teresa Murray doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Teresa Murray doing? |                             |        |

### 14. Washington, District of Columbia

The line before: Camila Murray: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Sorry to hear that.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | formality          | I'm sorry to hear that. |                             |        |
| 2   | word choice        | Oh, no.                 |                             |        |
| 3   | sentence structure | Oh, really?             |                             |        |
| 4   | length             | Okay.                   |                             |        |

### 15. Washington, District of Columbia

The line before: Caleb Cross: Not right now.

The line (a reply you could pick): **Alex Moseley: Right. How is Kennedy Chavez?**

| #   | Axis               | Another way to say it                          | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Okay. How is Kennedy Chavez?                   |                             |        |
| 2   | word choice        | Oh. How is Kennedy Chavez?                     |                             |        |
| 3   | sentence structure | Oh, really? How is Kennedy Chavez?             |                             |        |
| 4   | length             | I'm sorry to hear that. How is Kennedy Chavez? |                             |        |

### 16. Washington, District of Columbia

The line before: Chad Moseley: How's Kyle doing?

The line (a reply you could pick): **Alex Moseley: No. Have you talked to Skyler?**

| #   | Axis               | Another way to say it                           | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't. Have you talked to Skyler?       |                             |        |
| 2   | word choice        | Not recently. Have you talked to Skyler?        |                             |        |
| 3   | sentence structure | Have you? Have you talked to Skyler?            |                             |        |
| 4   | length             | Not for a long time. Have you talked to Skyler? |                             |        |

### 17. Washington, District of Columbia

The line before: Caleb Cross: Not right now.

The line (a reply you could pick): **Alex Moseley: Right. How's Omar Dean doing?**

| #   | Axis               | Another way to say it                          | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Okay. How's Omar Dean doing?                   |                             |        |
| 2   | word choice        | Oh. How's Omar Dean doing?                     |                             |        |
| 3   | sentence structure | Oh, really? How's Omar Dean doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Omar Dean doing? |                             |        |

### 18. Washington, District of Columbia

The line before: George Rhodes: Where do you come from?

The line (a reply you could pick): **Alex Moseley: I was born in Washington.**

| #   | Axis               | Another way to say it                | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------ | --------------------------- | ------ |
| 1   | formality          | I'm from Washington.                 |                             |        |
| 2   | word choice        | I was born and raised in Washington. |                             |        |
| 3   | sentence structure | How about you?                       |                             |        |
| 4   | length             | Right here.                          |                             |        |

### 19. Washington, District of Columbia

The line before: Camila Murray: Not at the moment.

The line (a reply you could pick): **Alex Moseley: Okay. Have you talked to Cedric?**

| #   | Axis               | Another way to say it                              | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. Have you talked to Cedric?                     |                             |        |
| 2   | word choice        | Oh, okay. Have you talked to Cedric?               |                             |        |
| 3   | sentence structure | Oh, really? Have you talked to Cedric?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you talked to Cedric? |                             |        |

### 20. Bell, Florida

The line before: Paige Fernandez: Not right now.

The line (a reply you could pick): **Austin Pace: Sure. Have you talked to Jenna?**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. Have you talked to Jenna?           |                             |        |
| 2   | formality          | Oh. Have you talked to Jenna?                     |                             |        |
| 3   | word choice        | Okay. Have you talked to Jenna?                   |                             |        |
| 4   | sentence structure | Oh, really? Have you talked to Jenna?             |                             |        |
| 5   | length             | I'm sorry to hear that. Have you talked to Jenna? |                             |        |

### 21. Bell, Florida

The line before: Emily McGuire: Not right now.

The line (a reply you could pick): **Austin Pace: Okay. How's Jordan?**

| #   | Axis               | Another way to say it                 | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. How's Jordan?           |                             |        |
| 2   | formality          | Oh. How's Jordan?                     |                             |        |
| 3   | word choice        | Oh, okay. How's Jordan?               |                             |        |
| 4   | sentence structure | Oh, really? How's Jordan?             |                             |        |
| 5   | length             | I'm sorry to hear that. How's Jordan? |                             |        |

### 22. Bell, Florida

The line before: Rachel Conway: Not right now.

The line (a reply you could pick): **Austin Pace: Okay. Have you seen Amos Cox?**

| #   | Axis               | Another way to say it                           | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. Have you seen Amos Cox?           |                             |        |
| 2   | formality          | Oh. Have you seen Amos Cox?                     |                             |        |
| 3   | word choice        | Oh, okay. Have you seen Amos Cox?               |                             |        |
| 4   | sentence structure | Oh, really? Have you seen Amos Cox?             |                             |        |
| 5   | length             | I'm sorry to hear that. Have you seen Amos Cox? |                             |        |

### 23. Bell, Florida

The line before: Paige Fernandez: Not right now.

The line (a reply you could pick): **Austin Pace: Oh, okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Oh.                     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 24. Bell, Florida

The line before: Emily McGuire: Not right now.

The line (a reply you could pick): **Austin Pace: Sure. How is Amos Cox?**

| #   | Axis               | Another way to say it                    | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. How is Amos Cox?           |                             |        |
| 2   | formality          | Oh. How is Amos Cox?                     |                             |        |
| 3   | word choice        | Okay. How is Amos Cox?                   |                             |        |
| 4   | sentence structure | Oh, really? How is Amos Cox?             |                             |        |
| 5   | length             | I'm sorry to hear that. How is Amos Cox? |                             |        |

### 25. Bell, Florida

The line before: Emily McGuire: Not right now.

The line (a reply you could pick): **Austin Pace: Oh, okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Oh.                     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 26. Bell, Florida

The line before: Justin Mack: Not at the moment.

The line (a reply you could pick): **Austin Pace: I'm sorry.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Sorry to hear that.     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 27. Bell, Florida

The line before: Emily McGuire: Have you seen Jenna?

The line (a reply you could pick): **Austin Pace: Not recently.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Nope.                 |                             |        |
| 2   | word choice        | No.                   |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 28. Bell, Florida

The line before: Lori Black: Where are you from?

The line: **Austin Pace: I grew up in Bell.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Bell.        |                             |        |
| 2   | word choice        | I grew up here.       |                             |        |
| 3   | sentence structure | How about you?        |                             |        |
| 4   | length             | Right here.           |                             |        |

### 29. Bell, Florida

The line before: (the talk opens)

The line: **Rachel Conway: Good to see you, Austin.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | It's good to see you. |                             |        |
| 2   | word choice        | Nice to see you.      |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good afternoon.       |                             |        |

### 30. Bell, Florida

The line before: Paige Fernandez: Not right now.

The line: **Austin Pace: Right. Have you heard from Emily McGuire?**

| #   | Axis               | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Okay. Have you heard from Emily McGuire?                   |                             |        |
| 2   | word choice        | Oh. Have you heard from Emily McGuire?                     |                             |        |
| 3   | sentence structure | Oh, really? Have you heard from Emily McGuire?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you heard from Emily McGuire? |                             |        |

### 31. Bell, Florida

The line before: Kimberly Rowland: Not right now.

The line: **Austin Pace: I see.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | formality          | Okay.                   |                             |        |
| 2   | word choice        | Oh, I see.              |                             |        |
| 3   | sentence structure | Oh, really?             |                             |        |
| 4   | length             | I'm sorry to hear that. |                             |        |

### 32. Bell, Florida

The line before: Rosa Figueroa: Where are you from?

The line (a reply you could pick): **Austin Pace: Here in Bell. Where did you go to school?**

| #   | Axis               | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Bell. Where did you go to school?                 |                             |        |
| 2   | word choice        | I grew up in Bell. Where did you go to school?             |                             |        |
| 3   | sentence structure | And you? Where did you go to school?                       |                             |        |
| 4   | length             | I was born and raised in Bell. Where did you go to school? |                             |        |

### 33. Bell, Florida

The line before: Rachel Conway: Not right now.

The line (a reply you could pick): **Austin Pace: Right. How's Paige?**

| #   | Axis               | Another way to say it                | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------ | --------------------------- | ------ |
| 1   | formality          | Okay. How's Paige?                   |                             |        |
| 2   | word choice        | Oh. How's Paige?                     |                             |        |
| 3   | sentence structure | Oh, really? How's Paige?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Paige? |                             |        |

### 34. Bell, Florida

The line before: Justin Mack: Not at the moment.

The line (a reply you could pick): **Austin Pace: Oh. How is Rachel Conway doing?**

| #   | Axis               | Another way to say it                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. How is Rachel Conway doing?               |                             |        |
| 2   | word choice        | Oh, no. How is Rachel Conway doing?                 |                             |        |
| 3   | sentence structure | Oh, really? How is Rachel Conway doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How is Rachel Conway doing? |                             |        |

### 35. Bell, Florida

The line before: Paige Fernandez: How's Amos Cox doing?

The line (a reply you could pick): **Austin Pace: No. Have you seen Jenna?**

| #   | Axis               | Another way to say it                     | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't. Have you seen Jenna?       |                             |        |
| 2   | word choice        | Not recently. Have you seen Jenna?        |                             |        |
| 3   | sentence structure | Have you? Have you seen Jenna?            |                             |        |
| 4   | length             | Not for a long time. Have you seen Jenna? |                             |        |

### 36. Bell, Florida

The line before: Emily McGuire: Have you seen Jenna?

The line (a reply you could pick): **Austin Pace: No. How is Devon Dalton doing?**

| #   | Axis               | Another way to say it                           | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't. How is Devon Dalton doing?       |                             |        |
| 2   | word choice        | Not recently. How is Devon Dalton doing?        |                             |        |
| 3   | sentence structure | Have you? How is Devon Dalton doing?            |                             |        |
| 4   | length             | Not for a long time. How is Devon Dalton doing? |                             |        |

### 37. Bell, Florida

The line before: Emily McGuire: Not right now.

The line: **Austin Pace: Oh. Have you seen Paige?**

| #   | Axis               | Another way to say it                        | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. Have you seen Paige?               |                             |        |
| 2   | word choice        | Oh, no. Have you seen Paige?                 |                             |        |
| 3   | sentence structure | Oh, really? Have you seen Paige?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you seen Paige? |                             |        |

### 38. Bell, Florida

The line before: Kimberly Rowland: Where do you come from?

The line: **Austin Pace: Right here in Bell. Where are you working now?**

| #   | Axis               | Another way to say it                                     | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Bell. Where are you working now?                 |                             |        |
| 2   | word choice        | Right here. Where are you working now?                    |                             |        |
| 3   | sentence structure | And you? Where are you working now?                       |                             |        |
| 4   | length             | I was born and raised in Bell. Where are you working now? |                             |        |

### 39. Bell, Florida

The line before: Samantha Stewart: Where are you from?

The line (a reply you could pick): **Austin Pace: Here in Bell. Where are you working now?**

| #   | Axis               | Another way to say it                                     | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Bell. Where are you working now?                 |                             |        |
| 2   | word choice        | I grew up in Bell. Where are you working now?             |                             |        |
| 3   | sentence structure | And you? Where are you working now?                       |                             |        |
| 4   | length             | I was born and raised in Bell. Where are you working now? |                             |        |

### 40. Palmer Lake, Colorado

The line before: Hannah Shaffer: Not at the moment.

The line (a reply you could pick): **Deborah Hall: Okay. How is Diana Hall doing?**

| #   | Axis               | Another way to say it                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------ | --------------------------- | ------ |
| 1   | personality fit    | That's great. How is Diana Hall doing?           |                             |        |
| 2   | formality          | Oh. How is Diana Hall doing?                     |                             |        |
| 3   | word choice        | Oh, okay. How is Diana Hall doing?               |                             |        |
| 4   | sentence structure | Oh, really? How is Diana Hall doing?             |                             |        |
| 5   | length             | I'm sorry to hear that. How is Diana Hall doing? |                             |        |

### 41. Palmer Lake, Colorado

The line before: Brandon Le: Not at the moment.

The line (a reply you could pick): **Deborah Hall: I'm sorry.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Sorry to hear that.     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 42. Palmer Lake, Colorado

The line before: Ashley Gordon: Not right now.

The line (a reply you could pick): **Deborah Hall: Okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Oh.                     |                             |        |
| 3   | word choice        | Oh, okay.               |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 43. Palmer Lake, Colorado

The line before: Megan Reyes: Not at the moment.

The line: **Deborah Hall: Oh, okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Oh.                     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 44. Palmer Lake, Colorado

The line before: Hannah Shaffer: Not at the moment.

The line (a reply you could pick): **Deborah Hall: Sure. Have you talked to Kyle Hall?**

| #   | Axis               | Another way to say it                                 | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. Have you talked to Kyle Hall?           |                             |        |
| 2   | formality          | Oh. Have you talked to Kyle Hall?                     |                             |        |
| 3   | word choice        | Okay. Have you talked to Kyle Hall?                   |                             |        |
| 4   | sentence structure | Oh, really? Have you talked to Kyle Hall?             |                             |        |
| 5   | length             | I'm sorry to hear that. Have you talked to Kyle Hall? |                             |        |

### 45. Palmer Lake, Colorado

The line before: Adam Pickett: Not at the moment.

The line (a reply you could pick): **Deborah Hall: Sure. How is Mila Russo?**

| #   | Axis               | Another way to say it                      | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------ | --------------------------- | ------ |
| 1   | personality fit    | That's great. How is Mila Russo?           |                             |        |
| 2   | formality          | Oh. How is Mila Russo?                     |                             |        |
| 3   | word choice        | Okay. How is Mila Russo?                   |                             |        |
| 4   | sentence structure | Oh, really? How is Mila Russo?             |                             |        |
| 5   | length             | I'm sorry to hear that. How is Mila Russo? |                             |        |

### 46. Palmer Lake, Colorado

The line before: (the talk opens)

The line: **Lisa Hall: Hey, Deborah.**

| #   | Axis               | Another way to say it     | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------- | --------------------------- | ------ |
| 1   | formality          | Hello, Deborah.           |                             |        |
| 2   | word choice        | Hey.                      |                             |        |
| 3   | sentence structure | How are things going?     |                             |        |
| 4   | length             | Good to see you, Deborah. |                             |        |

### 47. Palmer Lake, Colorado

The line before: (the talk opens)

The line: **Hannah Shaffer: Good to see you.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | It's good to see you. |                             |        |
| 2   | word choice        | Nice to see you.      |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Hello.                |                             |        |

### 48. Palmer Lake, Colorado

The line before: Tristan McConnell: How is Mila Russo?

The line: **Deborah Hall: No. How is Alyssa Akhtar doing?**

| #   | Axis               | Another way to say it                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | No, I haven't. How is Alyssa Akhtar doing?       |                             |        |
| 2   | word choice        | Not recently. How is Alyssa Akhtar doing?        |                             |        |
| 3   | sentence structure | Have you? How is Alyssa Akhtar doing?            |                             |        |
| 4   | length             | Not for a long time. How is Alyssa Akhtar doing? |                             |        |

### 49. Palmer Lake, Colorado

The line before: Felix Warner: Not right now.

The line (a reply you could pick): **Deborah Hall: I'm sorry to hear that.**

| #   | Axis               | Another way to say it              | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------- | --------------------------- | ------ |
| 1   | formality          | Sorry to hear that.                |                             |        |
| 2   | word choice        | That's too bad.                    |                             |        |
| 3   | sentence structure | How long have you been doing that? |                             |        |
| 4   | length             | I'm sorry.                         |                             |        |

### 50. Palmer Lake, Colorado

The line before: Brandon Le: Where are you from?

The line: **Deborah Hall: Here in Palmer Lake. What do you do now?**

| #   | Axis               | Another way to say it                                     | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Palmer Lake. What do you do now?                 |                             |        |
| 2   | word choice        | I grew up in Palmer Lake. What do you do now?             |                             |        |
| 3   | sentence structure | And you? What do you do now?                              |                             |        |
| 4   | length             | I was born and raised in Palmer Lake. What do you do now? |                             |        |

### 51. Palmer Lake, Colorado

The line before: Taylor Hamilton: Not at the moment.

The line (a reply you could pick): **Deborah Hall: I'm sorry to hear that.**

| #   | Axis               | Another way to say it              | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------- | --------------------------- | ------ |
| 1   | formality          | Sorry to hear that.                |                             |        |
| 2   | word choice        | That's too bad.                    |                             |        |
| 3   | sentence structure | How long have you been doing that? |                             |        |
| 4   | length             | I'm sorry.                         |                             |        |

### 52. Palmer Lake, Colorado

The line before: Ashley Gordon: Where are you from?

The line: **Deborah Hall: I was born in Palmer Lake.**

| #   | Axis               | Another way to say it     | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Palmer Lake.     |                             |        |
| 2   | word choice        | I grew up in Palmer Lake. |                             |        |
| 3   | sentence structure | Where do you live?        |                             |        |
| 4   | length             | Right here.               |                             |        |

### 53. Palmer Lake, Colorado

The line before: Megan Reyes: How is Alyssa Akhtar?

The line (a reply you could pick): **Deborah Hall: No. Have you talked to Tristan McConnell?**

| #   | Axis               | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't. Have you talked to Tristan McConnell?       |                             |        |
| 2   | word choice        | Not recently. Have you talked to Tristan McConnell?        |                             |        |
| 3   | sentence structure | Have you? Have you talked to Tristan McConnell?            |                             |        |
| 4   | length             | Not for a long time. Have you talked to Tristan McConnell? |                             |        |

### 54. Palmer Lake, Colorado

The line before: Megan Reyes: Where do you come from?

The line (a reply you could pick): **Deborah Hall: Right here in Palmer Lake. How is Eva Ortiz doing?**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Palmer Lake. How is Eva Ortiz doing?     |                             |        |
| 2   | word choice        | I grew up in Palmer Lake. How is Eva Ortiz doing? |                             |        |
| 3   | sentence structure | How about you? How is Eva Ortiz doing?            |                             |        |
| 4   | length             | Right here. How is Eva Ortiz doing?               |                             |        |

### 55. Palmer Lake, Colorado

The line before: Lisa Hall: Not at the moment.

The line (a reply you could pick): **Deborah Hall: Right. How is Diana Hall doing?**

| #   | Axis               | Another way to say it                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | Okay. How is Diana Hall doing?                   |                             |        |
| 2   | word choice        | Oh. How is Diana Hall doing?                     |                             |        |
| 3   | sentence structure | Oh, really? How is Diana Hall doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How is Diana Hall doing? |                             |        |

### 56. Palmer Lake, Colorado

The line before: Eva Ortiz: Where are you from?

The line (a reply you could pick): **Deborah Hall: Here in Palmer Lake. How is Megan Reyes doing?**

| #   | Axis               | Another way to say it                                           | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Palmer Lake. How is Megan Reyes doing?                 |                             |        |
| 2   | word choice        | I grew up in Palmer Lake. How is Megan Reyes doing?             |                             |        |
| 3   | sentence structure | And you? How is Megan Reyes doing?                              |                             |        |
| 4   | length             | I was born and raised in Palmer Lake. How is Megan Reyes doing? |                             |        |

### 57. Palmer Lake, Colorado

The line before: Taylor Hamilton: How's Mila Russo doing?

The line (a reply you could pick): **Deborah Hall: I haven't.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Not recently.         |                             |        |
| 2   | word choice        | No, I haven't.        |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 58. Palmer Lake, Colorado

The line before: (the talk opens)

The line: **Eva Ortiz: It's good to see you.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Good to see you.      |                             |        |
| 2   | word choice        | It's nice to see you. |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good afternoon.       |                             |        |

### 59. Palmer Lake, Colorado

The line before: Megan Reyes: Have you talked to Mila Russo?

The line: **Deborah Hall: Not recently.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Nope.                 |                             |        |
| 2   | word choice        | No.                   |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 60. North Clarendon, Vermont

The line before: Anthony Brooks: Not at the moment.

The line (a reply you could pick): **Megan Wallace: Okay. How's David doing?**

| #   | Axis               | Another way to say it                      | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------ | --------------------------- | ------ |
| 1   | personality fit    | That's great. How's David doing?           |                             |        |
| 2   | formality          | Oh. How's David doing?                     |                             |        |
| 3   | word choice        | Oh, okay. How's David doing?               |                             |        |
| 4   | sentence structure | Oh, really? How's David doing?             |                             |        |
| 5   | length             | I'm sorry to hear that. How's David doing? |                             |        |

### 61. North Clarendon, Vermont

The line before: Daniel Wallace: Not right now.

The line (a reply you could pick): **Megan Wallace: Okay. How's Sharon?**

| #   | Axis               | Another way to say it                 | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. How's Sharon?           |                             |        |
| 2   | formality          | Oh. How's Sharon?                     |                             |        |
| 3   | word choice        | Oh, okay. How's Sharon?               |                             |        |
| 4   | sentence structure | Oh, really? How's Sharon?             |                             |        |
| 5   | length             | I'm sorry to hear that. How's Sharon? |                             |        |

### 62. North Clarendon, Vermont

The line before: Mary Dawson: Not right now.

The line: **Megan Wallace: Oh, okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Oh.                     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 63. North Clarendon, Vermont

The line before: Anthony Brooks: Not at the moment.

The line (a reply you could pick): **Megan Wallace: Sure. Have you talked to Luke?**

| #   | Axis               | Another way to say it                            | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------ | --------------------------- | ------ |
| 1   | personality fit    | That's great. Have you talked to Luke?           |                             |        |
| 2   | formality          | Oh. Have you talked to Luke?                     |                             |        |
| 3   | word choice        | Okay. Have you talked to Luke?                   |                             |        |
| 4   | sentence structure | Oh, really? Have you talked to Luke?             |                             |        |
| 5   | length             | I'm sorry to hear that. Have you talked to Luke? |                             |        |

### 64. North Clarendon, Vermont

The line before: Danny Pace: Not at the moment.

The line: **Megan Wallace: I'm sorry.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Sorry to hear that.     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 65. North Clarendon, Vermont

The line before: Daniel Wallace: Not right now.

The line (a reply you could pick): **Megan Wallace: Sure. Have you seen Mary Wallace?**

| #   | Axis               | Another way to say it                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great. Have you seen Mary Wallace?           |                             |        |
| 2   | formality          | Oh. Have you seen Mary Wallace?                     |                             |        |
| 3   | word choice        | Okay. Have you seen Mary Wallace?                   |                             |        |
| 4   | sentence structure | Oh, really? Have you seen Mary Wallace?             |                             |        |
| 5   | length             | I'm sorry to hear that. Have you seen Mary Wallace? |                             |        |

### 66. North Clarendon, Vermont

The line before: Anthony Brooks: Not at the moment.

The line (a reply you could pick): **Megan Wallace: Oh, okay.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | personality fit    | That's great.           |                             |        |
| 2   | formality          | Oh.                     |                             |        |
| 3   | word choice        | Okay.                   |                             |        |
| 4   | sentence structure | Oh, really?             |                             |        |
| 5   | length             | I'm sorry to hear that. |                             |        |

### 67. North Clarendon, Vermont

The line before: (the talk opens)

The line: **Danny Pace: Good to see you.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | It's good to see you. |                             |        |
| 2   | word choice        | Nice to see you.      |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Hello.                |                             |        |

### 68. North Clarendon, Vermont

The line before: Danny Pace: Where do you come from?

The line (a reply you could pick): **Megan Wallace: Right here in North Clarendon. Have you seen Ella?**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from North Clarendon. Have you seen Ella?     |                             |        |
| 2   | word choice        | I grew up in North Clarendon. Have you seen Ella? |                             |        |
| 3   | sentence structure | How about you? Have you seen Ella?                |                             |        |
| 4   | length             | Right here. Have you seen Ella?                   |                             |        |

### 69. North Clarendon, Vermont

The line before: Daniel Wallace: Not right now.

The line (a reply you could pick): **Megan Wallace: Oh. Have you talked to Marcus?**

| #   | Axis               | Another way to say it                              | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. Have you talked to Marcus?               |                             |        |
| 2   | word choice        | Oh, no. Have you talked to Marcus?                 |                             |        |
| 3   | sentence structure | Oh, really? Have you talked to Marcus?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you talked to Marcus? |                             |        |

### 70. North Clarendon, Vermont

The line before: Anthony Brooks: Where are you from?

The line (a reply you could pick): **Megan Wallace: Here in North Clarendon. Have you heard from Luke Savage?**

| #   | Axis               | Another way to say it                                                      | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from North Clarendon. Have you heard from Luke Savage?                 |                             |        |
| 2   | word choice        | I grew up in North Clarendon. Have you heard from Luke Savage?             |                             |        |
| 3   | sentence structure | And you? Have you heard from Luke Savage?                                  |                             |        |
| 4   | length             | I was born and raised in North Clarendon. Have you heard from Luke Savage? |                             |        |

### 71. North Clarendon, Vermont

The line before: Crystal Terry: I'm working for Trevino General Store.

The line (a reply you could pick): **Megan Wallace: Oh. Have you seen Gavin Stein?**

| #   | Axis               | Another way to say it                              | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. Have you seen Gavin Stein?               |                             |        |
| 2   | word choice        | Oh, no. Have you seen Gavin Stein?                 |                             |        |
| 3   | sentence structure | Oh, really? Have you seen Gavin Stein?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you seen Gavin Stein? |                             |        |

### 72. North Clarendon, Vermont

The line before: (the talk opens)

The line: **Daniel Wallace: Good to see you, Megan.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | It's good to see you. |                             |        |
| 2   | word choice        | Nice to see you.      |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good afternoon.       |                             |        |

### 73. North Clarendon, Vermont

The line before: Crystal Terry: I'm working for Trevino General Store.

The line (a reply you could pick): **Megan Wallace: Right. How's Luke doing?**

| #   | Axis               | Another way to say it                     | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Okay. How's Luke doing?                   |                             |        |
| 2   | word choice        | Oh. How's Luke doing?                     |                             |        |
| 3   | sentence structure | Oh, really? How's Luke doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Luke doing? |                             |        |

### 74. North Clarendon, Vermont

The line before: Amara Stuart: Oh.

The line: **Amara Stuart: Take care.**

| #   | Axis            | Another way to say it   | Grade the line on this axis | Better |
| --- | --------------- | ----------------------- | --------------------------- | ------ |
| 1   | personality fit | Have a nice day.        |                             |        |
| 2   | formality       | I'll see you.           |                             |        |
| 3   | word choice     | Take care of yourself.  |                             |        |
| 4   | length          | I'll talk to you later. |                             |        |

### 75. North Clarendon, Vermont

The line before: (the talk opens)

The line: **Ella Wallace: Hi.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Good afternoon.       |                             |        |
| 2   | word choice        | Hi there.             |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good to see you.      |                             |        |

### 76. North Clarendon, Vermont

The line before: Amara Stuart: Where do you come from?

The line (a reply you could pick): **Megan Wallace: Here in North Clarendon. What do you do now?**

| #   | Axis               | Another way to say it                                         | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from North Clarendon. What do you do now?                 |                             |        |
| 2   | word choice        | I grew up in North Clarendon. What do you do now?             |                             |        |
| 3   | sentence structure | And you? What do you do now?                                  |                             |        |
| 4   | length             | I was born and raised in North Clarendon. What do you do now? |                             |        |

### 77. North Clarendon, Vermont

The line before: Ella Wallace: Where are you from?

The line (a reply you could pick): **Megan Wallace: Right here in North Clarendon. What do you do now?**

| #   | Axis               | Another way to say it                             | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from North Clarendon. What do you do now?     |                             |        |
| 2   | word choice        | I grew up in North Clarendon. What do you do now? |                             |        |
| 3   | sentence structure | How about you? What do you do now?                |                             |        |
| 4   | length             | Right here. What do you do now?                   |                             |        |

### 78. North Clarendon, Vermont

The line before: (the talk opens)

The line: **Anthony Brooks: Hello there.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Hi there.             |                             |        |
| 2   | word choice        | Hello.                |                             |        |
| 3   | sentence structure | How are things going? |                             |        |
| 4   | length             | It's good to see you. |                             |        |

### 79. North Clarendon, Vermont

The line before: Evan Sheppard: Not at the moment.

The line (a reply you could pick): **Megan Wallace: I'm sorry to hear that.**

| #   | Axis               | Another way to say it              | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------- | --------------------------- | ------ |
| 1   | formality          | Sorry to hear that.                |                             |        |
| 2   | word choice        | That's too bad.                    |                             |        |
| 3   | sentence structure | How long have you been doing that? |                             |        |
| 4   | length             | I'm sorry.                         |                             |        |

### 80. Forkland, Alabama

The line before: Amos Sawyer: Not at the moment.

The line: **Sebastian Simpson: Oh, no.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay.               |                             |        |
| 2   | word choice        | Oh.                     |                             |        |
| 3   | sentence structure | Oh, really?             |                             |        |
| 4   | length             | I'm sorry to hear that. |                             |        |

### 81. Forkland, Alabama

The line before: Mara Shelton: Where do you come from?

The line (a reply you could pick): **Sebastian Simpson: Here in Forkland. Where are you working now?**

| #   | Axis               | Another way to say it                                         | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Forkland. Where are you working now?                 |                             |        |
| 2   | word choice        | I grew up in Forkland. Where are you working now?             |                             |        |
| 3   | sentence structure | And you? Where are you working now?                           |                             |        |
| 4   | length             | I was born and raised in Forkland. Where are you working now? |                             |        |

### 82. Forkland, Alabama

The line before: Isabella Barnett: Not right now.

The line (a reply you could pick): **Sebastian Simpson: Okay. Have you seen Dakota?**

| #   | Axis               | Another way to say it                         | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. Have you seen Dakota?                     |                             |        |
| 2   | word choice        | Oh, okay. Have you seen Dakota?               |                             |        |
| 3   | sentence structure | Oh, really? Have you seen Dakota?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you seen Dakota? |                             |        |

### 83. Forkland, Alabama

The line before: Mara Shelton: How is Kaitlyn Keller?

The line (a reply you could pick): **Sebastian Simpson: No. How's Reese Sweeney doing?**

| #   | Axis               | Another way to say it                           | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | No, I haven't. How's Reese Sweeney doing?       |                             |        |
| 2   | word choice        | Not recently. How's Reese Sweeney doing?        |                             |        |
| 3   | sentence structure | Have you? How's Reese Sweeney doing?            |                             |        |
| 4   | length             | Not for a long time. How's Reese Sweeney doing? |                             |        |

### 84. Forkland, Alabama

The line before: Mara Shelton: How's Anna Page?

The line (a reply you could pick): **Sebastian Simpson: Nope. How is Jordan Newman?**

| #   | Axis               | Another way to say it                      | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------ | --------------------------- | ------ |
| 1   | formality          | Not recently. How is Jordan Newman?        |                             |        |
| 2   | word choice        | I haven't. How is Jordan Newman?           |                             |        |
| 3   | sentence structure | Have you? How is Jordan Newman?            |                             |        |
| 4   | length             | Not for a long time. How is Jordan Newman? |                             |        |

### 85. Forkland, Alabama

The line before: Madison Simpson: Not right now.

The line: **Sebastian Simpson: Right. How's Zachary?**

| #   | Axis               | Another way to say it                  | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Okay. How's Zachary?                   |                             |        |
| 2   | word choice        | Oh. How's Zachary?                     |                             |        |
| 3   | sentence structure | Oh, really? How's Zachary?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Zachary? |                             |        |

### 86. Forkland, Alabama

The line before: (the talk opens)

The line: **Keith Harrell: Hi.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Good afternoon.       |                             |        |
| 2   | word choice        | Hi there.             |                             |        |
| 3   | sentence structure | How are you?          |                             |        |
| 4   | length             | Good to see you.      |                             |        |

### 87. Forkland, Alabama

The line before: Isabella Barnett: Not right now.

The line (a reply you could pick): **Sebastian Simpson: Right. Have you talked to Claire Green?**

| #   | Axis               | Another way to say it                                    | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Okay. Have you talked to Claire Green?                   |                             |        |
| 2   | word choice        | Oh. Have you talked to Claire Green?                     |                             |        |
| 3   | sentence structure | Oh, really? Have you talked to Claire Green?             |                             |        |
| 4   | length             | I'm sorry to hear that. Have you talked to Claire Green? |                             |        |

### 88. Forkland, Alabama

The line before: Mara Shelton: How's Anna Page?

The line (a reply you could pick): **Sebastian Simpson: Not recently.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Nope.                 |                             |        |
| 2   | word choice        | No.                   |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 89. Forkland, Alabama

The line before: David Wynn: Not at the moment.

The line (a reply you could pick): **Sebastian Simpson: Sure. Where did you go to school?**

| #   | Axis               | Another way to say it                               | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. Where did you go to school?                     |                             |        |
| 2   | word choice        | Okay. Where did you go to school?                   |                             |        |
| 3   | sentence structure | Oh, really? Where did you go to school?             |                             |        |
| 4   | length             | I'm sorry to hear that. Where did you go to school? |                             |        |

### 90. Forkland, Alabama

The line before: Mara Shelton: How's Dakota?

The line (a reply you could pick): **Sebastian Simpson: I haven't.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | Not recently.         |                             |        |
| 2   | word choice        | No, I haven't.        |                             |        |
| 3   | sentence structure | Have you?             |                             |        |
| 4   | length             | Not for a long time.  |                             |        |

### 91. Forkland, Alabama

The line before: Mara Shelton: How's Anna Page?

The line (a reply you could pick): **Sebastian Simpson: Nope. What are you doing now?**

| #   | Axis               | Another way to say it                        | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Not recently. What are you doing now?        |                             |        |
| 2   | word choice        | I haven't. What are you doing now?           |                             |        |
| 3   | sentence structure | Have you? What are you doing now?            |                             |        |
| 4   | length             | Not for a long time. What are you doing now? |                             |        |

### 92. Forkland, Alabama

The line before: (the talk opens)

The line: **Madison Simpson: Hello, Sebastian.**

| #   | Axis               | Another way to say it       | Grade the line on this axis | Better |
| --- | ------------------ | --------------------------- | --------------------------- | ------ |
| 1   | formality          | Hey, Sebastian.             |                             |        |
| 2   | word choice        | Hello.                      |                             |        |
| 3   | sentence structure | How are things going?       |                             |        |
| 4   | length             | Good to see you, Sebastian. |                             |        |

### 93. Forkland, Alabama

The line before: Isabella Barnett: Where do you come from?

The line (a reply you could pick): **Sebastian Simpson: Here in Forkland. What are you doing now?**

| #   | Axis               | Another way to say it                                      | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Forkland. What are you doing now?                 |                             |        |
| 2   | word choice        | I grew up in Forkland. What are you doing now?             |                             |        |
| 3   | sentence structure | And you? What are you doing now?                           |                             |        |
| 4   | length             | I was born and raised in Forkland. What are you doing now? |                             |        |

### 94. Forkland, Alabama

The line before: Pamela Mercado: Where are you from?

The line (a reply you could pick): **Sebastian Simpson: Right here in Forkland. What do you do?**

| #   | Axis               | Another way to say it                              | Grade the line on this axis | Better |
| --- | ------------------ | -------------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Forkland. What do you do?                 |                             |        |
| 2   | word choice        | Right here. What do you do?                        |                             |        |
| 3   | sentence structure | And you? What do you do?                           |                             |        |
| 4   | length             | I was born and raised in Forkland. What do you do? |                             |        |

### 95. Forkland, Alabama

The line before: Madison Simpson: Not right now.

The line (a reply you could pick): **Sebastian Simpson: Okay. How's Nathan doing?**

| #   | Axis               | Another way to say it                       | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh. How's Nathan doing?                     |                             |        |
| 2   | word choice        | Oh, okay. How's Nathan doing?               |                             |        |
| 3   | sentence structure | Oh, really? How's Nathan doing?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Nathan doing? |                             |        |

### 96. Forkland, Alabama

The line before: Isabella Barnett: Where do you come from?

The line (a reply you could pick): **Sebastian Simpson: I grew up in Forkland.**

| #   | Axis               | Another way to say it | Grade the line on this axis | Better |
| --- | ------------------ | --------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Forkland.    |                             |        |
| 2   | word choice        | I grew up here.       |                             |        |
| 3   | sentence structure | How about you?        |                             |        |
| 4   | length             | Right here.           |                             |        |

### 97. Forkland, Alabama

The line before: David Wynn: Where do you come from?

The line (a reply you could pick): **Sebastian Simpson: I was born in Forkland.**

| #   | Axis               | Another way to say it              | Grade the line on this axis | Better |
| --- | ------------------ | ---------------------------------- | --------------------------- | ------ |
| 1   | formality          | I'm from Forkland.                 |                             |        |
| 2   | word choice        | I was born and raised in Forkland. |                             |        |
| 3   | sentence structure | How about you?                     |                             |        |
| 4   | length             | Right here.                        |                             |        |

### 98. Forkland, Alabama

The line before: Isabella Barnett: Not right now.

The line: **Sebastian Simpson: I see.**

| #   | Axis               | Another way to say it   | Grade the line on this axis | Better |
| --- | ------------------ | ----------------------- | --------------------------- | ------ |
| 1   | formality          | Okay.                   |                             |        |
| 2   | word choice        | Oh, I see.              |                             |        |
| 3   | sentence structure | Oh, really?             |                             |        |
| 4   | length             | I'm sorry to hear that. |                             |        |

### 99. Forkland, Alabama

The line before: Angelina Woodard: I work for Weiss Manufacturing.

The line (a reply you could pick): **Sebastian Simpson: Oh. How's Claire Green?**

| #   | Axis               | Another way to say it                       | Grade the line on this axis | Better |
| --- | ------------------ | ------------------------------------------- | --------------------------- | ------ |
| 1   | formality          | Oh, okay. How's Claire Green?               |                             |        |
| 2   | word choice        | Oh, no. How's Claire Green?                 |                             |        |
| 3   | sentence structure | Oh, really? How's Claire Green?             |                             |        |
| 4   | length             | I'm sorry to hear that. How's Claire Green? |                             |        |
