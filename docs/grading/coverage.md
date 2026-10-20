# Words coverage: situations, roles, moves and registers

Built by `npm run words:coverage` (`scripts/dialogue-batch/coverage-table.ts`) from the director's catalog (`src/director/data/situation-types.json`), the banks (`data/english/parts/`, each part tagged by `scripts/english-corpus/tag-moves.ts` from `scripts/english-corpus/moves.json`) and the owner's grades (`data/english/part-grades.json`). A cell is one situation type, one role, one move that role may make and one register the situation is composed in; a narrated register (the memoir, scene narration, headlines, a law, the minutes) has narrator cells instead. A part fits a cell when it carries the move in that register and its key is the situation's or none. **Parts** counts the fitting parts; **passed** counts those the owner graded good and the grades do not hold back.

## Totals

| Measure                                     | Count |
| ------------------------------------------- | ----- |
| Situation types                             | 63    |
| Cells                                       | 940   |
| Cells with at least one part                | 619   |
| Empty cells (the mining and authoring list) | 321   |
| Cells with parts but none graded pass       | 498   |
| Cells with a part graded pass               | 121   |
| Part fits counted over all cells            | 16410 |

## By endpoint

| Endpoint  | Situation types | Cells | Empty cells | Cells with a pass |
| --------- | --------------- | ----- | ----------- | ----------------- |
| money     | 6               | 79    | 19          | 12                |
| bill      | 9               | 156   | 60          | 14                |
| political | 16              | 300   | 109         | 21                |
| personal  | 32              | 405   | 133         | 74                |

## By situation key

| Key           | Situation types | Cells | Empty cells | Cells with a pass |
| ------------- | --------------- | ----- | ----------- | ----------------- |
| loss          | 8               | 120   | 40          | 25                |
| threat        | 10              | 175   | 94          | 17                |
| honor         | 5               | 80    | 28          | 10                |
| news-received | 7               | 83    | 26          | 12                |
| favor-asked   | 9               | 108   | 19          | 10                |
| vote-wanted   | 6               | 113   | 41          | 2                 |
| arrival       | 5               | 59    | 14          | 10                |
| departure     | 2               | 25    | 6           | 9                 |
| routine       | 11              | 177   | 53          | 26                |

## Emptiest situations

Situation types by their share of empty cells, emptiest first.

| Situation         | Key           | Endpoint  | Cells | Empty | Parts fitting | Passed |
| ----------------- | ------------- | --------- | ----- | ----- | ------------- | ------ |
| floor-vote        | vote-wanted   | bill      | 35    | 30    | 227           | 3      |
| recall            | threat        | political | 29    | 23    | 192           | 4      |
| scandal           | threat        | political | 37    | 28    | 220           | 2      |
| argument          | threat        | personal  | 24    | 16    | 271           | 3      |
| news-arrives      | news-received | personal  | 20    | 12    | 275           | 3      |
| veto              | loss          | bill      | 20    | 12    | 205           | 4      |
| race-won          | honor         | political | 30    | 17    | 215           | 4      |
| accusation        | threat        | personal  | 14    | 7     | 271           | 3      |
| apology           | routine       | personal  | 12    | 6     | 248           | 3      |
| betrayal          | threat        | personal  | 12    | 6     | 275           | 3      |
| race-lost         | loss          | political | 23    | 11    | 211           | 8      |
| eviction-notice   | loss          | money     | 20    | 9     | 450           | 5      |
| hearing           | threat        | personal  | 14    | 6     | 271           | 3      |
| reconciliation    | routine       | personal  | 14    | 6     | 276           | 3      |
| confession        | news-received | personal  | 12    | 5     | 274           | 3      |
| bill-signed       | honor         | bill      | 15    | 6     | 235           | 4      |
| public-hearing    | routine       | bill      | 25    | 10    | 129           | 8      |
| verdict           | news-received | personal  | 15    | 6     | 308           | 4      |
| campaign-stop     | vote-wanted   | political | 30    | 11    | 286           | 0      |
| press-interview   | routine       | political | 22    | 8     | 232           | 0      |
| warning           | threat        | personal  | 11    | 4     | 265           | 3      |
| departure         | departure     | personal  | 14    | 5     | 417           | 6      |
| care              | routine       | personal  | 12    | 4     | 274           | 3      |
| favor-asked       | favor-asked   | personal  | 12    | 4     | 272           | 3      |
| law-takes-effect  | news-received | money     | 10    | 3     | 190           | 4      |
| becoming-friends  | routine       | personal  | 14    | 4     | 284           | 3      |
| breakup           | loss          | personal  | 14    | 4     | 403           | 5      |
| date              | routine       | personal  | 14    | 4     | 284           | 3      |
| layoff            | loss          | money     | 14    | 4     | 385           | 4      |
| reunion           | arrival       | personal  | 14    | 4     | 299           | 3      |
| asking-permission | favor-asked   | personal  | 11    | 3     | 278           | 3      |
| advice            | routine       | personal  | 12    | 3     | 278           | 3      |
| appointment       | honor         | political | 12    | 3     | 196           | 3      |
| filing            | routine       | political | 20    | 5     | 259           | 3      |
| first-day         | arrival       | personal  | 12    | 3     | 285           | 3      |
| first-meeting     | arrival       | personal  | 12    | 3     | 275           | 3      |
| proposal          | favor-asked   | personal  | 12    | 3     | 276           | 3      |
| rescue            | threat        | personal  | 12    | 3     | 273           | 3      |
| return            | arrival       | personal  | 12    | 3     | 295           | 3      |
| visit             | routine       | personal  | 12    | 3     | 280           | 3      |
| interview         | favor-asked   | money     | 11    | 2     | 282           | 3      |
| reach-out         | favor-asked   | personal  | 12    | 2     | 290           | 3      |
| bill-carry        | favor-asked   | bill      | 13    | 2     | 190           | 0      |
| celebration       | honor         | personal  | 13    | 2     | 297           | 3      |
| party-ask         | favor-asked   | political | 13    | 2     | 193           | 0      |
| arrival           | arrival       | personal  | 9     | 1     | 271           | 3      |
| last-day          | departure     | personal  | 11    | 1     | 383           | 5      |
| rally-opponent    | threat        | political | 11    | 1     | 180           | 0      |
| donor-ask         | favor-asked   | money     | 13    | 1     | 196           | 0      |
| desk-bill         | vote-wanted   | bill      | 10    | 0     | 196           | 0      |
| family-absence    | threat        | political | 11    | 0     | 165           | 0      |
| family-filing     | news-received | political | 11    | 0     | 169           | 0      |
| family-loss       | loss          | political | 10    | 0     | 147           | 0      |
| family-win        | honor         | political | 10    | 0     | 146           | 0      |
| funeral           | loss          | personal  | 12    | 0     | 445           | 5      |
| gathering-missing | loss          | personal  | 7     | 0     | 301           | 3      |
| letter            | news-received | personal  | 4     | 0     | 244           | 3      |
| office-hours      | favor-asked   | money     | 11    | 0     | 197           | 0      |
| polling-place     | routine       | political | 20    | 0     | 406           | 5      |
| section-bargain   | vote-wanted   | bill      | 12    | 0     | 233           | 0      |
| staff-news        | news-received | political | 11    | 0     | 173           | 0      |
| vote-asked        | vote-wanted   | bill      | 13    | 0     | 238           | 0      |
| vote-confirmed    | vote-wanted   | bill      | 13    | 0     | 229           | 0      |

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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 85/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 93/1    |
| (narrator) | recall       |              |             | 38/2    |

### news-arrives (news-received, personal)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| bearer     | tell         | 4/0          |             |         | -           |
| bearer     | comfort      | -            |             |         | -           |
| bearer     | deflect      | -            |             |         | -           |
| bearer     | lie          | 16/0         |             |         | -           |
| receiver   | thank        | 2/0          |             |         | -           |
| receiver   | blame        | -            |             |         | 9/0         |
| receiver   | confront     | -            |             |         | -           |
| receiver   | comfort      | -            |             |         | -           |
| (narrator) | narrate      |              | 83/0        |         |             |
| (narrator) | deliver-news |              | 45/0        |         |             |
| (narrator) | tell         |              |             | 78/1    |             |
| (narrator) | recall       |              |             | 38/2    |             |

### letter (news-received, personal)

| Role       | Move         | journal | scene-words |
| ---------- | ------------ | ------- | ----------- |
| (narrator) | tell         | 78/1    |             |
| (narrator) | recall       | 38/2    |             |
| (narrator) | narrate      |         | 83/0        |
| (narrator) | deliver-news |         | 45/0        |

### argument (threat, personal)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| side       | confront     | -            |             |         | -           |
| side       | blame        | -            |             |         | 9/0         |
| side       | deflect      | -            |             |         | -           |
| side       | apologize    | -            |             |         | -           |
| other-side | confront     | -            |             |         | -           |
| other-side | blame        | -            |             |         | 9/0         |
| other-side | refuse       | -            |             |         | -           |
| other-side | agree        | 2/0          |             |         | -           |
| witness    | comfort      | -            |             |         | -           |
| witness    | tell         | 4/0          |             |         | -           |
| (narrator) | narrate      |              | 83/0        |         |             |
| (narrator) | deliver-news |              | 45/0        |         |             |
| (narrator) | tell         |              |             | 81/1    |             |
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
| (narrator)  | narrate      |              | 83/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 78/1    |
| (narrator)  | recall       |              |             | 38/2    |

### confession (news-received, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| telling    | confess      | -            |             |         |
| telling    | lie          | 16/0         |             |         |
| telling    | deflect      | -            |             |         |
| telling    | request      | 12/0         |             |         |
| told       | comfort      | -            |             |         |
| told       | blame        | -            |             |         |
| told       | thank        | 2/0          |             |         |
| told       | promise      | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator)   | narrate      |              | 83/0        |         |
| (narrator)   | deliver-news |              | 45/0        |         |
| (narrator)   | tell         |              |             | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 38/2    |

### gathering-missing (loss, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| household  | recall       | 14/0         |             |         |
| household  | comfort      | 28/0         |             |         |
| household  | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 89/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 89/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 93/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 93/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 85/1    |
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
| (narrator)  | narrate      |              | 83/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 78/1    |
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
| (narrator)    | narrate      |              | 83/0        |         |
| (narrator)    | deliver-news |              | 45/0        |         |
| (narrator)    | tell         |              |             | 78/1    |
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
| (narrator)  | narrate      |              | 83/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 89/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 93/1    |
| (narrator) | recall       |              |             | 38/2    |

### betrayal (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| betrayed   | blame        | -            |             |         |
| betrayed   | confront     | -            |             |         |
| betrayed   | refuse       | -            |             |         |
| betrayed   | request      | 12/0         |             |         |
| betrayer   | apologize    | -            |             |         |
| betrayer   | lie          | 16/0         |             |         |
| betrayer   | deflect      | -            |             |         |
| betrayer   | confess      | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 81/1    |
| (narrator) | recall       |              |             | 38/2    |

### rescue (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| rescuer    | offer        | -            |             |         |
| rescuer    | comfort      | -            |             |         |
| rescuer    | tell         | 4/0          |             |         |
| in-danger  | request      | 12/0         |             |         |
| in-danger  | thank        | 2/0          |             |         |
| in-danger  | tell         | 4/0          |             |         |
| bystanders | tell         | 4/0          |             |         |
| bystanders | offer        | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 81/1    |
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
| (narrator)  | narrate      |              | 83/0        |         |
| (narrator)  | deliver-news |              | 45/0        |         |
| (narrator)  | tell         |              |             | 78/1    |
| (narrator)  | recall       |              |             | 38/2    |

### arrival (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| household  | offer        | -            |             |         |
| household  | tell         | 4/0          |             |         |
| household  | thank        | 2/0          |             |         |
| newcomer   | thank        | 2/0          |             |         |
| newcomer   | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 93/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
| (narrator) | recall       |              |             | 38/2    |

### accusation (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| accuser    | confront     | -            |             |         |
| accuser    | blame        | -            |             |         |
| accuser    | tell         | 4/0          |             |         |
| accused    | deflect      | -            |             |         |
| accused    | lie          | 16/0         |             |         |
| accused    | confess      | -            |             |         |
| accused    | apologize    | -            |             |         |
| accused    | refuse       | -            |             |         |
| witnesses  | tell         | 4/0          |             |         |
| witnesses  | comfort      | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 81/1    |
| (narrator) | recall       |              |             | 38/2    |

### warning (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| warning    | tell         | 4/0          |             |         |
| warning    | offer        | -            |             |         |
| warning    | request      | 12/0         |             |         |
| at-risk    | thank        | 2/0          |             |         |
| at-risk    | deflect      | -            |             |         |
| at-risk    | refuse       | -            |             |         |
| at-risk    | promise      | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 81/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator) | tell   |              |         | 78/1    |
| (narrator) | recall |              |         | 38/2    |

### hearing (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| accused    | deflect      | -            |             |         |
| accused    | confess      | -            |             |         |
| accused    | refuse       | -            |             |         |
| accused    | tell         | 4/0          |             |         |
| accused    | request      | 12/0         |             |         |
| family     | comfort      | -            |             |         |
| family     | tell         | 4/0          |             |         |
| family     | promise      | -            |             |         |
| others     | tell         | 4/0          |             |         |
| others     | blame        | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 81/1    |
| (narrator) | recall       |              |             | 38/2    |

### verdict (news-received, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| defendant  | thank        | 2/0          |             |         |
| defendant  | confess      | -            |             |         |
| defendant  | apologize    | -            |             |         |
| defendant  | refuse       | -            |             |         |
| defendant  | tell         | 4/0          |             |         |
| family     | comfort      | -            |             |         |
| family     | tell         | 4/0          |             |         |
| family     | promise      | -            |             |         |
| family     | farewell     | 50/1         |             |         |
| others     | tell         | 4/0          |             |         |
| others     | blame        | -            |             |         |
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 78/1    |
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
| (narrator) | tell            |                 |              | 87/1    |          |           |
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
| (narrator) | tell         |                    |              | 89/1    |          |
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
| (narrator) | tell            |         |               |         |                | 78/1    |
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
| (narrator) | tell            |             |      |           | 87/1    |              |
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
| (narrator) | tell            |      |          |              | 89/1    |
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
| (narrator) | tell            |              | 87/1    |           |      |
| (narrator) | recall          |              | 38/2    |           |      |
| (narrator) | headline        |              |         | 41/0      |      |
| (narrator) | deliver-news    |              |         |           | -    |
| (narrator) | announce-result |              |         |           | 2/0  |

### recall (threat, political)

| Role        | Move     | conversation | newscast | journal | address/campaign |
| ----------- | -------- | ------------ | -------- | ------- | ---------------- |
| official    | deflect  | -            | -        |         | -                |
| official    | tell     | 4/0          | -        |         | -                |
| official    | request  | 12/0         | -        |         | -                |
| official    | disagree | -            | -        |         | -                |
| petitioners | blame    | -            | -        |         | -                |
| petitioners | confront | -            | -        |         | -                |
| petitioners | request  | 12/0         | -        |         | -                |
| family      | comfort  | -            | -        |         | -                |
| family      | ask      | 45/1         | -        |         | -                |
| (narrator)  | tell     |              |          | 81/1    |                  |
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
| reporter   | greet        | 2/0        |             | -         |
| reporter   | ask          | 7/0        |             | 23/0      |
| reporter   | confront     | 3/0        |             | 3/0       |
| reporter   | close        | -          |             | 7/0       |
| official   | answer       | 13/0       |             | -         |
| official   | deflect      | 2/0        |             | 18/0      |
| official   | tell         | -          |             | 11/0      |
| official   | promise      | -          |             | 8/0       |
| official   | disagree     | -          |             | -         |
| official   | close        | -          |             | 7/0       |
| (narrator) | narrate      |            | 83/0        |           |
| (narrator) | deliver-news |            | 45/0        |           |

### scandal (threat, political)

| Role       | Move      | newscast | headlines | conversation | interview | bring-it-up |
| ---------- | --------- | -------- | --------- | ------------ | --------- | ----------- |
| exposed    | deflect   | -        |           | -            | 18/0      | -           |
| exposed    | lie       | -        |           | 16/0         | -         | -           |
| exposed    | confess   | -        |           | -            | -         | -           |
| exposed    | apologize | -        |           | -            | -         | -           |
| reporter   | ask       | -        |           | 45/1         | 23/0      | -           |
| reporter   | confront  | -        |           | -            | 3/0       | -           |
| family     | comfort   | -        |           | -            | -         | -           |
| family     | blame     | -        |           | -            | -         | 9/0         |
| family     | ask       | -        |           | 45/1         | 23/0      | -           |
| (narrator) | headline  |          | 38/0      |              |           |             |

### law-takes-effect (news-received, money)

| Role       | Move            | bring-it-up | conversation | journal | news |
| ---------- | --------------- | ----------- | ------------ | ------- | ---- |
| reached    | ask             | -           | 59/1         |         |      |
| reached    | blame           | 9/0         | -            |         |      |
| reached    | tell            | -           | 4/0          |         |      |
| (narrator) | tell            |             |              | 78/1    |      |
| (narrator) | recall          |             |              | 38/2    |      |
| (narrator) | deliver-news    |             |              |         | 1/0  |
| (narrator) | announce-result |             |              |         | 1/0  |

### campaign-stop (vote-wanted, political)

| Role       | Move         | scene-talk | scene-words | address/campaign |
| ---------- | ------------ | ---------- | ----------- | ---------------- |
| volunteer  | request      | 9/0        |             | 9/0              |
| volunteer  | ask          | 6/0        |             | -                |
| volunteer  | thank        | 13/0       |             | 7/0              |
| volunteer  | promise      | 3/0        |             | -                |
| candidate  | greet        | 11/0       |             | -                |
| candidate  | introduce    | -          |             | -                |
| candidate  | tell         | -          |             | 34/0             |
| candidate  | request      | 9/0        |             | 9/0              |
| candidate  | promise      | 3/0        |             | -                |
| candidate  | close        | -          |             | 4/0              |
| voters     | ask          | 6/0        |             | -                |
| voters     | agree        | 7/0        |             | -                |
| voters     | disagree     | -          |             | 8/0              |
| voters     | thank        | 13/0       |             | 7/0              |
| (narrator) | narrate      |            | 83/0        |                  |
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
| (narrator) | tell    |              |         | 78/1    |
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
| (narrator) | narrate      |              | 83/0        |         |
| (narrator) | deliver-news |              | 45/0        |         |
| (narrator) | tell         |              |             | 89/1    |
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
| (narrator) | narrate      |              | 83/0        |         |             |
| (narrator) | deliver-news |              | 45/0        |         |             |
| (narrator) | tell         |              |             | 89/1    |             |
| (narrator) | recall       |              |             | 38/2    |             |

### vote-asked (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| colleague  | request      | 9/0        |             |
| colleague  | plea         | 8/0        |             |
| colleague  | press        | 19/0       |             |
| colleague  | threaten     | 4/0        |             |
| colleague  | thank        | 13/0       |             |
| colleague  | accept       | 16/0       |             |
| you        | agree        | 7/0        |             |
| you        | refuse       | 10/0       |             |
| you        | bargain      | 12/0       |             |
| you        | stall        | 8/0        |             |
| you        | relent       | 4/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### vote-confirmed (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| colleague  | ask          | 6/0        |             |
| colleague  | plea         | 8/0        |             |
| colleague  | press        | 19/0       |             |
| colleague  | threaten     | 4/0        |             |
| colleague  | thank        | 13/0       |             |
| colleague  | accept       | 16/0       |             |
| you        | agree        | 7/0        |             |
| you        | withdraw     | 4/0        |             |
| you        | bargain      | 12/0       |             |
| you        | stall        | 8/0        |             |
| you        | relent       | 4/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### bill-carry (favor-asked, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| member     | request      | 14/0       |             |
| member     | plea         | 7/0        |             |
| member     | press        | 3/0        |             |
| member     | bargain      | 3/0        |             |
| member     | thank        | 11/0       |             |
| member     | accept       | 10/0       |             |
| you        | agree        | 6/0        |             |
| you        | decline      | 5/0        |             |
| you        | bargain      | 3/0        |             |
| you        | stall        | -          |             |
| you        | relent       | -          |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### donor-ask (favor-asked, money)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| donor      | request      | 14/0       |             |
| donor      | press        | 3/0        |             |
| donor      | threaten     | 6/0        |             |
| donor      | bargain      | 3/0        |             |
| donor      | thank        | 11/0       |             |
| donor      | accept       | 10/0       |             |
| you        | agree        | 6/0        |             |
| you        | refuse       | 5/0        |             |
| you        | bargain      | 3/0        |             |
| you        | deflect      | 7/0        |             |
| you        | relent       | -          |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### party-ask (favor-asked, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| chair      | request      | 14/0       |             |
| chair      | press        | 3/0        |             |
| chair      | threaten     | 6/0        |             |
| chair      | plea         | 7/0        |             |
| chair      | thank        | 11/0       |             |
| chair      | accept       | 10/0       |             |
| you        | agree        | 6/0        |             |
| you        | refuse       | 5/0        |             |
| you        | bargain      | 3/0        |             |
| you        | stall        | -          |             |
| you        | relent       | -          |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### office-hours (favor-asked, money)

| Role        | Move         | scene-talk | scene-words |
| ----------- | ------------ | ---------- | ----------- |
| constituent | request      | 14/0       |             |
| constituent | plea         | 7/0        |             |
| constituent | press        | 3/0        |             |
| constituent | thank        | 11/0       |             |
| constituent | accept       | 10/0       |             |
| you         | promise      | 9/0        |             |
| you         | ask          | 7/0        |             |
| you         | decline      | 5/0        |             |
| you         | offer        | 3/0        |             |
| (narrator)  | narrate      |            | 83/0        |
| (narrator)  | deliver-news |            | 45/0        |

### family-filing (news-received, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | ask          | 12/0       |             |
| relative   | plea         | 1/0        |             |
| relative   | comfort      | 5/0        |             |
| relative   | press        | 5/0        |             |
| relative   | thank        | 6/0        |             |
| you        | tell         | 3/0        |             |
| you        | request      | 1/0        |             |
| you        | deflect      | 3/0        |             |
| you        | comfort      | 5/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### family-win (honor, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | congratulate | 3/0        |             |
| relative   | ask          | 1/0        |             |
| relative   | promise      | 3/0        |             |
| relative   | thank        | 2/0        |             |
| you        | thank        | 2/0        |             |
| you        | promise      | 3/0        |             |
| you        | boast        | 2/0        |             |
| you        | tell         | 2/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### family-loss (loss, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | comfort      | 5/0        |             |
| relative   | ask          | 1/0        |             |
| relative   | plea         | 1/0        |             |
| relative   | thank        | 3/0        |             |
| you        | thank        | 3/0        |             |
| you        | blame        | 2/0        |             |
| you        | deflect      | 2/0        |             |
| you        | promise      | 2/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### family-absence (threat, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| relative   | confront     | 14/0       |             |
| relative   | plea         | 1/0        |             |
| relative   | press        | 4/0        |             |
| relative   | accept       | 5/0        |             |
| relative   | warn         | 2/0        |             |
| you        | apologize    | 2/0        |             |
| you        | promise      | 3/0        |             |
| you        | deflect      | 4/0        |             |
| you        | blame        | 2/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### rally-opponent (threat, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| opponent   | confront     | 14/0       |             |
| opponent   | boast        | 3/0        |             |
| opponent   | press        | 4/0        |             |
| opponent   | threaten     | -          |             |
| opponent   | accept       | 5/0        |             |
| you        | disagree     | 5/0        |             |
| you        | deflect      | 4/0        |             |
| you        | confront     | 14/0       |             |
| you        | boast        | 3/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### desk-bill (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| aide       | deliver-news | 3/0        |             |
| aide       | answer       | 2/0        |             |
| aide       | press        | 19/0       |             |
| aide       | thank        | 13/0       |             |
| you        | agree        | 7/0        |             |
| you        | refuse       | 10/0       |             |
| you        | ask          | 6/0        |             |
| you        | stall        | 8/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### staff-news (news-received, political)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| aide       | deliver-news | 3/0        |             |
| aide       | answer       | 6/0        |             |
| aide       | disagree     | 3/0        |             |
| aide       | comfort      | 5/0        |             |
| aide       | promise      | 4/0        |             |
| you        | ask          | 12/0       |             |
| you        | blame        | 2/0        |             |
| you        | accept       | 7/0        |             |
| you        | deflect      | 3/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |

### section-bargain (vote-wanted, bill)

| Role       | Move         | scene-talk | scene-words |
| ---------- | ------------ | ---------- | ----------- |
| member     | bargain      | 12/0       |             |
| member     | press        | 19/0       |             |
| member     | threaten     | 4/0        |             |
| member     | accept       | 16/0       |             |
| member     | thank        | 13/0       |             |
| you        | agree        | 7/0        |             |
| you        | refuse       | 10/0       |             |
| you        | bargain      | 12/0       |             |
| you        | stall        | 8/0        |             |
| you        | relent       | 4/0        |             |
| (narrator) | narrate      |            | 83/0        |
| (narrator) | deliver-news |            | 45/0        |
