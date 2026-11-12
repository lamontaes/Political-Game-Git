# Hellos and goodbyes, before and after

Pool item `words-home-greet-farewell-lines-are-composed`. Each picture is the bench at 1440x900 (`npm run bench`, page `/play`), a new life started with `POST /api/newlife?seed=<seed>`, Continue on the title, one day on, Travel to a place with someone in it, a first talk with them, then a later day back at the same place for a second talk. `-hello` is the second talk's greeting; `-goodbye` is its last line.

Before: main at 099857d7. After: this branch at 2b979be7. All six pictures were taken in a full checkout, so the room is drawn.

| #   | Place                | Seed         | Person                                 |
| --- | -------------------- | ------------ | -------------------------------------- |
| 1   | Why, Arizona         | `w3-greet-3` | DeAndre Ferguson, at Molina's Kitchen  |
| 2   | Ages, Kentucky       | `w3-greet-5` | Anna Meyers, at O'Neill's Kitchen      |
| 3   | Martinsdale, Montana | `w3-greet-7` | Brooklyn Mathis, at Copeland's Kitchen |

The person is the one met at that place on the first day, talked to again the next day.

## Before

A stock line opens and closes every talk, the same in every town and whatever was said:

- Why: "Hi." Goodbye: "Good to see you."
- Ages: "Hi there." Goodbye: "I'll talk to you later."
- Martinsdale: "It's good to see you." Goodbye: "Bye."

## After

The greeting names the last meeting in the words for how long it has been, from the tie's contact record (a day, within the month, or longer); a greeting the day after never hedges. The goodbye names what the talk was about, unless a line before it in the talk already did: then it names the player (one screen names a thing once, Fable B's rule of Nov 11). It closes with a short word:

- Why: "Hi." / "Back again? I saw you just yesterday." / "I work for Molina's Kitchen. They've got me on as a cook." Goodbye: "I'll let you go, DeAndre. See you soon."
- Ages: "Hello there." / "You again. I saw you yesterday." / "I'm over at O'Neill's Kitchen. I'm a dishwasher." Goodbye: "Don't be a stranger, Anna. Bye now."
- Martinsdale: "Hi." / "Twice in two days. I saw you yesterday." / "I work over at Copeland's Kitchen. They've got me on as a cook." Goodbye: "Always good to see you, Brooklyn. Bye now."

The hello is its own short turn, as people say it, and the line after it names the last meeting.

Every line of the greet and goodbye subjects, with its insert, the owner's grade, the line rules and whether it plays, is in `lines-checked.md` (144 lines, all pass).

The first talk with a stranger still ends on their "I see." after the player answers their question, with no goodbye: nobody says goodbye right after their own question was answered (`endConversation`, unchanged).
