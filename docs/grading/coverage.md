# Words coverage: situations, roles, moves and registers

Built by `npm run words:coverage` (`scripts/dialogue-batch/coverage-table.ts`) from the director's catalog (`src/director/data/situation-types.json`), the banks (`data/english/parts/`, each part tagged by `scripts/english-corpus/tag-moves.ts` from `scripts/english-corpus/moves.json`) and the owner's grades (`data/english/part-grades.json`). A cell is one situation type, one role, one move that role may make and one register the situation is composed in; a narrated register (the memoir, scene narration, headlines, a law, the minutes) has narrator cells instead. A part fits a cell when it carries the move in that register and its key is the situation's or none. **Parts** counts the fitting parts; **passed** counts those the owner graded good and the grades do not hold back.

## Totals

| Measure                                     | Count |
| ------------------------------------------- | ----- |
| Situation types                             | 66    |
| Cells                                       | 972   |
| Cells with at least one part                | 693   |
| Empty cells (the mining and authoring list) | 279   |
| Cells with parts but none graded pass       | 566   |
| Cells with a part graded pass               | 127   |
| Part fits counted over all cells            | 20584 |

## By endpoint

| Endpoint  | Situation types | Cells | Empty cells | Cells with a pass |
| --------- | --------------- | ----- | ----------- | ----------------- |
| money     | 6               | 79    | 18          | 12                |
| bill      | 9               | 156   | 59          | 14                |
| political | 17              | 308   | 101         | 21                |
| personal  | 34              | 429   | 101         | 80                |

## By situation key

| Key           | Situation types | Cells | Empty cells | Cells with a pass |
| ------------- | --------------- | ----- | ----------- | ----------------- |
| loss          | 8               | 120   | 40          | 25                |
| threat        | 10              | 175   | 63          | 17                |
| honor         | 7               | 100   | 34          | 13                |
| news-received | 7               | 83    | 10          | 12                |
| favor-asked   | 10              | 120   | 21          | 13                |
| vote-wanted   | 6               | 113   | 41          | 2                 |
| arrival       | 5               | 59    | 14          | 10                |
| departure     | 2               | 25    | 6           | 9                 |
| routine       | 11              | 177   | 50          | 26                |

## Emptiest situations

Situation types by their share of empty cells, emptiest first.

| Situation         | Key           | Endpoint  | Cells | Empty | Parts fitting | Passed |
| ----------------- | ------------- | --------- | ----- | ----- | ------------- | ------ |
| floor-vote        | vote-wanted   | bill      | 35    | 30    | 236           | 3      |
| recall            | threat        | political | 29    | 20    | 218           | 4      |
| scandal           | threat        | political | 37    | 24    | 240           | 2      |
| veto              | loss          | bill      | 20    | 12    | 214           | 4      |
| race-won          | honor         | political | 30    | 17    | 224           | 4      |
| apology           | routine       | personal  | 12    | 6     | 261           | 3      |
| race-lost         | loss          | political | 23    | 11    | 220           | 8      |
| argument          | threat        | personal  | 24    | 11    | 302           | 3      |
| eviction-notice   | loss          | money     | 20    | 9     | 463           | 5      |
| reconciliation    | routine       | personal  | 14    | 6     | 289           | 3      |
| bill-signed       | honor         | bill      | 15    | 6     | 244           | 4      |
| news-arrives      | news-received | personal  | 20    | 8     | 300           | 3      |
| public-hearing    | routine       | bill      | 25    | 10    | 129           | 8      |
| address           | honor         | political | 8     | 3     | 277           | 0      |
| campaign-stop     | vote-wanted   | political | 30    | 11    | 374           | 0      |
| departure         | departure     | personal  | 14    | 5     | 430           | 6      |
| care              | routine       | personal  | 12    | 4     | 287           | 3      |
| cause-invite      | favor-asked   | personal  | 12    | 4     | 320           | 4      |
| favor-asked       | favor-asked   | personal  | 12    | 4     | 285           | 3      |
| becoming-friends  | routine       | personal  | 14    | 4     | 297           | 3      |
| breakup           | loss          | personal  | 14    | 4     | 416           | 5      |
| date              | routine       | personal  | 14    | 4     | 297           | 3      |
| layoff            | loss          | money     | 14    | 4     | 398           | 4      |
| reunion           | arrival       | personal  | 14    | 4     | 312           | 3      |
| asking-permission | favor-asked   | personal  | 11    | 3     | 291           | 3      |
| advice            | routine       | personal  | 12    | 3     | 291           | 3      |
| appointment       | honor         | political | 12    | 3     | 205           | 3      |
| filing            | routine       | political | 20    | 5     | 268           | 3      |
| first-day         | arrival       | personal  | 12    | 3     | 298           | 3      |
| first-meeting     | arrival       | personal  | 12    | 3     | 288           | 3      |
| new-baby          | honor         | personal  | 12    | 3     | 360           | 4      |
| proposal          | favor-asked   | personal  | 12    | 3     | 289           | 3      |
| return            | arrival       | personal  | 12    | 3     | 308           | 3      |
| visit             | routine       | personal  | 12    | 3     | 293           | 3      |
| press-interview   | routine       | political | 22    | 5     | 556           | 0      |
| law-takes-effect  | news-received | money     | 10    | 2     | 209           | 4      |
| interview         | favor-asked   | money     | 11    | 2     | 295           | 3      |
| betrayal          | threat        | personal  | 12    | 2     | 300           | 3      |
| reach-out         | favor-asked   | personal  | 12    | 2     | 303           | 3      |
| rescue            | threat        | personal  | 12    | 2     | 302           | 3      |
| celebration       | honor         | personal  | 13    | 2     | 310           | 3      |
| accusation        | threat        | personal  | 14    | 2     | 307           | 3      |
| arrival           | arrival       | personal  | 9     | 1     | 284           | 3      |
| last-day          | departure     | personal  | 11    | 1     | 396           | 5      |
| rally-opponent    | threat        | political | 11    | 1     | 383           | 0      |
| warning           | threat        | personal  | 11    | 1     | 292           | 3      |
| bill-carry        | favor-asked   | bill      | 13    | 1     | 426           | 0      |
| donor-ask         | favor-asked   | money     | 13    | 1     | 393           | 0      |
| party-ask         | favor-asked   | political | 13    | 1     | 390           | 0      |
| confession        | news-received | personal  | 12    | 0     | 299           | 3      |
| desk-bill         | vote-wanted   | bill      | 10    | 0     | 342           | 0      |
| family-absence    | threat        | political | 11    | 0     | 301           | 0      |
| family-filing     | news-received | political | 11    | 0     | 192           | 0      |
| family-loss       | loss          | political | 10    | 0     | 212           | 0      |
| family-win        | honor         | political | 10    | 0     | 227           | 0      |
| funeral           | loss          | personal  | 12    | 0     | 458           | 5      |
| gathering-missing | loss          | personal  | 7     | 0     | 314           | 3      |
| hearing           | threat        | personal  | 14    | 0     | 315           | 3      |
| letter            | news-received | personal  | 4     | 0     | 257           | 3      |
| office-hours      | favor-asked   | money     | 11    | 0     | 460           | 0      |
| polling-place     | routine       | political | 20    | 0     | 415           | 5      |
| section-bargain   | vote-wanted   | bill      | 12    | 0     | 404           | 0      |
| staff-news        | news-received | political | 11    | 0     | 200           | 0      |
| verdict           | news-received | personal  | 15    | 0     | 340           | 4      |
| vote-asked        | vote-wanted   | bill      | 13    | 0     | 407           | 0      |
| vote-confirmed    | vote-wanted   | bill      | 13    | 0     | 371           | 0      |

## Every cell

One row per situation, role and move; each register shows parts/passed. A dash is an empty cell.

### departure (departure, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| leaving    | farewell     | 50/1         |             |         |
| leaving    | promise      | -            |             |         |
| leaving    | comfort      | -            |             |         |
| leaving    | tell         | 4/0          |             |         |
| staying    | farewell     | 50/1         |             |         |
| staying    | comfort      | -            |             |         |
| staying    | request      | 12/0         |             |         |
| staying    | blame        | -            |             |         |
| others     | farewell     | 50/1         |             |         |
| others     | comfort      | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 94/1    |
| (narrator) | recall       |              |             | 38/2    |

### return (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| returning  | tell         | 4/0          |             |         |
| returning  | apologize    | -            |             |         |
| returning  | thank        | 2/0          |             |         |
| returning  | recall       | 14/0         |             |         |
| waiting    | comfort      | -            |             |         |
| waiting    | confront     | -            |             |         |
| waiting    | recall       | 14/0         |             |         |
| waiting    | thank        | 2/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 102/1   |
| (narrator) | recall       |              |             | 38/2    |

### news-arrives (news-received, personal)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| bearer     | tell         | 5/0          |             |         | -           |
| bearer     | comfort      | 2/0          |             |         | -           |
| bearer     | deflect      | 2/0          |             |         | -           |
| bearer     | lie          | 16/0         |             |         | -           |
| receiver   | thank        | 2/0          |             |         | -           |
| receiver   | blame        | 5/0          |             |         | 9/0         |
| receiver   | confront     | -            |             |         | -           |
| receiver   | comfort      | 2/0          |             |         | -           |
| (narrator) | narrate      |              | 87/0        |         |             |
| (narrator) | deliver-news |              | 45/0        |         |             |
| (narrator) | tell         |              |             | 87/1    |             |
| (narrator) | recall       |              |             | 38/2    |             |

### letter (news-received, personal)

| Role       | Move         | journal | scene-words |
| ---------- | ------------ | ------- | ----------- |
| (narrator) | tell         | 87/1    |             |
| (narrator) | recall       | 38/2    |             |
| (narrator) | narrate      |         | 87/0        |
| (narrator) | deliver-news |         | 45/0        |

### argument (threat, personal)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| side       | confront     | -            |             |         | -           |
| side       | blame        | 3/0          |             |         | 9/0         |
| side       | deflect      | 3/0          |             |         | -           |
| side       | apologize    | -            |             |         | -           |
| other-side | confront     | -            |             |         | -           |
| other-side | blame        | 3/0          |             |         | 9/0         |
| other-side | refuse       | 3/0          |             |         | -           |
| other-side | agree        | 2/0          |             |         | -           |
| witness    | comfort      | 1/0          |             |         | -           |
| witness    | tell         | 9/0          |             |         | -           |
| (narrator) | narrate      |              | 87/0        |         |             |
| (narrator) | deliver-news |              | 45/0        |         |             |
| (narrator) | tell         |              |             | 90/1    |             |
| (narrator) | recall       |              |             | 38/2    |             |

### apology (routine, personal)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| apologizing | apologize    | -            |             |         |
| apologizing | confess      | -            |             |         |
| apologizing | promise      | -            |             |         |
| apologizing | offer        | -            |             |         |
| wronged     | agree        | 2/0          |             |         |
| wronged     | refuse       | -            |             |         |
| wronged     | blame        | -            |             |         |
| wronged     | thank        | 2/0          |             |         |
| (narrator)  | narrate      |              | 87/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 38/2    |

### confession (news-received, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| telling    | confess      | 2/0          |             |         |
| telling    | lie          | 16/0         |             |         |
| telling    | deflect      | 2/0          |             |         |
| telling    | request      | 12/0         |             |         |
| told       | comfort      | 2/0          |             |         |
| told       | blame        | 5/0          |             |         |
| told       | thank        | 2/0          |             |         |
| told       | promise      | 1/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### favor-asked (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| asker      | request      | 12/0         |             |         |
| asker      | offer        | -            |             |         |
| asker      | promise      | -            |             |         |
| asker      | thank        | 2/0          |             |         |
| asked      | agree        | 2/0          |             |         |
| asked      | decline      | -            |             |         |
| asked      | offer        | -            |             |         |
| asked      | request      | 12/0         |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### reach-out (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| asking     | request      | 12/0         |             |         |
| asking     | tell         | 4/0          |             |         |
| asking     | recall       | 14/0         |             |         |
| asking     | offer        | -            |             |         |
| asked      | agree        | 2/0          |             |         |
| asked      | decline      | -            |             |         |
| asked      | request      | 12/0         |             |         |
| asked      | thank        | 2/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### becoming-friends (routine, personal)

| Role         | Move         | conversation | scene-words | journal |
| ------------ | ------------ | ------------ | ----------- | ------- |
| friend       | tell         | 4/0          |             |         |
| friend       | recall       | 14/0         |             |         |
| friend       | offer        | -            |             |         |
| friend       | thank        | 2/0          |             |         |
| friend       | confess      | -            |             |         |
| other-friend | tell         | 4/0          |             |         |
| other-friend | recall       | 14/0         |             |         |
| other-friend | offer        | -            |             |         |
| other-friend | thank        | 2/0          |             |         |
| other-friend | confess      | -            |             |         |
| (narrator)   | narrate      |              | 87/0        |         |
| (narrator)   | deliver-news |              | 45/0        |         |
| (narrator)   | tell         |              |             | 87/1    |
| (narrator)   | recall       |              |             | 38/2    |

### celebration (honor, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| honoree    | thank        | 4/0          |             |         |
| honoree    | tell         | 6/0          |             |         |
| honoree    | recall       | 14/0         |             |         |
| host       | offer        | -            |             |         |
| host       | tell         | 6/0          |             |         |
| host       | thank        | 4/0          |             |         |
| guests     | thank        | 4/0          |             |         |
| guests     | tell         | 6/0          |             |         |
| guests     | offer        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 96/1    |
| (narrator) | recall       |              |             | 38/2    |

### gathering-missing (loss, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| household  | recall       | 14/0         |             |         |
| household  | comfort      | 28/0         |             |         |
| household  | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 38/2    |

### funeral (loss, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| mourners   | comfort      | 28/0         |             |         |
| mourners   | recall       | 14/0         |             |         |
| mourners   | tell         | 4/0          |             |         |
| mourners   | farewell     | 50/1         |             |         |
| family     | thank        | 2/0          |             |         |
| family     | recall       | 14/0         |             |         |
| family     | farewell     | 50/1         |             |         |
| family     | comfort      | 28/0         |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 38/2    |

### first-meeting (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| newcomer   | tell         | 4/0          |             |         |
| newcomer   | offer        | -            |             |         |
| newcomer   | thank        | 2/0          |             |         |
| met        | tell         | 4/0          |             |         |
| met        | offer        | -            |             |         |
| met        | thank        | 2/0          |             |         |
| introducer | tell         | 4/0          |             |         |
| introducer | offer        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 102/1   |
| (narrator) | recall       |              |             | 38/2    |

### first-day (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| newcomer   | tell         | 4/0          |             |         |
| newcomer   | request      | 12/0         |             |         |
| newcomer   | thank        | 2/0          |             |         |
| authority  | tell         | 4/0          |             |         |
| authority  | offer        | -            |             |         |
| authority  | comfort      | -            |             |         |
| peers      | offer        | -            |             |         |
| peers      | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 102/1   |
| (narrator) | recall       |              |             | 38/2    |

### last-day (departure, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| leaving    | farewell     | 50/1         |             |         |
| leaving    | thank        | 2/0          |             |         |
| leaving    | recall       | 14/0         |             |         |
| leaving    | promise      | -            |             |         |
| staying    | farewell     | 50/1         |             |         |
| staying    | recall       | 14/0         |             |         |
| staying    | thank        | 2/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 94/1    |
| (narrator) | recall       |              |             | 38/2    |

### interview (favor-asked, money)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| interviewer | tell         | 4/0          |             |         |
| interviewer | offer        | -            |             |         |
| interviewer | decline      | -            |             |         |
| candidate   | tell         | 4/0          |             |         |
| candidate   | lie          | 16/0         |             |         |
| candidate   | request      | 12/0         |             |         |
| candidate   | thank        | 2/0          |             |         |
| (narrator)  | narrate      |              | 87/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 38/2    |

### date (routine, personal)

| Role          | Move         | conversation | scene-words | journal |
| ------------- | ------------ | ------------ | ----------- | ------- |
| partner       | tell         | 4/0          |             |         |
| partner       | recall       | 14/0         |             |         |
| partner       | offer        | -            |             |         |
| partner       | thank        | 2/0          |             |         |
| partner       | confess      | -            |             |         |
| other-partner | tell         | 4/0          |             |         |
| other-partner | recall       | 14/0         |             |         |
| other-partner | offer        | -            |             |         |
| other-partner | thank        | 2/0          |             |         |
| other-partner | confess      | -            |             |         |
| (narrator)    | narrate      |              | 87/0        |         |
| (narrator)    | deliver-news |              | 45/0        |         |
| (narrator)    | tell         |              |             | 87/1    |
| (narrator)    | recall       |              |             | 38/2    |

### proposal (favor-asked, personal)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| proposing   | promise      | -            |             |         |
| proposing   | request      | 12/0         |             |         |
| proposing   | tell         | 4/0          |             |         |
| proposing   | confess      | -            |             |         |
| proposed-to | agree        | 2/0          |             |         |
| proposed-to | decline      | -            |             |         |
| proposed-to | request      | 12/0         |             |         |
| proposed-to | thank        | 2/0          |             |         |
| (narrator)  | narrate      |              | 87/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 38/2    |

### breakup (loss, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| ending     | tell         | 4/0          |             |         |
| ending     | blame        | -            |             |         |
| ending     | apologize    | -            |             |         |
| ending     | farewell     | 50/1         |             |         |
| partner    | blame        | -            |             |         |
| partner    | request      | 12/0         |             |         |
| partner    | refuse       | -            |             |         |
| partner    | farewell     | 50/1         |             |         |
| children   | comfort      | 28/0         |             |         |
| children   | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 38/2    |

### reunion (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| one        | recall       | 14/0         |             |         |
| one        | tell         | 4/0          |             |         |
| one        | apologize    | -            |             |         |
| one        | thank        | 2/0          |             |         |
| one        | promise      | -            |             |         |
| other      | recall       | 14/0         |             |         |
| other      | tell         | 4/0          |             |         |
| other      | apologize    | -            |             |         |
| other      | thank        | 2/0          |             |         |
| other      | promise      | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 102/1   |
| (narrator) | recall       |              |             | 38/2    |

### betrayal (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| betrayed   | blame        | 3/0          |             |         |
| betrayed   | confront     | -            |             |         |
| betrayed   | refuse       | 3/0          |             |         |
| betrayed   | request      | 12/0         |             |         |
| betrayer   | apologize    | -            |             |         |
| betrayer   | lie          | 16/0         |             |         |
| betrayer   | deflect      | 3/0          |             |         |
| betrayer   | confess      | 3/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 38/2    |

### rescue (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| rescuer    | offer        | -            |             |         |
| rescuer    | comfort      | 1/0          |             |         |
| rescuer    | tell         | 9/0          |             |         |
| in-danger  | request      | 12/0         |             |         |
| in-danger  | thank        | 2/0          |             |         |
| in-danger  | tell         | 9/0          |             |         |
| bystanders | tell         | 9/0          |             |         |
| bystanders | offer        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 38/2    |

### visit (routine, personal)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| visitor     | comfort      | -            |             |         |
| visitor     | tell         | 4/0          |             |         |
| visitor     | recall       | 14/0         |             |         |
| visitor     | promise      | -            |             |         |
| cannot-come | thank        | 2/0          |             |         |
| cannot-come | tell         | 4/0          |             |         |
| cannot-come | request      | 12/0         |             |         |
| cannot-come | confess      | -            |             |         |
| (narrator)  | narrate      |              | 87/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 38/2    |

### arrival (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| household  | offer        | -            |             |         |
| household  | tell         | 4/0          |             |         |
| household  | thank        | 2/0          |             |         |
| newcomer   | thank        | 2/0          |             |         |
| newcomer   | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 102/1   |
| (narrator) | recall       |              |             | 38/2    |

### care (routine, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| caregiver  | offer        | -            |             |         |
| caregiver  | comfort      | -            |             |         |
| caregiver  | tell         | 4/0          |             |         |
| caregiver  | request      | 12/0         |             |         |
| cared-for  | thank        | 2/0          |             |         |
| cared-for  | request      | 12/0         |             |         |
| cared-for  | decline      | -            |             |         |
| cared-for  | confess      | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### advice (routine, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| adviser    | tell         | 4/0          |             |         |
| adviser    | offer        | -            |             |         |
| adviser    | recall       | 14/0         |             |         |
| adviser    | comfort      | -            |             |         |
| deciding   | request      | 12/0         |             |         |
| deciding   | thank        | 2/0          |             |         |
| deciding   | agree        | 2/0          |             |         |
| deciding   | decline      | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### accusation (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| accuser    | confront     | -            |             |         |
| accuser    | blame        | 3/0          |             |         |
| accuser    | tell         | 9/0          |             |         |
| accused    | deflect      | 3/0          |             |         |
| accused    | lie          | 16/0         |             |         |
| accused    | confess      | 3/0          |             |         |
| accused    | apologize    | -            |             |         |
| accused    | refuse       | 3/0          |             |         |
| witnesses  | tell         | 9/0          |             |         |
| witnesses  | comfort      | 1/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 38/2    |

### warning (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| warning    | tell         | 9/0          |             |         |
| warning    | offer        | -            |             |         |
| warning    | request      | 12/0         |             |         |
| at-risk    | thank        | 2/0          |             |         |
| at-risk    | deflect      | 3/0          |             |         |
| at-risk    | refuse       | 3/0          |             |         |
| at-risk    | promise      | 3/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 38/2    |

### reconciliation (routine, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| one        | apologize    | -            |             |         |
| one        | thank        | 2/0          |             |         |
| one        | recall       | 14/0         |             |         |
| one        | promise      | -            |             |         |
| one        | offer        | -            |             |         |
| other      | apologize    | -            |             |         |
| other      | thank        | 2/0          |             |         |
| other      | recall       | 14/0         |             |         |
| other      | promise      | -            |             |         |
| other      | offer        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### asking-permission (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| asking     | request      | 12/0         |             |         |
| asking     | promise      | -            |             |         |
| asking     | tell         | 4/0          |             |         |
| asking     | lie          | 16/0         |             |         |
| authority  | agree        | 2/0          |             |         |
| authority  | decline      | -            |             |         |
| authority  | offer        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### polling-place (routine, political)

| Role       | Move   | conversation | counter | journal |
| ---------- | ------ | ------------ | ------- | ------- |
| voter      | greet  | 25/0         | 13/0    |         |
| voter      | thank  | 2/0          | 5/0     |         |
| voter      | ask    | 45/1         | 24/0    |         |
| workers    | greet  | 25/0         | 13/0    |         |
| workers    | tell   | 4/0          | 8/0     |         |
| workers    | thank  | 2/0          | 5/0     |         |
| neighbors  | greet  | 25/0         | 13/0    |         |
| neighbors  | tell   | 4/0          | 8/0     |         |
| neighbors  | ask    | 45/1         | 24/0    |         |
| (narrator) | tell   |              |         | 87/1    |
| (narrator) | recall |              |         | 38/2    |

### hearing (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| accused    | deflect      | 3/0          |             |         |
| accused    | confess      | 3/0          |             |         |
| accused    | refuse       | 3/0          |             |         |
| accused    | tell         | 9/0          |             |         |
| accused    | request      | 12/0         |             |         |
| family     | comfort      | 1/0          |             |         |
| family     | tell         | 9/0          |             |         |
| family     | promise      | 3/0          |             |         |
| others     | tell         | 9/0          |             |         |
| others     | blame        | 3/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 38/2    |

### verdict (news-received, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| defendant  | thank        | 2/0          |             |         |
| defendant  | confess      | 2/0          |             |         |
| defendant  | apologize    | 3/0          |             |         |
| defendant  | refuse       | 3/0          |             |         |
| defendant  | tell         | 5/0          |             |         |
| family     | comfort      | 2/0          |             |         |
| family     | tell         | 5/0          |             |         |
| family     | promise      | 1/0          |             |         |
| family     | farewell     | 50/1         |             |         |
| others     | tell         | 5/0          |             |         |
| others     | blame        | 5/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### race-won (honor, political)

| Role       | Move            | address/victory | conversation | journal | newscast | headlines |
| ---------- | --------------- | --------------- | ------------ | ------- | -------- | --------- |
| candidate  | announce-result | 4/1             | -            |         | 7/0      |           |
| candidate  | thank           | 3/0             | 4/0          |         | -        |           |
| candidate  | promise         | -               | -            |         | -        |           |
| candidate  | tell            | -               | 6/0          |         | -        |           |
| supporters | congratulate    | -               | 6/0          |         | -        |           |
| supporters | thank           | 3/0             | 4/0          |         | -        |           |
| supporters | tell            | -               | 6/0          |         | -        |           |
| family     | congratulate    | -               | 6/0          |         | -        |           |
| family     | comfort         | -               | -            |         | -        |           |
| (narrator) | tell            |                 |              | 96/1    |          |           |
| (narrator) | recall          |                 |              | 38/2    |          |           |
| (narrator) | headline        |                 |              |         |          | 41/0      |

### race-lost (loss, political)

| Role       | Move         | address/concession | conversation | journal | newscast |
| ---------- | ------------ | ------------------ | ------------ | ------- | -------- |
| candidate  | congratulate | 2/0                | -            |         | -        |
| candidate  | thank        | 1/1                | 2/0          |         | -        |
| candidate  | tell         | 6/3                | 4/0          |         | -        |
| candidate  | close        | -                  | -            |         | 10/0     |
| supporters | comfort      | -                  | 28/0         |         | -        |
| supporters | thank        | 1/1                | 2/0          |         | -        |
| family     | comfort      | -                  | 28/0         |         | -        |
| (narrator) | tell         |                    |              | 98/1    |          |
| (narrator) | recall       |                    |              | 38/2    |          |

### floor-vote (vote-wanted, bill)

| Role       | Move            | meeting | address/chair | minutes | winning-losing | journal |
| ---------- | --------------- | ------- | ------------- | ------- | -------------- | ------- |
| chair      | call-to-order   | -       | -             |         |                |         |
| chair      | put-question    | -       | -             |         |                |         |
| chair      | announce-result | -       | -             |         |                |         |
| chair      | close           | 34/0    | -             |         |                |         |
| member     | address-chair   | 44/0    | -             |         |                |         |
| member     | request         | -       | -             |         |                |         |
| member     | agree           | -       | -             |         |                |         |
| member     | disagree        | -       | -             |         |                |         |
| colleagues | agree           | -       | -             |         |                |         |
| colleagues | disagree        | -       | -             |         |                |         |
| colleagues | request         | -       | -             |         |                |         |
| colleagues | blame           | -       | -             |         |                |         |
| public     | introduce       | -       | -             |         |                |         |
| public     | request         | -       | -             |         |                |         |
| public     | thank           | -       | -             |         |                |         |
| (narrator) | record          |         |               | -       |                |         |
| (narrator) | announce-result |         |               | -       | 33/0           |         |
| (narrator) | tell            |         |               |         |                | 87/1    |
| (narrator) | recall          |         |               |         |                | 38/2    |

### bill-signed (honor, bill)

| Role       | Move            | legislation | news | headlines | journal | conversation |
| ---------- | --------------- | ----------- | ---- | --------- | ------- | ------------ |
| (narrator) | enact           | -           |      |           |         |              |
| (narrator) | title           | -           |      |           |         |              |
| (narrator) | provision       | -           |      |           |         |              |
| (narrator) | deliver-news    |             | -    |           |         |              |
| (narrator) | announce-result |             | 2/0  |           |         |              |
| (narrator) | headline        |             |      | 41/0      |         |              |
| (narrator) | tell            |             |      |           | 96/1    |              |
| (narrator) | recall          |             |      |           | 38/2    |              |
| sponsor    | thank           |             |      |           |         | 4/0          |
| sponsor    | tell            |             |      |           |         | 6/0          |
| sponsor    | announce-result |             |      |           |         | -            |
| signer     | announce-result |             |      |           |         | -            |
| signer     | thank           |             |      |           |         | 4/0          |
| signer     | congratulate    |             |      |           |         | 6/0          |
| press      | ask             |             |      |           |         | 47/1         |

### veto (loss, bill)

| Role       | Move            | news | newscast | conversation | journal |
| ---------- | --------------- | ---- | -------- | ------------ | ------- |
| (narrator) | deliver-news    | 7/0  |          |              |         |
| (narrator) | announce-result | 2/0  |          |              |         |
| sponsor    | disagree        |      | -        | -            |         |
| sponsor    | blame           |      | -        | -            |         |
| sponsor    | tell            |      | -        | 4/0          |         |
| sponsor    | promise         |      | -        | 2/0          |         |
| executive  | tell            |      | -        | 4/0          |         |
| executive  | deflect         |      | -        | -            |         |
| press      | ask             |      | -        | 59/1         |         |
| press      | confront        |      | -        | -            |         |
| (narrator) | tell            |      |          |              | 98/1    |
| (narrator) | recall          |      |          |              | 38/2    |

### appointment (honor, political)

| Role       | Move            | conversation | journal | headlines | news |
| ---------- | --------------- | ------------ | ------- | --------- | ---- |
| appointee  | thank           | 4/0          |         |           |      |
| appointee  | promise         | -            |         |           |      |
| appointee  | tell            | 6/0          |         |           |      |
| appointer  | announce-result | -            |         |           |      |
| appointer  | congratulate    | 6/0          |         |           |      |
| appointer  | tell            | 6/0          |         |           |      |
| family     | congratulate    | 6/0          |         |           |      |
| (narrator) | tell            |              | 96/1    |           |      |
| (narrator) | recall          |              | 38/2    |           |      |
| (narrator) | headline        |              |         | 41/0      |      |
| (narrator) | deliver-news    |              |         |           | -    |
| (narrator) | announce-result |              |         |           | 2/0  |

### recall (threat, political)

| Role        | Move     | conversation | newscast | journal | address/campaign |
| ----------- | -------- | ------------ | -------- | ------- | ---------------- |
| official    | deflect  | 3/0          | -        |         | -                |
| official    | tell     | 9/0          | -        |         | -                |
| official    | request  | 12/0         | -        |         | -                |
| official    | disagree | -            | -        |         | -                |
| petitioners | blame    | 3/0          | -        |         | -                |
| petitioners | confront | -            | -        |         | -                |
| petitioners | request  | 12/0         | -        |         | -                |
| family      | comfort  | 1/0          | -        |         | -                |
| family      | ask      | 50/1         | -        |         | -                |
| (narrator)  | tell     |              |          | 90/1    |                  |
| (narrator)  | recall   |              |          | 38/2    |                  |

### public-hearing (routine, bill)

| Role       | Move            | hearing | address/public-comment | notice | minutes |
| ---------- | --------------- | ------- | ---------------------- | ------ | ------- |
| chair      | call-to-order   | 8/1     | -                      |        |         |
| chair      | introduce       | -       | 7/0                    |        |         |
| chair      | thank           | 17/1    | -                      |        |         |
| chair      | close           | 6/0     | 4/0                    |        |         |
| speaker    | greet           | -       | 7/0                    |        |         |
| speaker    | introduce       | -       | 7/0                    |        |         |
| speaker    | tell            | -       | 4/0                    |        |         |
| speaker    | request         | -       | 2/0                    |        |         |
| speaker    | close           | 6/0     | 4/0                    |        |         |
| members    | ask             | -       | -                      |        |         |
| members    | thank           | 17/1    | -                      |        |         |
| (narrator) | notice          |         |                        | 3/1    |         |
| (narrator) | record          |         |                        |        | 30/3    |
| (narrator) | announce-result |         |                        |        | 7/1     |

### press-interview (routine, political)

| Role       | Move         | scene-talk | scene-words | interview |
| ---------- | ------------ | ---------- | ----------- | --------- |
| reporter   | greet        | 25/0       |             | -         |
| reporter   | ask          | 56/0       |             | 23/0      |
| reporter   | confront     | 69/0       |             | 3/0       |
| reporter   | close        | -          |             | 7/0       |
| official   | answer       | 113/0      |             | -         |
| official   | deflect      | 21/0       |             | 18/0      |
| official   | tell         | 27/0       |             | 11/0      |
| official   | promise      | 21/0       |             | 8/0       |
| official   | disagree     | 15/0       |             | -         |
| official   | close        | -          |             | 7/0       |
| (narrator) | narrate      |            | 87/0        |           |
| (narrator) | deliver-news |            | 45/0        |           |

### scandal (threat, political)

| Role       | Move      | newscast | headlines | conversation | interview | bring-it-up |
| ---------- | --------- | -------- | --------- | ------------ | --------- | ----------- |
| exposed    | deflect   | -        |           | 3/0          | 18/0      | -           |
| exposed    | lie       | -        |           | 16/0         | -         | -           |
| exposed    | confess   | -        |           | 3/0          | -         | -           |
| exposed    | apologize | -        |           | -            | -         | -           |
| reporter   | ask       | -        |           | 50/1         | 23/0      | -           |
| reporter   | confront  | -        |           | -            | 3/0       | -           |
| family     | comfort   | -        |           | 1/0          | -         | -           |
| family     | blame     | -        |           | 3/0          | -         | 9/0         |
| family     | ask       | -        |           | 50/1         | 23/0      | -           |
| (narrator) | headline  |          | 38/0      |              |           |             |

### law-takes-effect (news-received, money)

| Role       | Move            | bring-it-up | conversation | journal | news |
| ---------- | --------------- | ----------- | ------------ | ------- | ---- |
| reached    | ask             | -           | 61/1         |         |      |
| reached    | blame           | 9/0         | 5/0          |         |      |
| reached    | tell            | -           | 5/0          |         |      |
| (narrator) | tell            |             |              | 87/1    |      |
| (narrator) | recall          |             |              | 38/2    |      |
| (narrator) | deliver-news    |             |              |         | 3/0  |
| (narrator) | announce-result |             |              |         | 1/0  |

### address (honor, political)

| Role       | Move         | opening-speech | scene-words |
| ---------- | ------------ | -------------- | ----------- |
| speaker    | tell         | 71/0           |             |
| speaker    | promise      | -              |             |
| speaker    | thank        | 3/0            |             |
| aide       | tell         | 71/0           |             |
| audience   | agree        | -              |             |
| audience   | disagree     | -              |             |
| (narrator) | narrate      |                | 87/0        |
| (narrator) | deliver-news |                | 45/0        |

### campaign-stop (vote-wanted, political)

| Role       | Move         | scene-talk | scene-words | address/campaign |
| ---------- | ------------ | ---------- | ----------- | ---------------- |
| volunteer  | request      | 12/0       |             | 9/0              |
| volunteer  | ask          | 17/0       |             | -                |
| volunteer  | thank        | 20/0       |             | 7/0              |
| volunteer  | promise      | 6/0        |             | -                |
| candidate  | greet        | 16/0       |             | -                |
| candidate  | introduce    | -          |             | -                |
| candidate  | tell         | -          |             | 34/0             |
| candidate  | request      | 12/0       |             | 9/0              |
| candidate  | promise      | 6/0        |             | -                |
| candidate  | close        | -          |             | 4/0              |
| voters     | ask          | 17/0       |             | -                |
| voters     | agree        | 38/0       |             | -                |
| voters     | disagree     | -          |             | 8/0              |
| voters     | thank        | 20/0       |             | 7/0              |
| (narrator) | narrate      |            | 87/0        |                  |
| (narrator) | deliver-news |            | 45/0        |                  |

### filing (routine, political)

| Role       | Move    | filing-visit | counter | journal |
| ---------- | ------- | ------------ | ------- | ------- |
| candidate  | greet   | 3/0          | 13/0    |         |
| candidate  | request | 1/0          | -       |         |
| candidate  | ask     | -            | 24/0    |         |
| candidate  | agree   | 9/0          | -       |         |
| candidate  | thank   | -            | 5/0     |         |
| clerk      | greet   | 3/0          | 13/0    |         |
| clerk      | tell    | 8/0          | 8/0     |         |
| clerk      | ask     | -            | 24/0    |         |
| clerk      | close   | 10/0         | 22/0    |         |
| (narrator) | tell    |              |         | 87/1    |
| (narrator) | recall  |              |         | 38/2    |

### layoff (loss, money)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| worker     | ask          | 59/1         |             |         |
| worker     | request      | 12/0         |             |         |
| worker     | blame        | -            |             |         |
| worker     | thank        | 2/0          |             |         |
| boss       | deliver-news | 24/0         |             |         |
| boss       | apologize    | -            |             |         |
| boss       | offer        | -            |             |         |
| boss       | close        | -            |             |         |
| coworkers  | comfort      | 28/0         |             |         |
| coworkers  | condole      | 5/0          |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 38/2    |

### eviction-notice (loss, money)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| tenant     | ask          | 59/1         |             |         | -           |
| tenant     | request      | 12/0         |             |         | -           |
| tenant     | blame        | -            |             |         | 9/0         |
| landlord   | deliver-news | 24/0         |             |         | 4/0         |
| landlord   | refuse       | -            |             |         | -           |
| landlord   | offer        | -            |             |         | -           |
| family     | comfort      | 28/0         |             |         | -           |
| family     | ask          | 59/1         |             |         | -           |
| (narrator) | narrate      |              | 87/0        |         |             |
| (narrator) | deliver-news |              | 45/0        |         |             |
| (narrator) | tell         |              |             | 98/1    |             |
| (narrator) | recall       |              |             | 38/2    |             |

### vote-asked (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| colleague  | request      | 12/0       |             |
| colleague  | plea         | 17/0       |             |
| colleague  | press        | 39/0       |             |
| colleague  | threaten     | 10/0       |             |
| colleague  | thank        | 20/0       |             |
| colleague  | accept       | 42/0       |             |
| you        | agree        | 38/0       |             |
| you        | refuse       | 45/0       |             |
| you        | bargain      | 26/0       |             |
| you        | stall        | 22/0       |             |
| you        | relent       | 4/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### vote-confirmed (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| colleague  | ask          | 17/0       |             |
| colleague  | plea         | 17/0       |             |
| colleague  | press        | 39/0       |             |
| colleague  | threaten     | 10/0       |             |
| colleague  | thank        | 20/0       |             |
| colleague  | accept       | 42/0       |             |
| you        | agree        | 38/0       |             |
| you        | withdraw     | 4/0        |             |
| you        | bargain      | 26/0       |             |
| you        | stall        | 22/0       |             |
| you        | relent       | 4/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### bill-carry (favor-asked, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| member     | request      | 29/0       |             |
| member     | plea         | 16/0       |             |
| member     | press        | 38/0       |             |
| member     | bargain      | 3/0        |             |
| member     | thank        | 65/0       |             |
| member     | accept       | 51/0       |             |
| you        | agree        | 34/0       |             |
| you        | decline      | 51/0       |             |
| you        | bargain      | 3/0        |             |
| you        | stall        | 4/0        |             |
| you        | relent       | -          |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### donor-ask (favor-asked, money)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| donor      | request      | 29/0       |             |
| donor      | press        | 38/0       |             |
| donor      | threaten     | 7/0        |             |
| donor      | bargain      | 3/0        |             |
| donor      | thank        | 65/0       |             |
| donor      | accept       | 51/0       |             |
| you        | agree        | 34/0       |             |
| you        | refuse       | 11/0       |             |
| you        | bargain      | 3/0        |             |
| you        | deflect      | 20/0       |             |
| you        | relent       | -          |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### party-ask (favor-asked, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| chair      | request      | 29/0       |             |
| chair      | press        | 38/0       |             |
| chair      | threaten     | 7/0        |             |
| chair      | plea         | 16/0       |             |
| chair      | thank        | 65/0       |             |
| chair      | accept       | 51/0       |             |
| you        | agree        | 34/0       |             |
| you        | refuse       | 11/0       |             |
| you        | bargain      | 3/0        |             |
| you        | stall        | 4/0        |             |
| you        | relent       | -          |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### office-hours (favor-asked, money)

| Role        | Move         | scene-talk | scene-words |
| ----------- | ------------ | ---------- | ----------- |
| constituent | request      | 29/0       |             |
| constituent | plea         | 16/0       |             |
| constituent | press        | 38/0       |             |
| constituent | thank        | 65/0       |             |
| constituent | accept       | 51/0       |             |
| you         | promise      | 31/0       |             |
| you         | ask          | 25/0       |             |
| you         | decline      | 51/0       |             |
| you         | offer        | 22/0       |             |
| (narrator)  | narrate      |            | 87/0        |
| (narrator)  | deliver-news |            | 45/0        |

### family-filing (news-received, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | ask          | 18/0       |             |
| relative   | plea         | 1/0        |             |
| relative   | comfort      | 5/0        |             |
| relative   | press        | 7/0        |             |
| relative   | thank        | 11/0       |             |
| you        | tell         | 7/0        |             |
| you        | request      | 1/0        |             |
| you        | deflect      | 5/0        |             |
| you        | comfort      | 5/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### family-win (honor, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | congratulate | 5/0        |             |
| relative   | ask          | 17/0       |             |
| relative   | promise      | 5/0        |             |
| relative   | thank        | 20/0       |             |
| you        | thank        | 20/0       |             |
| you        | promise      | 5/0        |             |
| you        | boast        | 10/0       |             |
| you        | tell         | 13/0       |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### family-loss (loss, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | comfort      | 8/0        |             |
| relative   | ask          | 9/0        |             |
| relative   | plea         | 10/0       |             |
| relative   | thank        | 19/0       |             |
| you        | thank        | 19/0       |             |
| you        | blame        | 2/0        |             |
| you        | deflect      | 6/0        |             |
| you        | promise      | 7/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### family-absence (threat, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | confront     | 86/0       |             |
| relative   | plea         | 1/0        |             |
| relative   | press        | 11/0       |             |
| relative   | accept       | 35/0       |             |
| relative   | warn         | 15/0       |             |
| you        | apologize    | 5/0        |             |
| you        | promise      | 6/0        |             |
| you        | deflect      | 8/0        |             |
| you        | blame        | 2/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### rally-opponent (threat, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| opponent   | confront     | 86/0       |             |
| opponent   | boast        | 8/0        |             |
| opponent   | press        | 11/0       |             |
| opponent   | threaten     | -          |             |
| opponent   | accept       | 35/0       |             |
| you        | disagree     | 9/0        |             |
| you        | deflect      | 8/0        |             |
| you        | confront     | 86/0       |             |
| you        | boast        | 8/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### desk-bill (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| aide       | deliver-news | 7/0        |             |
| aide       | answer       | 22/0       |             |
| aide       | press        | 39/0       |             |
| aide       | thank        | 20/0       |             |
| you        | agree        | 38/0       |             |
| you        | refuse       | 45/0       |             |
| you        | ask          | 17/0       |             |
| you        | stall        | 22/0       |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### staff-news (news-received, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| aide       | deliver-news | 4/0        |             |
| aide       | answer       | 10/0       |             |
| aide       | disagree     | 4/0        |             |
| aide       | comfort      | 5/0        |             |
| aide       | promise      | 5/0        |             |
| you        | ask          | 18/0       |             |
| you        | blame        | 3/0        |             |
| you        | accept       | 14/0       |             |
| you        | deflect      | 5/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### section-bargain (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| member     | bargain      | 26/0       |             |
| member     | press        | 39/0       |             |
| member     | threaten     | 10/0       |             |
| member     | accept       | 42/0       |             |
| member     | thank        | 20/0       |             |
| you        | agree        | 38/0       |             |
| you        | refuse       | 45/0       |             |
| you        | bargain      | 26/0       |             |
| you        | stall        | 22/0       |             |
| you        | relent       | 4/0        |             |
| (narrator) | narrate      |            | 87/0        |
| (narrator) | deliver-news |            | 45/0        |

### new-baby (honor, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| parent     | tell         | 6/0          |             |         |
| parent     | thank        | 4/0          |             |         |
| parent     | confess      | -            |             |         |
| parent     | request      | 12/0         |             |         |
| visitor    | greet        | 25/0         |             |         |
| visitor    | ask          | 47/1         |             |         |
| visitor    | comfort      | -            |             |         |
| visitor    | offer        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 96/1    |
| (narrator) | recall       |              |             | 38/2    |

### cause-invite (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| invited    | ask          | 45/1         |             |         |
| invited    | agree        | 2/0          |             |         |
| invited    | decline      | -            |             |         |
| invited    | deflect      | -            |             |         |
| recruiter  | request      | 12/0         |             |         |
| recruiter  | tell         | 4/0          |             |         |
| recruiter  | offer        | -            |             |         |
| recruiter  | press        | -            |             |         |
| (narrator) | narrate      |              | 87/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |
