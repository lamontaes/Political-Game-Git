# Hellos and goodbyes, before and after

Pool item `words-home-greet-farewell-lines-are-composed`. Each picture is the bench at 1440x900 (`npm run bench`, page `/play`), a new life started with `POST /api/newlife?seed=<seed>`, Continue on the title, one day on, Travel to a place with someone in it, a first talk with them, then a later day back at the same place for a second talk. `-hello` is the second talk's greeting; `-goodbye` is its last line.

Before: `claude/words-opening-evening-talk` at e42d9102, the branch this one starts from. After: this branch.

| #   | Place                  | Seed         | Person (after)                            |
| --- | ---------------------- | ------------ | ----------------------------------------- |
| 1   | Guffey, Colorado       | `w3-greet-2` | Elizabeth Valencia, at Valencia's Kitchen |
| 2   | Why, Arizona           | `w3-greet-3` | Sasha Vaughan, at Vaughan's Kitchen       |
| 3   | Millington, New Jersey | `w3-greet-4` | Amanda Sellers, at Sweeney's Market       |

In Guffey the before life found the first person at Torres's Market instead (who is in a place at an hour moves with the trip's time), so the two pictures show different people; the lines are what to compare.

## Before

A stock line opens and closes every talk, the same in every town and whatever was said:

- Guffey: "Hello there." on the first day; "It's good to see you." the next. Goodbye: "I'll catch you later."
- Why: "Good to see you." Goodbye: "I'll talk to you later."
- Millington: "Hey." Goodbye: "I'll see you."

## After

The greeting names when the two last met, from the tie's contact record; the goodbye names what the talk was about, here the speaker's own workplace, and closes with a short word:

- Guffey: "Hey. Last I saw you was yesterday, I think." Goodbye: "It's a busy day at Valencia's Kitchen, so I'll let you go. Take care."
- Why: "Hello. I don't think we've talked since yesterday." Goodbye: "They keep us busy at Vaughan's Kitchen. See you soon."
- Millington: "Hi there. We last talked yesterday, if I remember right." Goodbye: "Back to it. Sweeney's Market doesn't run itself. Take care."

A fourth life, Ages, Kentucky (seed `w3-greet-5`), read: "Good to see you. The last time I saw you was yesterday." and "Back to it. Mueller's Salon and Barbershop doesn't run itself. Bye now."

The first talk with a stranger still ends on their "I see." after the player answers their question, with no goodbye: nobody says goodbye right after their own question was answered (`endConversation`, unchanged).
