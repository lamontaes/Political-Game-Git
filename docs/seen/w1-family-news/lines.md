# A relative's news told at home (W1, job C)

AFTER: claude/w1-conversation-family-news at 9994dbbd5d. BEFORE: claude/words-telling-said-as-talk at 657f1cd009.

Places were drawn with drawPlace(<label>, "w1-talks"); the world seed is the draw's own hash.

| Draw      | Place                      | Place key | World seed                                                       | Player         | Kind    | Relative (lives elsewhere)            | Told by (adult housemate) |
| --------- | -------------------------- | --------- | ---------------------------------------------------------------- | -------------- | ------- | ------------------------------------- | ------------------------- |
| w1-jobC-1 | Hysham, Montana            | 3038350   | 4db1e7a50f52768894ea8e3a0c21c2b7136fe176e2c95ded94a969db4ccfe000 | Micah Williams | illness | Laura Talley, born 1947, grandmother  | Logan Williams            |
| w1-jobC-2 | Catalpa Canyon, New Mexico | 3512844   | 7beadbe30ffcb9e3d9f7ec99a741daf5e698353b6901d65024ab6dee54059e94 | Taylor Navarro | death   | Teresa Workman, born 1974, aunt       | Whitney Navarro           |
| w1-jobC-3 | Bunn, North Carolina       | 3708860   | e779853673a1a64e0acf947a3505b3af9343b61f624ff747c7fc66cb265814d7 | Justin James   | illness | Karen Jimenez, born 1954, grandmother | Ella James                |

How each was played, the same way in both copies:

1. A new life with the seed and place key (no person).
2. One day was run with dev mode's advance. On the opening day the health engine is not yet started, and the Health control answers "No illness: the person is gone or has no health record."
3. Dev mode's illness control (beginSeriousIllness) was used on the first relative of the player who lives in another household and is family of an adult housemate.
4. For the illness, one more day was advanced. For the death, dev mode's run-until {event: "death", person} ran 60 days, until the relative died on March 22, 2025.
5. The play screen was reloaded.
   - Hysham: the housemate who tells was not on the room's strip at 8:30 PM.
   - Catalpa and Bunn: nobody was home at 8:30 PM, so Hour was pressed once, to 8:00 AM the next morning, when one person was on the strip.
6. The person on the strip was clicked, and the talk request was rewritten to the adult housemate who is family of the relative. The server opened a real talk with that housemate.
7. Each reply was played from its own fresh life (same seed, same day).

Pictures: after/<place>/1.jpg and before/<place>/1.jpg are the telling with its replies. 2.jpg onward is the answer to reply 1, 2, 3.

## Hysham, Montana: illness (Wednesday, January 22, 2025, 8:30 PM)

### AFTER

Logan Williams: "Your grandmother got very sick today."
Replies: 1. Oh, no. | 2. Need anything? | 3. How bad?

| Picture | Reply          | Logan answers                                          | Then     |
| ------- | -------------- | ------------------------------------------------------ | -------- |
| 2       | Oh, no.        | I know. Let's call your grandmother together.          | Continue |
| 3       | Need anything? | Just call your grandmother. It'll mean a lot.          | Continue |
| 4       | How bad?       | We don't know yet. I'll keep calling your grandmother. | Continue |

### BEFORE

Logan Williams: "Your grandmother is seriously ill."
Replies: 1. Oh, no. Give Laura my best. | 2. Is there anything I can do? | 3. Have you talked to them?

| Picture | Reply                       | Logan answers                                            | Then     |
| ------- | --------------------------- | -------------------------------------------------------- | -------- |
| 2       | Oh, no. Give Laura my best. | (nothing; the box shows the player's reply and Continue) | Continue |
| 3       | Is there anything I can do? | (nothing)                                                | Continue |
| 4       | Have you talked to them?    | (nothing)                                                | Continue |

## Catalpa Canyon, New Mexico: death (Sunday, March 23, 2025, 8:00 AM; Teresa died March 22)

### AFTER

Whitney Navarro: "Your aunt died yesterday. Teresa was only 50."
Replies: 1. What happens now? | 2. Are you okay? (two replies)

| Picture | Reply             | Whitney answers                                | Then     |
| ------- | ----------------- | ---------------------------------------------- | -------- |
| 2       | What happens now? | We'll need to call the family about your aunt. | Continue |
| 3       | Are you okay?     | Not really. I can't believe your aunt is gone. | Continue |

### BEFORE

Whitney Navarro: "Your aunt passed away."
Replies: 1. What can I do? | 2. I'm so sorry. | 3. Oh. Come here.

| Picture | Reply          | Whitney answers | Then     |
| ------- | -------------- | --------------- | -------- |
| 2       | What can I do? | (nothing)       | Continue |
| 3       | I'm so sorry.  | (nothing)       | Continue |
| 4       | Oh. Come here. | (nothing)       | Continue |

## Bunn, North Carolina: illness (Thursday, January 23, 2025, 8:00 AM; the illness began January 22)

### AFTER

Ella James: "Your grandmother got very sick yesterday."
Replies: 1. Need anything? | 2. How bad? | 3. Oh, no.

| Picture | Reply          | Ella answers                                           | Then     |
| ------- | -------------- | ------------------------------------------------------ | -------- |
| 2       | Need anything? | Just call your grandmother. It'll mean a lot.          | Continue |
| 3       | How bad?       | We don't know yet. I'll keep calling your grandmother. | Continue |
| 4       | Oh, no.        | I know. Let's call your grandmother together.          | Continue |

### BEFORE

Ella James: "Your grandmother is seriously ill."
Replies: 1. Can I help with anything? | 2. What did the doctors say? | 3. Oh, no. Give Karen my best.

| Picture | Reply                       | Ella answers | Then     |
| ------- | --------------------------- | ------------ | -------- |
| 2       | Can I help with anything?   | (nothing)    | Continue |
| 3       | What did the doctors say?   | (nothing)    | Continue |
| 4       | Oh, no. Give Karen my best. | (nothing)    | Continue |

## Not done

- Prison: not shot. A prison term comes only from a bribery conviction (job D); no route reached one without forcing.
- Passed over: w1-jobC-4 (Tidmore Bend, Alabama) and w1-jobC-5 (Bowling Green, Indiana) were drawn and probed but not used, because three places were enough.
- The first probes on the opening day failed for every relative ("no health record"). They worked after one day was run.
