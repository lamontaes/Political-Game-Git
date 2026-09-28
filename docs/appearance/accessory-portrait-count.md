# How many people wear earrings, necklaces and lapel pins

Nothing public gives these shares, so they were counted. On September 28,
2026, Claude looked at the official portrait of each member in a seeded sample
of the 119th Congress and wrote down whether it showed earrings, a necklace
and a lapel pin. The shares in `src/presentation/appearance-engine/face-extras.ts`
(`ACCESSORY_SHARE`) come from these counts.

## The sample

1. The list of 539 sitting members is `legislators-current.yaml` from the
   unitedstates/congress-legislators project.
2. Eighty women and eighty men were drawn at random with seed 20260928.
3. The portraits are the Congressional bioguide photographs mirrored by the
   unitedstates/images project (450 by 550 pixels).
4. Four of the 80 women drawn had no portrait yet, so the sample is 76 women
   and 80 men. Of the 539 members, 156 are women and 383 are men. Each share
   is counted within its own sex, so Congress's makeup does not weight it.

## The counts

| Group | Portraits | Earrings | Necklace | Lapel pin |
| ----- | --------- | -------- | -------- | --------- |
| Women | 76        | 51       | 38       | 21        |
| Men   | 80        | 0        | 0        | 18        |

## What the count cannot say

1. It counts what a portrait shows. A small stud under hair or a thin chain
   under a collar is missed, so each share is a floor.
2. Members sit for these portraits in formal clothes. The shares fit a person
   in business or formal wear, and the lapel pin fits only someone who holds an
   office.
3. It is one reader's count, not a coded study.
4. A portrait shows head and shoulders. No wrist and no hand appeared in any
   of the 156, so the count says nothing about watches or rings. Those shares
   are placeholders marked `PLACEHOLDER(accessories)` in the code.
5. Nothing varies with age, because 156 portraits are too few to split.

## Bioguide IDs counted

Women (76): M001234, C001119, C001066, C001113, P000597, R000617, M001215, P000610, B000825, M001229, S001223, C001047, T000482, S001159, F000483, S001145, H001042, W000822, S001215, B001243, H001079, C001130, L000590, B001326, C001101, H001076, A000370, B001303, K000399, L000595, D000216, W000187, M001111, H001086, M001136, M001227, B001278, C000127, M000194, B001318, K000367, T000487, L000602, S001218, J000305, A000382, D000635, U000040, D000631, C001039, T000478, H001093, W000797, O000173, M000317, W000808, S001221, F000468, S001205, S001226, J000310, K000404, F000477, S000929, C001035, M001205, D000197, T000474, M001188, D000594, G000587, L000397, B001315, G000602, D000629, H001094

Men (80): E000298, O000176, S001229, K000376, H001047, F000471, C001132, M001184, C001133, R000122, L000583, M000934, L000607, J000288, K000398, S001220, I000056, C001061, S001225, S001183, B001299, L000599, J000293, S000148, M001218, I000058, H001058, D000230, S001200, H001102, T000469, N000190, B001301, C001123, H001072, P000607, F000454, P000608, S000033, W000779, J000309, G000589, B001288, W000805, C001121, R000584, V000130, Y000064, B001317, L000570, P000048, C001120, D000096, L000585, B001292, N000193, D000563, P000034, M001214, M001204, R000622, F000480, G000605, C001126, S001214, S001211, R000612, L000577, H001082, C001056, T000193, H000273, R000605, L000582, M001241, G000586, H001101, N000189, P000605, C001087
