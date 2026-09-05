# Narrative Lint — Aggregate Diagnostics

Diagnostic only. These are signals for human review, never canonical quality judgements. Counts are over the whole corpus.

| Category | Count | What it means |
|---|---:|---|
| `machine-cadence` | 220 | State-not-changing filler ('carried on', 'went on being', 'most evenings unremarkable'). |
| `repeated-adjacent` | 91 | Same sentence in two consecutive beats. |
| `repeated-run` | 76 | Same sentence in 3+ beats of one life. |
| `vague-referent` | 18 | Scenario names its stakes only as 'the thing'/'the plan'. |
| `vocative-binding` | 13 | Scene addresses a bound peer by name then says 'your' — role-binding smell. |

## `machine-cadence` — 220

- beat 1: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “The house went on being Dennis Rocha and Ibrahim Rocha, and most evenings in it were unremarkable.”
- beat 2: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 3: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “Kentucky went on as it does, and so did Michael Rocha.”
- beat 4: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “Kentucky went on as it does, and so did Michael Rocha.”
- beat 5: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “The house went on being Dennis Rocha and Ibrahim Rocha, and most evenings in it were unremarkable.”
- beat 6: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “The house went on being Dennis Rocha and Ibrahim Rocha, and most evenings in it were unremarkable.”
- beat 7: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 8: [KY · age 5 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “The house went on being Dennis Rocha and Ibrahim Rocha, and most evenings in it were unremarkable.”
- beat 1: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “The house went on being Miranda Rosario and Cora Rosario, and most evenings in it were unremarkable.”
- beat 2: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 3: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “Kentucky went on as it does, and so did Audrey Rosario.”
- beat 4: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 5: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “The house went on being Miranda Rosario and Cora Rosario, and most evenings in it were unremarkable.”
- beat 6: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “Kentucky went on as it does, and so did Audrey Rosario.”
- beat 7: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “The house went on being Miranda Rosario and Cora Rosario, and most evenings in it were unremarkable.”
- beat 8: [KY · age 8 · shares-a-home · short] Reads as state-not-changing filler rather than observation.
  - “Kentucky went on as it does, and so did Audrey Rosario.”
- beat 1: [KY · age 10 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 10 · shares-a-home · deep] Reads as state-not-changing filler rather than observation.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- …and 200 more.

## `repeated-adjacent` — 91

- beat 2: [KY · age 5 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “School carried on being the thing the week was built around.”
- beat 4: [KY · age 5 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “Kentucky went on as it does, and so did Michael Rocha.”
- beat 6: [KY · age 5 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “The house went on being Dennis Rocha and Ibrahim Rocha, and most evenings in it were unremarkable.”
- beat 2: [KY · age 8 · shares-a-home · short] Same sentence as the immediately preceding beat.
  - “School carried on being the thing the week was built around.”
- beat 8: [KY · age 8 · shares-a-home · short] Same sentence as the immediately preceding beat.
  - “A month later.”
- beat 2: [KY · age 10 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 3: [KY · age 10 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 4: [KY · age 10 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 7: [KY · age 10 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “School carried on being the thing the week was built around.”
- beat 9: [KY · age 10 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “Kentucky went on as it does, and so did Noor Perez.”
- beat 2: [KY · age 10 · shares-a-home · deep (fixed col 0)] Same sentence as the immediately preceding beat.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 3: [KY · age 10 · shares-a-home · deep (fixed col 0)] Same sentence as the immediately preceding beat.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 4: [KY · age 10 · shares-a-home · deep (fixed col 0)] Same sentence as the immediately preceding beat.
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 7: [KY · age 10 · shares-a-home · deep (fixed col 0)] Same sentence as the immediately preceding beat.
  - “School carried on being the thing the week was built around.”
- beat 9: [KY · age 10 · shares-a-home · deep (fixed col 0)] Same sentence as the immediately preceding beat.
  - “Kentucky went on as it does, and so did Noor Perez.”
- beat 2: [NE · age 10 · lives-alone · short] Same sentence as the immediately preceding beat.
  - “Arjun Marshall was in the house every evening, and most of them were unremarkable.”
- beat 5: [NE · age 10 · lives-alone · short] Same sentence as the immediately preceding beat.
  - “Nebraska went on as it does, and so did Tracy Marshall.”
- beat 6: [NE · age 10 · lives-alone · short] Same sentence as the immediately preceding beat.
  - “A month later.”
- beat 8: [NE · age 10 · lives-alone · short] Same sentence as the immediately preceding beat.
  - “School carried on being the thing the week was built around.”
- beat 2: [AK · age 12 · shares-a-home · deep] Same sentence as the immediately preceding beat.
  - “School carried on being the thing the week was built around.”
- …and 71 more.

## `repeated-run` — 76

- beat 1: [KY · age 5 · shares-a-home · deep] Appears in 3 beats (0, 1, 6).
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 5 · shares-a-home · deep] Appears in 4 beats (0, 4, 5, 7).
  - “The house went on being Dennis Rocha and Ibrahim Rocha, and most evenings in it were unremarkable.”
- beat 1: [KY · age 8 · shares-a-home · short] Appears in 3 beats (0, 1, 3).
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 8 · shares-a-home · short] Appears in 3 beats (0, 4, 6).
  - “The house went on being Miranda Rosario and Cora Rosario, and most evenings in it were unremarkable.”
- beat 2: [KY · age 8 · shares-a-home · short] Appears in 4 beats (1, 4, 6, 7).
  - “A month later.”
- beat 3: [KY · age 8 · shares-a-home · short] Appears in 3 beats (2, 5, 7).
  - “Kentucky went on as it does, and so did Audrey Rosario.”
- beat 1: [KY · age 10 · shares-a-home · deep] Appears in 3 beats (0, 5, 6).
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 10 · shares-a-home · deep] Appears in 5 beats (0, 1, 2, 3, 9).
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 5: [KY · age 10 · shares-a-home · deep] Appears in 3 beats (4, 7, 8).
  - “Kentucky went on as it does, and so did Noor Perez.”
- beat 1: [KY · age 10 · shares-a-home · deep (fixed col 0)] Appears in 3 beats (0, 5, 6).
  - “School carried on being the thing the week was built around.”
- beat 1: [KY · age 10 · shares-a-home · deep (fixed col 0)] Appears in 5 beats (0, 1, 2, 3, 9).
  - “The house went on being Deborah Perez and Keanu Perez, and most evenings in it were unremarkable.”
- beat 5: [KY · age 10 · shares-a-home · deep (fixed col 0)] Appears in 3 beats (4, 7, 8).
  - “Kentucky went on as it does, and so did Noor Perez.”
- beat 1: [NE · age 10 · lives-alone · short] Appears in 4 beats (0, 2, 6, 7).
  - “School carried on being the thing the week was built around.”
- beat 1: [NE · age 10 · lives-alone · short] Appears in 3 beats (0, 1, 5).
  - “Arjun Marshall was in the house every evening, and most of them were unremarkable.”
- beat 1: [AK · age 12 · shares-a-home · deep] Appears in 4 beats (0, 1, 4, 7).
  - “School carried on being the thing the week was built around.”
- beat 3: [AK · age 12 · shares-a-home · deep] Appears in 3 beats (2, 3, 5).
  - “Alaska went on as it does, and so did Mara Stephens.”
- beat 1: [Lexington · age 13 · shares-a-home · short] Appears in 3 beats (0, 3, 7).
  - “The house went on being Raymond Wilcox and Ramon Wilcox, and most evenings in it were unremarkable.”
- beat 3: [Lexington · age 13 · shares-a-home · short] Appears in 3 beats (2, 5, 6).
  - “Lexington, Kentucky went on as it does, and so did Philip Wilcox.”
- beat 1: [KY · age 13 · lives-alone · deep] Appears in 3 beats (0, 1, 4).
  - “Frances McMahon was in the house every evening, and most of them were unremarkable.”
- beat 1: [NE · age 16 · shares-a-home · deep] Appears in 4 beats (0, 1, 5, 8).
  - “School carried on being the thing the week was built around.”
- …and 56 more.

## `vague-referent` — 18

- beat 3: [KY · age 8 · shares-a-home · short] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 5: [KY · age 8 · shares-a-home · short] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 3: [KY · age 10 · shares-a-home · deep] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 6: [KY · age 10 · shares-a-home · deep] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 3: [KY · age 10 · shares-a-home · deep (fixed col 0)] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 6: [KY · age 10 · shares-a-home · deep (fixed col 0)] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 2: [NE · age 10 · lives-alone · short] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 3: [NE · age 10 · lives-alone · short] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 6: [NE · age 10 · lives-alone · short] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The thing that was planned for this month is not happening any more. The reason given is short, and the subject gets changed.”
- beat 3: [KY · age 10 · seed A] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 5: [KY · age 10 · seed A] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 8: [KY · age 10 · seed A] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The thing that was planned for this month is not happening any more. The reason given is short, and the subject gets changed.”
- beat 3: [KY · age 10 · seed B] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 6: [KY · age 10 · seed B] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 7: [KY · age 10 · seed C] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The thing that was planned for this month is not happening any more. The reason given is short, and the subject gets changed.”
- beat 8: [KY · age 10 · seed C] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”
- beat 3: [KY · age 10 · questionnaire skipped] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “The house needs you on the same afternoons the thing you signed up for does.”
- beat 6: [KY · age 10 · questionnaire skipped] Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.
  - “A teacher keeps you back for a minute after the others go, and offers to help with the thing you keep getting wrong.”

## `vocative-binding` — 13

- beat 1: [KY · age 5 · shares-a-home · deep] Scene opens by addressing 'Ibrahim Rocha' then says 'your' — a bound-role vocative smell.
  - “Ibrahim Rocha, your older sister has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about it”
- beat 1: [KY · age 8 · shares-a-home · short] Scene opens by addressing 'Miranda Rosario' then says 'your' — a bound-role vocative smell.
  - “Miranda Rosario, your younger sister has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything abou”
- beat 2: [KY · age 10 · shares-a-home · deep] Scene opens by addressing 'Deborah Perez' then says 'your' — a bound-role vocative smell.
  - “Deborah Perez, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about”
- beat 2: [KY · age 10 · shares-a-home · deep (fixed col 0)] Scene opens by addressing 'Deborah Perez' then says 'your' — a bound-role vocative smell.
  - “Deborah Perez, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about”
- beat 1: [AK · age 12 · shares-a-home · deep] Scene opens by addressing 'Amara Stephens' then says 'your' — a bound-role vocative smell.
  - “Amara Stephens, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything abou”
- beat 1: [Lexington · age 13 · shares-a-home · short] Scene opens by addressing 'Raymond Wilcox' then says 'your' — a bound-role vocative smell.
  - “Raymond Wilcox, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything abou”
- beat 1: [NE · age 16 · shares-a-home · deep] Scene opens by addressing 'Noah Vinson' then says 'your' — a bound-role vocative smell.
  - “Noah Vinson, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about i”
- beat 1: [AK · age 16 · shares-a-home · short] Scene opens by addressing 'Malik Pollard' then says 'your' — a bound-role vocative smell.
  - “Malik Pollard, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about”
- beat 1: [KY · age 16 · summarize-earlier · deep] Scene opens by addressing 'Logan Roberts' then says 'your' — a bound-role vocative smell.
  - “Logan Roberts, your younger sister has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about ”
- beat 1: [KY · age 10 · seed A] Scene opens by addressing 'Kian Keller' then says 'your' — a bound-role vocative smell.
  - “Kian Keller, your younger sister has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about it”
- beat 2: [KY · age 10 · seed B] Scene opens by addressing 'Bianca Turner' then says 'your' — a bound-role vocative smell.
  - “Bianca Turner, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about”
- beat 1: [KY · age 10 · seed C] Scene opens by addressing 'Erica Lopez' then says 'your' — a bound-role vocative smell.
  - “Erica Lopez, your younger brother has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything about i”
- beat 1: [KY · age 10 · questionnaire skipped] Scene opens by addressing 'Charlotte Harrington' then says 'your' — a bound-role vocative smell.
  - “Charlotte Harrington, your younger sister has come in after everyone else three nights this week, and said a different place each time. Nobody has said anything”
