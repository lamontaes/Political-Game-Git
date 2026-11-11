# A story passed on at home, before and after

Pool item `words-home-news-lines-are-composed`. Each picture is the bench at 1440x900 (`npm run bench`, page `/play`), a new life started with `POST /api/newlife?seed=<seed>`, Continue on the title, then Day after Day, clicking each person in the room at home until someone raises a story. `-story` is the story raised and the replies offered; `-answer` is the reply picked (a stand where one was offered) and the answer back.

Before: `claude/words-w3-greet-farewell` at edc9c127, the branch this one starts from, which holds main's strip of people at home. After: this branch's news work at c36977c8 with main merged in locally for the strip (not pushed).

| #   | Place                   | Seed        | Day | Who raised it |
| --- | ----------------------- | ----------- | --- | ------------- |
| 1   | El Paraiso, Puerto Rico | `w3-news-4` | 11  | a relative    |
| 2   | Ashley, Michigan        | `w3-news-8` | 9   | a relative    |
| 3   | Bedford, Wyoming        | `w3-news-9` | 39  | Maria Arnold  |

Five more seeds (`w3-news-1`, `-2`, `-3`, `-6`, `-7`) passed 40 days at home with no story raised, and `w3-news-5` stopped on a scene's button; they are not shown.

## Before

The same replies whatever the story is, one of them about something else:

- El Paraiso, "Have you seen this? Cindy González answers Kathy Vega's address.": "Really?" / "I haven't heard." / "Could be good. We'll find out soon enough." The answer back: "Got it."
- Ashley, "I heard it on WSBQ-TV: Six speak at the hearing on Ordinance 2025-1.": "I can't believe it." / "Tell me." / "I don't like it." The answer back: "That's what I heard."
- Bedford, "Have you seen this? Automatic Voter Registration Act now in force in Hawaii.": "We'll manage. We always do." / "Tell me." / "I think it's terrible." The answer back: "That's what I heard."

## After

Retaken at ca3856d5 (Bedford at 1bbb5936), in a full checkout so the room is drawn. Each reply names a different thing, from the player's own records: the question the story is about (on the side the player's own view is on), the outlet, the player's town. Where the headline already says the question, a stand names the person instead (one screen names a thing once). A bill is said by what it does, not by its number. The answer back comes from the story's record or the other person's own side:

- El Paraiso: "Have you seen this? Cindy González answers Kathy Vega's address." The replies are "Really?" / "I didn't hear." / "I'm on the side of right-to-work rules." / "Did they say why? Folks in El Paraiso will ask." Picking the stand: "Same here. I heard it yesterday and thought so too."
- Ashley: "I heard it on WSBQ-TV: Six speak at the hearing on local police working with federal immigration enforcement." (before: "on Ordinance 2025-1"). The replies are "You're kidding." / "I saw that on WSBQ-TV." / "Count me out on that, Parker." / "Did they say why? Folks in Ashley will ask." Picking the stand: "Me neither. I heard it yesterday and thought the same."
- Bedford: "Have you seen this? Automatic Voter Registration Act now in force in Hawaii." The replies are "Did they say why? What's it mean for Bedford?" / "Oh, my." / "I missed that on Meridian News Network." / "I'm for it myself, Maria." Picking why: "They didn't get into the why. It ran a few days ago." (retaken at 1bbb5936: the headline already says the question, so the answer says "it" and gives the day it ran).

In both sets the goodbye at home after the answer is the composed one from #8758, naming the part of the day: "We'll talk more later this morning.", "I'll check on you again this morning.", "I've got a few things to get done this morning."

Every line of the news subjects (the story raised, the replies, the question back and the answer back), with its insert, the owner's grade, the line rules and whether it plays, is in `lines-checked.md` (128 lines, all pass).
