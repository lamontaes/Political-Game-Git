# Hellos and goodbyes, before and after

Pool item `words-home-greet-farewell-lines-are-composed`. Each picture is the bench at 1440x900 (`npm run bench`, page `/play`), a new life started with `POST /api/newlife?seed=<seed>`, Continue on the title, one day on, Travel to a place with someone in it, a first talk with them, then a later day back at the same place for a second talk. `-hello` is the second talk's greeting; `-goodbye` is its last line.

Before: `claude/words-opening-evening-talk` at e42d9102, the branch this one starts from. After: this branch.

| #   | Place                  | Seed         | Person                              |
| --- | ---------------------- | ------------ | ----------------------------------- |
| 1   | Guffey, Colorado       | `w3-greet-2` | Todd Torres, at Torres's Market     |
| 2   | Why, Arizona           | `w3-greet-3` | Sasha Vaughan, at Vaughan's Kitchen |
| 3   | Millington, New Jersey | `w3-greet-4` | Amanda Sellers, at Sweeney's Market |

The after pictures were retaken after Fable B's review of #8758: a greeting the day after the first talk never hedges ("if I remember right" is for gaps of weeks).

## Before

A stock line opens and closes every talk, the same in every town and whatever was said:

- Guffey: "Hello there." on the first day; "It's good to see you." the next. Goodbye: "I'll catch you later."
- Why: "Good to see you." Goodbye: "I'll talk to you later."
- Millington: "Hey." Goodbye: "I'll see you."

## After

The greeting names the last meeting in the words for how long it has been, from the tie's contact record (a day, within the month, or longer); the goodbye names what the talk was about, here the speaker's own workplace, and closes with a short word:

- Guffey: "Good to see you. I just saw you yesterday." Goodbye: "They keep us busy at Torres's Market. Take care."
- Why: "Hello. Seeing you yesterday wasn't enough, I guess." Goodbye: "They keep us busy at Vaughan's Kitchen. See you soon."
- Millington: "Hi there. I just saw you yesterday." Goodbye: "Back to it. Sweeney's Market doesn't run itself. Take care."

The first talk with a stranger still ends on their "I see." after the player answers their question, with no goodbye: nobody says goodbye right after their own question was answered (`endConversation`, unchanged).
