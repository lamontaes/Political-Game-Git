# Words coverage: situations, roles, moves and registers

Built by `npm run words:coverage` (`scripts/dialogue-batch/coverage-table.ts`) from the director's catalog (`src/director/data/situation-types.json`), the banks (`data/english/parts/`, each part tagged by `scripts/english-corpus/tag-moves.ts` from `scripts/english-corpus/moves.json`) and the owner's grades (`data/english/part-grades.json`). A cell is one situation type, one role, one move that role may make and one register the situation is composed in; a narrated register (the memoir, scene narration, headlines, a law, the minutes) has narrator cells instead. A part fits a cell when it carries the move in that register and its key is the situation's or none. **Parts** counts the fitting parts; **passed** counts those the owner graded good and the grades do not hold back.

## Totals

| Measure                                     | Count |
| ------------------------------------------- | ----- |
| Situation types                             | 49    |
| Cells                                       | 776   |
| Cells with at least one part                | 511   |
| Empty cells (the mining and authoring list) | 265   |
| Cells with parts but none graded pass       | 387   |
| Cells with a part graded pass               | 124   |
| Part fits counted over all cells            | 12872 |

## By endpoint

| Endpoint  | Situation types | Cells | Empty cells | Cells with a pass |
| --------- | --------------- | ----- | ----------- | ----------------- |
| money     | 4               | 55    | 17          | 12                |
| bill      | 4               | 95    | 44          | 14                |
| political | 9               | 213   | 103         | 24                |
| personal  | 32              | 413   | 101         | 74                |

## By situation key

| Key           | Situation types | Cells | Empty cells | Cells with a pass |
| ------------- | --------------- | ----- | ----------- | ----------------- |
| loss          | 7               | 118   | 48          | 25                |
| threat        | 8               | 153   | 62          | 17                |
| honor         | 4               | 70    | 33          | 10                |
| news-received | 5               | 61    | 10          | 12                |
| favor-asked   | 5               | 58    | 14          | 10                |
| vote-wanted   | 2               | 57    | 26          | 5                 |
| arrival       | 5               | 59    | 14          | 10                |
| departure     | 2               | 25    | 6           | 9                 |
| routine       | 11              | 175   | 52          | 26                |

## Emptiest situations

Situation types by their share of empty cells, emptiest first.

| Situation         | Key           | Endpoint  | Cells | Empty | Parts fitting | Passed |
| ----------------- | ------------- | --------- | ----- | ----- | ------------- | ------ |
| recall            | threat        | political | 29    | 20    | 209           | 4      |
| veto              | loss          | bill      | 20    | 13    | 212           | 4      |
| scandal           | threat        | political | 37    | 24    | 235           | 2      |
| race-won          | honor         | political | 30    | 19    | 210           | 4      |
| apology           | routine       | personal  | 12    | 6     | 229           | 3      |
| press-interview   | routine       | political | 20    | 10    | 123           | 0      |
| floor-vote        | vote-wanted   | bill      | 35    | 17    | 329           | 3      |
| race-lost         | loss          | political | 23    | 11    | 208           | 8      |
| bill-signed       | honor         | bill      | 15    | 7     | 233           | 4      |
| argument          | threat        | personal  | 24    | 11    | 270           | 3      |
| eviction-notice   | loss          | money     | 20    | 9     | 394           | 5      |
| reconciliation    | routine       | personal  | 14    | 6     | 253           | 3      |
| appointment       | honor         | political | 12    | 5     | 193           | 3      |
| campaign-stop     | vote-wanted   | political | 22    | 9     | 262           | 4      |
| news-arrives      | news-received | personal  | 20    | 8     | 269           | 3      |
| departure         | departure     | personal  | 14    | 5     | 344           | 6      |
| funeral           | loss          | personal  | 20    | 7     | 374           | 5      |
| care              | routine       | personal  | 12    | 4     | 243           | 3      |
| favor-asked       | favor-asked   | personal  | 12    | 4     | 241           | 3      |
| becoming-friends  | routine       | personal  | 14    | 4     | 261           | 3      |
| breakup           | loss          | personal  | 14    | 4     | 337           | 5      |
| date              | routine       | personal  | 14    | 4     | 261           | 3      |
| layoff            | loss          | money     | 14    | 4     | 333           | 4      |
| reunion           | arrival       | personal  | 14    | 4     | 275           | 4      |
| public-hearing    | routine       | bill      | 25    | 7     | 143           | 8      |
| asking-permission | favor-asked   | personal  | 11    | 3     | 254           | 3      |
| advice            | routine       | personal  | 12    | 3     | 251           | 3      |
| filing            | routine       | political | 20    | 5     | 274           | 3      |
| first-day         | arrival       | personal  | 12    | 3     | 259           | 4      |
| first-meeting     | arrival       | personal  | 12    | 3     | 255           | 4      |
| proposal          | favor-asked   | personal  | 12    | 3     | 245           | 3      |
| return            | arrival       | personal  | 12    | 3     | 271           | 4      |
| visit             | routine       | personal  | 12    | 3     | 253           | 3      |
| law-takes-effect  | news-received | money     | 10    | 2     | 212           | 4      |
| interview         | favor-asked   | money     | 11    | 2     | 258           | 3      |
| betrayal          | threat        | personal  | 12    | 2     | 263           | 3      |
| reach-out         | favor-asked   | personal  | 12    | 2     | 257           | 3      |
| rescue            | threat        | personal  | 12    | 2     | 264           | 3      |
| celebration       | honor         | personal  | 13    | 2     | 264           | 3      |
| accusation        | threat        | personal  | 14    | 2     | 276           | 3      |
| arrival           | arrival       | personal  | 9     | 1     | 251           | 4      |
| last-day          | departure     | personal  | 11    | 1     | 328           | 5      |
| warning           | threat        | personal  | 11    | 1     | 254           | 3      |
| confession        | news-received | personal  | 12    | 0     | 262           | 3      |
| gathering-missing | loss          | personal  | 7     | 0     | 271           | 3      |
| hearing           | threat        | personal  | 14    | 0     | 277           | 3      |
| letter            | news-received | personal  | 4     | 0     | 225           | 3      |
| polling-place     | routine       | political | 20    | 0     | 415           | 5      |
| verdict           | news-received | personal  | 15    | 0     | 292           | 4      |

## Every cell

One row per situation, role and move; each register shows parts/passed. A dash is an empty cell.

### departure (departure, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| leaving    | farewell     | 34/1         |             |         |
| leaving    | promise      | -            |             |         |
| leaving    | comfort      | -            |             |         |
| leaving    | tell         | 4/0          |             |         |
| staying    | farewell     | 34/1         |             |         |
| staying    | comfort      | -            |             |         |
| staying    | request      | 6/0          |             |         |
| staying    | blame        | -            |             |         |
| others     | farewell     | 34/1         |             |         |
| others     | comfort      | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 94/1    |
| (narrator) | recall       |              |             | 44/2    |

### return (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| returning  | tell         | 4/0          |             |         |
| returning  | apologize    | -            |             |         |
| returning  | thank        | 2/0          |             |         |
| returning  | recall       | 12/0         |             |         |
| waiting    | comfort      | -            |             |         |
| waiting    | confront     | -            |             |         |
| waiting    | recall       | 12/0         |             |         |
| waiting    | thank        | 2/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 101/2   |
| (narrator) | recall       |              |             | 44/2    |

### news-arrives (news-received, personal)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| bearer     | tell         | 5/0          |             |         | -           |
| bearer     | comfort      | 2/0          |             |         | -           |
| bearer     | deflect      | 2/0          |             |         | -           |
| bearer     | lie          | 17/0         |             |         | -           |
| receiver   | thank        | 2/0          |             |         | -           |
| receiver   | blame        | 5/0          |             |         | 9/0         |
| receiver   | confront     | -            |             |         | -           |
| receiver   | comfort      | 2/0          |             |         | -           |
| (narrator) | narrate      |              | 69/0        |         |             |
| (narrator) | deliver-news |              | 25/0        |         |             |
| (narrator) | tell         |              |             | 87/1    |             |
| (narrator) | recall       |              |             | 44/2    |             |

### letter (news-received, personal)

| Role       | Move         | journal | scene-words |
| ---------- | ------------ | ------- | ----------- |
| (narrator) | tell         | 87/1    |             |
| (narrator) | recall       | 44/2    |             |
| (narrator) | narrate      |         | 69/0        |
| (narrator) | deliver-news |         | 25/0        |

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
| (narrator) | narrate      |              | 69/0        |         |             |
| (narrator) | deliver-news |              | 25/0        |         |             |
| (narrator) | tell         |              |             | 90/1    |             |
| (narrator) | recall       |              |             | 44/2    |             |

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
| (narrator)  | narrate      |              | 69/0        |         |
| (narrator)  | deliver-news |              | 25/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 44/2    |

### confession (news-received, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| telling    | confess      | 2/0          |             |         |
| telling    | lie          | 17/0         |             |         |
| telling    | deflect      | 2/0          |             |         |
| telling    | request      | 6/0          |             |         |
| told       | comfort      | 2/0          |             |         |
| told       | blame        | 5/0          |             |         |
| told       | thank        | 2/0          |             |         |
| told       | promise      | 1/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### favor-asked (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| asker      | request      | 6/0          |             |         |
| asker      | offer        | -            |             |         |
| asker      | promise      | -            |             |         |
| asker      | thank        | 2/0          |             |         |
| asked      | agree        | 2/0          |             |         |
| asked      | decline      | -            |             |         |
| asked      | offer        | -            |             |         |
| asked      | request      | 6/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### reach-out (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| asking     | request      | 6/0          |             |         |
| asking     | tell         | 4/0          |             |         |
| asking     | recall       | 12/0         |             |         |
| asking     | offer        | -            |             |         |
| asked      | agree        | 2/0          |             |         |
| asked      | decline      | -            |             |         |
| asked      | request      | 6/0          |             |         |
| asked      | thank        | 2/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### becoming-friends (routine, personal)

| Role         | Move         | conversation | scene-words | journal |
| ------------ | ------------ | ------------ | ----------- | ------- |
| friend       | tell         | 4/0          |             |         |
| friend       | recall       | 12/0         |             |         |
| friend       | offer        | -            |             |         |
| friend       | thank        | 2/0          |             |         |
| friend       | confess      | -            |             |         |
| other-friend | tell         | 4/0          |             |         |
| other-friend | recall       | 12/0         |             |         |
| other-friend | offer        | -            |             |         |
| other-friend | thank        | 2/0          |             |         |
| other-friend | confess      | -            |             |         |
| (narrator)   | narrate      |              | 69/0        |         |
| (narrator)   | deliver-news |              | 25/0        |         |
| (narrator)   | tell         |              |             | 87/1    |
| (narrator)   | recall       |              |             | 44/2    |

### celebration (honor, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| honoree    | thank        | 2/0          |             |         |
| honoree    | tell         | 4/0          |             |         |
| honoree    | recall       | 12/0         |             |         |
| host       | offer        | -            |             |         |
| host       | tell         | 4/0          |             |         |
| host       | thank        | 2/0          |             |         |
| guests     | thank        | 2/0          |             |         |
| guests     | tell         | 4/0          |             |         |
| guests     | offer        | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 96/1    |
| (narrator) | recall       |              |             | 44/2    |

### gathering-missing (loss, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| household  | recall       | 12/0         |             |         |
| household  | comfort      | 19/0         |             |         |
| household  | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 44/2    |

### funeral (loss, personal)

| Role       | Move         | conversation | scene-words | journal | address/house-floor |
| ---------- | ------------ | ------------ | ----------- | ------- | ------------------- |
| mourners   | comfort      | 19/0         |             |         | -                   |
| mourners   | recall       | 12/0         |             |         | -                   |
| mourners   | tell         | 4/0          |             |         | 2/0                 |
| mourners   | farewell     | 34/1         |             |         | -                   |
| family     | thank        | 2/0          |             |         | -                   |
| family     | recall       | 12/0         |             |         | -                   |
| family     | farewell     | 34/1         |             |         | -                   |
| family     | comfort      | 19/0         |             |         | -                   |
| (narrator) | narrate      |              | 69/0        |         |                     |
| (narrator) | deliver-news |              | 25/0        |         |                     |
| (narrator) | tell         |              |             | 98/1    |                     |
| (narrator) | recall       |              |             | 44/2    |                     |

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
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 101/2   |
| (narrator) | recall       |              |             | 44/2    |

### first-day (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| newcomer   | tell         | 4/0          |             |         |
| newcomer   | request      | 6/0          |             |         |
| newcomer   | thank        | 2/0          |             |         |
| authority  | tell         | 4/0          |             |         |
| authority  | offer        | -            |             |         |
| authority  | comfort      | -            |             |         |
| peers      | offer        | -            |             |         |
| peers      | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 101/2   |
| (narrator) | recall       |              |             | 44/2    |

### last-day (departure, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| leaving    | farewell     | 34/1         |             |         |
| leaving    | thank        | 2/0          |             |         |
| leaving    | recall       | 12/0         |             |         |
| leaving    | promise      | -            |             |         |
| staying    | farewell     | 34/1         |             |         |
| staying    | recall       | 12/0         |             |         |
| staying    | thank        | 2/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 94/1    |
| (narrator) | recall       |              |             | 44/2    |

### interview (favor-asked, money)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| interviewer | tell         | 4/0          |             |         |
| interviewer | offer        | -            |             |         |
| interviewer | decline      | -            |             |         |
| candidate   | tell         | 4/0          |             |         |
| candidate   | lie          | 17/0         |             |         |
| candidate   | request      | 6/0          |             |         |
| candidate   | thank        | 2/0          |             |         |
| (narrator)  | narrate      |              | 69/0        |         |
| (narrator)  | deliver-news |              | 25/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 44/2    |

### date (routine, personal)

| Role          | Move         | conversation | scene-words | journal |
| ------------- | ------------ | ------------ | ----------- | ------- |
| partner       | tell         | 4/0          |             |         |
| partner       | recall       | 12/0         |             |         |
| partner       | offer        | -            |             |         |
| partner       | thank        | 2/0          |             |         |
| partner       | confess      | -            |             |         |
| other-partner | tell         | 4/0          |             |         |
| other-partner | recall       | 12/0         |             |         |
| other-partner | offer        | -            |             |         |
| other-partner | thank        | 2/0          |             |         |
| other-partner | confess      | -            |             |         |
| (narrator)    | narrate      |              | 69/0        |         |
| (narrator)    | deliver-news |              | 25/0        |         |
| (narrator)    | tell         |              |             | 87/1    |
| (narrator)    | recall       |              |             | 44/2    |

### proposal (favor-asked, personal)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| proposing   | promise      | -            |             |         |
| proposing   | request      | 6/0          |             |         |
| proposing   | tell         | 4/0          |             |         |
| proposing   | confess      | -            |             |         |
| proposed-to | agree        | 2/0          |             |         |
| proposed-to | decline      | -            |             |         |
| proposed-to | request      | 6/0          |             |         |
| proposed-to | thank        | 2/0          |             |         |
| (narrator)  | narrate      |              | 69/0        |         |
| (narrator)  | deliver-news |              | 25/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 44/2    |

### breakup (loss, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| ending     | tell         | 4/0          |             |         |
| ending     | blame        | -            |             |         |
| ending     | apologize    | -            |             |         |
| ending     | farewell     | 34/1         |             |         |
| partner    | blame        | -            |             |         |
| partner    | request      | 6/0          |             |         |
| partner    | refuse       | -            |             |         |
| partner    | farewell     | 34/1         |             |         |
| children   | comfort      | 19/0         |             |         |
| children   | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 44/2    |

### reunion (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| one        | recall       | 12/0         |             |         |
| one        | tell         | 4/0          |             |         |
| one        | apologize    | -            |             |         |
| one        | thank        | 2/0          |             |         |
| one        | promise      | -            |             |         |
| other      | recall       | 12/0         |             |         |
| other      | tell         | 4/0          |             |         |
| other      | apologize    | -            |             |         |
| other      | thank        | 2/0          |             |         |
| other      | promise      | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 101/2   |
| (narrator) | recall       |              |             | 44/2    |

### betrayal (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| betrayed   | blame        | 3/0          |             |         |
| betrayed   | confront     | -            |             |         |
| betrayed   | refuse       | 3/0          |             |         |
| betrayed   | request      | 6/0          |             |         |
| betrayer   | apologize    | -            |             |         |
| betrayer   | lie          | 17/0         |             |         |
| betrayer   | deflect      | 3/0          |             |         |
| betrayer   | confess      | 3/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 44/2    |

### rescue (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| rescuer    | offer        | -            |             |         |
| rescuer    | comfort      | 1/0          |             |         |
| rescuer    | tell         | 9/0          |             |         |
| in-danger  | request      | 6/0          |             |         |
| in-danger  | thank        | 2/0          |             |         |
| in-danger  | tell         | 9/0          |             |         |
| bystanders | tell         | 9/0          |             |         |
| bystanders | offer        | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 44/2    |

### visit (routine, personal)

| Role        | Move         | conversation | scene-words | journal |
| ----------- | ------------ | ------------ | ----------- | ------- |
| visitor     | comfort      | -            |             |         |
| visitor     | tell         | 4/0          |             |         |
| visitor     | recall       | 12/0         |             |         |
| visitor     | promise      | -            |             |         |
| cannot-come | thank        | 2/0          |             |         |
| cannot-come | tell         | 4/0          |             |         |
| cannot-come | request      | 6/0          |             |         |
| cannot-come | confess      | -            |             |         |
| (narrator)  | narrate      |              | 69/0        |         |
| (narrator)  | deliver-news |              | 25/0        |         |
| (narrator)  | tell         |              |             | 87/1    |
| (narrator)  | recall       |              |             | 44/2    |

### arrival (arrival, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| household  | offer        | -            |             |         |
| household  | tell         | 4/0          |             |         |
| household  | thank        | 2/0          |             |         |
| newcomer   | thank        | 2/0          |             |         |
| newcomer   | tell         | 4/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 101/2   |
| (narrator) | recall       |              |             | 44/2    |

### care (routine, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| caregiver  | offer        | -            |             |         |
| caregiver  | comfort      | -            |             |         |
| caregiver  | tell         | 4/0          |             |         |
| caregiver  | request      | 6/0          |             |         |
| cared-for  | thank        | 2/0          |             |         |
| cared-for  | request      | 6/0          |             |         |
| cared-for  | decline      | -            |             |         |
| cared-for  | confess      | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### advice (routine, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| adviser    | tell         | 4/0          |             |         |
| adviser    | offer        | -            |             |         |
| adviser    | recall       | 12/0         |             |         |
| adviser    | comfort      | -            |             |         |
| deciding   | request      | 6/0          |             |         |
| deciding   | thank        | 2/0          |             |         |
| deciding   | agree        | 2/0          |             |         |
| deciding   | decline      | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### accusation (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| accuser    | confront     | -            |             |         |
| accuser    | blame        | 3/0          |             |         |
| accuser    | tell         | 9/0          |             |         |
| accused    | deflect      | 3/0          |             |         |
| accused    | lie          | 17/0         |             |         |
| accused    | confess      | 3/0          |             |         |
| accused    | apologize    | -            |             |         |
| accused    | refuse       | 3/0          |             |         |
| witnesses  | tell         | 9/0          |             |         |
| witnesses  | comfort      | 1/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 44/2    |

### warning (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| warning    | tell         | 9/0          |             |         |
| warning    | offer        | -            |             |         |
| warning    | request      | 6/0          |             |         |
| at-risk    | thank        | 2/0          |             |         |
| at-risk    | deflect      | 3/0          |             |         |
| at-risk    | refuse       | 3/0          |             |         |
| at-risk    | promise      | 3/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 44/2    |

### reconciliation (routine, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| one        | apologize    | -            |             |         |
| one        | thank        | 2/0          |             |         |
| one        | recall       | 12/0         |             |         |
| one        | promise      | -            |             |         |
| one        | offer        | -            |             |         |
| other      | apologize    | -            |             |         |
| other      | thank        | 2/0          |             |         |
| other      | recall       | 12/0         |             |         |
| other      | promise      | -            |             |         |
| other      | offer        | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### asking-permission (favor-asked, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| asking     | request      | 6/0          |             |         |
| asking     | promise      | -            |             |         |
| asking     | tell         | 4/0          |             |         |
| asking     | lie          | 17/0         |             |         |
| authority  | agree        | 2/0          |             |         |
| authority  | decline      | -            |             |         |
| authority  | offer        | -            |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### polling-place (routine, political)

| Role       | Move   | conversation | counter | journal |
| ---------- | ------ | ------------ | ------- | ------- |
| voter      | greet  | 25/0         | 13/0    |         |
| voter      | thank  | 2/0          | 5/0     |         |
| voter      | ask    | 42/1         | 24/0    |         |
| workers    | greet  | 25/0         | 13/0    |         |
| workers    | tell   | 4/0          | 8/0     |         |
| workers    | thank  | 2/0          | 5/0     |         |
| neighbors  | greet  | 25/0         | 13/0    |         |
| neighbors  | tell   | 4/0          | 8/0     |         |
| neighbors  | ask    | 42/1         | 24/0    |         |
| (narrator) | tell   |              |         | 87/1    |
| (narrator) | recall |              |         | 44/2    |

### hearing (threat, personal)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| accused    | deflect      | 3/0          |             |         |
| accused    | confess      | 3/0          |             |         |
| accused    | refuse       | 3/0          |             |         |
| accused    | tell         | 9/0          |             |         |
| accused    | request      | 6/0          |             |         |
| family     | comfort      | 1/0          |             |         |
| family     | tell         | 9/0          |             |         |
| family     | promise      | 3/0          |             |         |
| others     | tell         | 9/0          |             |         |
| others     | blame        | 3/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 90/1    |
| (narrator) | recall       |              |             | 44/2    |

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
| family     | farewell     | 34/1         |             |         |
| others     | tell         | 5/0          |             |         |
| others     | blame        | 5/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 87/1    |
| (narrator) | recall       |              |             | 44/2    |

### race-won (honor, political)

| Role       | Move            | address/victory | conversation | journal | newscast | headlines |
| ---------- | --------------- | --------------- | ------------ | ------- | -------- | --------- |
| candidate  | announce-result | 4/1             | -            |         | 7/0      |           |
| candidate  | thank           | 3/0             | 2/0          |         | -        |           |
| candidate  | promise         | -               | -            |         | -        |           |
| candidate  | tell            | -               | 4/0          |         | -        |           |
| supporters | congratulate    | -               | -            |         | -        |           |
| supporters | thank           | 3/0             | 2/0          |         | -        |           |
| supporters | tell            | -               | 4/0          |         | -        |           |
| family     | congratulate    | -               | -            |         | -        |           |
| family     | comfort         | -               | -            |         | -        |           |
| (narrator) | tell            |                 |              | 96/1    |          |           |
| (narrator) | recall          |                 |              | 44/2    |          |           |
| (narrator) | headline        |                 |              |         |          | 41/0      |

### race-lost (loss, political)

| Role       | Move         | address/concession | conversation | journal | newscast |
| ---------- | ------------ | ------------------ | ------------ | ------- | -------- |
| candidate  | congratulate | 2/0                | -            |         | -        |
| candidate  | thank        | 1/1                | 2/0          |         | -        |
| candidate  | tell         | 6/3                | 4/0          |         | -        |
| candidate  | close        | -                  | -            |         | 10/0     |
| supporters | comfort      | -                  | 19/0         |         | -        |
| supporters | thank        | 1/1                | 2/0          |         | -        |
| family     | comfort      | -                  | 19/0         |         | -        |
| (narrator) | tell         |                    |              | 98/1    |          |
| (narrator) | recall       |                    |              | 44/2    |          |

### floor-vote (vote-wanted, bill)

| Role       | Move            | meeting | address/chair | minutes | winning-losing | journal |
| ---------- | --------------- | ------- | ------------- | ------- | -------------- | ------- |
| chair      | call-to-order   | 3/0     | -             |         |                |         |
| chair      | put-question    | 6/0     | -             |         |                |         |
| chair      | announce-result | 5/0     | -             |         |                |         |
| chair      | close           | 37/0    | -             |         |                |         |
| member     | address-chair   | 44/0    | -             |         |                |         |
| member     | request         | 11/0    | -             |         |                |         |
| member     | agree           | 8/0     | -             |         |                |         |
| member     | disagree        | 7/0     | -             |         |                |         |
| colleagues | agree           | 8/0     | -             |         |                |         |
| colleagues | disagree        | 7/0     | -             |         |                |         |
| colleagues | request         | 11/0    | -             |         |                |         |
| colleagues | blame           | 3/0     | -             |         |                |         |
| public     | introduce       | 2/0     | -             |         |                |         |
| public     | request         | 11/0    | -             |         |                |         |
| public     | thank           | 2/0     | -             |         |                |         |
| (narrator) | record          |         |               | -       |                |         |
| (narrator) | announce-result |         |               | -       | 33/0           |         |
| (narrator) | tell            |         |               |         |                | 87/1    |
| (narrator) | recall          |         |               |         |                | 44/2    |

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
| (narrator) | recall          |             |      |           | 44/2    |              |
| sponsor    | thank           |             |      |           |         | 2/0          |
| sponsor    | tell            |             |      |           |         | 4/0          |
| sponsor    | announce-result |             |      |           |         | -            |
| signer     | announce-result |             |      |           |         | -            |
| signer     | thank           |             |      |           |         | 2/0          |
| signer     | congratulate    |             |      |           |         | -            |
| press      | ask             |             |      |           |         | 42/1         |

### veto (loss, bill)

| Role       | Move            | news | newscast | conversation | journal |
| ---------- | --------------- | ---- | -------- | ------------ | ------- |
| (narrator) | deliver-news    | 7/0  |          |              |         |
| (narrator) | announce-result | 2/0  |          |              |         |
| sponsor    | disagree        |      | -        | -            |         |
| sponsor    | blame           |      | -        | -            |         |
| sponsor    | tell            |      | -        | 4/0          |         |
| sponsor    | promise         |      | -        | -            |         |
| executive  | tell            |      | -        | 4/0          |         |
| executive  | deflect         |      | -        | -            |         |
| press      | ask             |      | -        | 53/1         |         |
| press      | confront        |      | -        | -            |         |
| (narrator) | tell            |      |          |              | 98/1    |
| (narrator) | recall          |      |          |              | 44/2    |

### appointment (honor, political)

| Role       | Move            | conversation | journal | headlines | news |
| ---------- | --------------- | ------------ | ------- | --------- | ---- |
| appointee  | thank           | 2/0          |         |           |      |
| appointee  | promise         | -            |         |           |      |
| appointee  | tell            | 4/0          |         |           |      |
| appointer  | announce-result | -            |         |           |      |
| appointer  | congratulate    | -            |         |           |      |
| appointer  | tell            | 4/0          |         |           |      |
| family     | congratulate    | -            |         |           |      |
| (narrator) | tell            |              | 96/1    |           |      |
| (narrator) | recall          |              | 44/2    |           |      |
| (narrator) | headline        |              |         | 41/0      |      |
| (narrator) | deliver-news    |              |         |           | -    |
| (narrator) | announce-result |              |         |           | 2/0  |

### recall (threat, political)

| Role        | Move     | conversation | newscast | journal | address/campaign |
| ----------- | -------- | ------------ | -------- | ------- | ---------------- |
| official    | deflect  | 3/0          | -        |         | -                |
| official    | tell     | 9/0          | -        |         | -                |
| official    | request  | 6/0          | -        |         | -                |
| official    | disagree | -            | -        |         | -                |
| petitioners | blame    | 3/0          | -        |         | -                |
| petitioners | confront | -            | -        |         | -                |
| petitioners | request  | 6/0          | -        |         | -                |
| family      | comfort  | 1/0          | -        |         | -                |
| family      | ask      | 47/1         | -        |         | -                |
| (narrator)  | tell     |              |          | 90/1    |                  |
| (narrator)  | recall   |              |          | 44/2    |                  |

### public-hearing (routine, bill)

| Role       | Move            | hearing | address/public-comment | notice | minutes |
| ---------- | --------------- | ------- | ---------------------- | ------ | ------- |
| chair      | call-to-order   | 8/1     | -                      |        |         |
| chair      | introduce       | 3/0     | 7/0                    |        |         |
| chair      | thank           | 17/1    | -                      |        |         |
| chair      | close           | 6/0     | 4/0                    |        |         |
| speaker    | greet           | -       | 7/0                    |        |         |
| speaker    | introduce       | 3/0     | 7/0                    |        |         |
| speaker    | tell            | -       | 4/0                    |        |         |
| speaker    | request         | -       | 2/0                    |        |         |
| speaker    | close           | 6/0     | 4/0                    |        |         |
| members    | ask             | 8/0     | -                      |        |         |
| members    | thank           | 17/1    | -                      |        |         |
| (narrator) | notice          |         |                        | 3/1    |         |
| (narrator) | record          |         |                        |        | 30/3    |
| (narrator) | announce-result |         |                        |        | 7/1     |

### press-interview (routine, political)

| Role     | Move     | interview | newscast |
| -------- | -------- | --------- | -------- |
| reporter | greet    | -         | 26/0     |
| reporter | ask      | 23/0      | -        |
| reporter | confront | 3/0       | -        |
| reporter | close    | 7/0       | 10/0     |
| official | answer   | -         | -        |
| official | deflect  | 18/0      | -        |
| official | tell     | 11/0      | -        |
| official | promise  | 8/0       | -        |
| official | disagree | -         | -        |
| official | close    | 7/0       | 10/0     |

### scandal (threat, political)

| Role       | Move      | newscast | headlines | conversation | interview | bring-it-up |
| ---------- | --------- | -------- | --------- | ------------ | --------- | ----------- |
| exposed    | deflect   | -        |           | 3/0          | 18/0      | -           |
| exposed    | lie       | -        |           | 17/0         | -         | -           |
| exposed    | confess   | -        |           | 3/0          | -         | -           |
| exposed    | apologize | -        |           | -            | -         | -           |
| reporter   | ask       | -        |           | 47/1         | 23/0      | -           |
| reporter   | confront  | -        |           | -            | 3/0       | -           |
| family     | comfort   | -        |           | 1/0          | -         | -           |
| family     | blame     | -        |           | 3/0          | -         | 9/0         |
| family     | ask       | -        |           | 47/1         | 23/0      | -           |
| (narrator) | headline  |          | 38/0      |              |           |             |

### law-takes-effect (news-received, money)

| Role       | Move            | bring-it-up | conversation | journal | news |
| ---------- | --------------- | ----------- | ------------ | ------- | ---- |
| reached    | ask             | -           | 58/1         |         |      |
| reached    | blame           | 9/0         | 5/0          |         |      |
| reached    | tell            | -           | 5/0          |         |      |
| (narrator) | tell            |             |              | 87/1    |      |
| (narrator) | recall          |             |              | 44/2    |      |
| (narrator) | deliver-news    |             |              |         | 3/0  |
| (narrator) | announce-result |             |              |         | 1/0  |

### campaign-stop (vote-wanted, political)

| Role       | Move      | address/campaign | conversation | journal |
| ---------- | --------- | ---------------- | ------------ | ------- |
| candidate  | greet     | -                | 25/0         |         |
| candidate  | introduce | -                | -            |         |
| candidate  | tell      | 24/0             | 4/0          |         |
| candidate  | request   | 9/0              | 6/0          |         |
| candidate  | promise   | -                | -            |         |
| candidate  | close     | 4/0              | -            |         |
| voters     | ask       | -                | 42/1         |         |
| voters     | agree     | -                | 2/0          |         |
| voters     | disagree  | 5/0              | -            |         |
| voters     | thank     | 8/0              | 2/0          |         |
| (narrator) | tell      |                  |              | 87/1    |
| (narrator) | recall    |                  |              | 44/2    |

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
| (narrator) | recall  |              |         | 44/2    |

### layoff (loss, money)

| Role       | Move         | conversation | scene-words | journal |
| ---------- | ------------ | ------------ | ----------- | ------- |
| worker     | ask          | 53/1         |             |         |
| worker     | request      | 6/0          |             |         |
| worker     | blame        | -            |             |         |
| worker     | thank        | 2/0          |             |         |
| boss       | deliver-news | 14/0         |             |         |
| boss       | apologize    | -            |             |         |
| boss       | offer        | -            |             |         |
| boss       | close        | -            |             |         |
| coworkers  | comfort      | 19/0         |             |         |
| coworkers  | condole      | 3/0          |             |         |
| (narrator) | narrate      |              | 69/0        |         |
| (narrator) | deliver-news |              | 25/0        |         |
| (narrator) | tell         |              |             | 98/1    |
| (narrator) | recall       |              |             | 44/2    |

### eviction-notice (loss, money)

| Role       | Move         | conversation | scene-words | journal | bring-it-up |
| ---------- | ------------ | ------------ | ----------- | ------- | ----------- |
| tenant     | ask          | 53/1         |             |         | -           |
| tenant     | request      | 6/0          |             |         | -           |
| tenant     | blame        | -            |             |         | 9/0         |
| landlord   | deliver-news | 14/0         |             |         | 4/0         |
| landlord   | refuse       | -            |             |         | -           |
| landlord   | offer        | -            |             |         | -           |
| family     | comfort      | 19/0         |             |         | -           |
| family     | ask          | 53/1         |             |         | -           |
| (narrator) | narrate      |              | 69/0        |         |             |
| (narrator) | deliver-news |              | 25/0        |         |             |
| (narrator) | tell         |              |             | 98/1    |             |
| (narrator) | recall       |              |             | 44/2    |             |
