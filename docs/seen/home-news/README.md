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

Each reply names a different thing, from the player's own records: the question the story is about (on the side the player's own view is on), the outlet, the player's town. The answer back is composed from the other person's own side and says when they heard it:

- El Paraiso: "Really?" / "I didn't hear." / "I'm on the side of right-to-work rules." / "Did they say why? Folks in El Paraiso will ask." Picking the stand: "Maybe. I only heard about it yesterday."
- Ashley: "You're kidding." / "Tell me." / "I don't think working with federal immigration enforcement makes sense." / "Did they say why? Folks in Ashley will ask." Picking the stand: "Could be. I only heard about it yesterday."
- Bedford: "Did they say why? What's it mean for Bedford?" / "Oh, my." / "I missed that on Meridian News Network." / "Count me in favor of automatic voter registration." Picking the stand: "Not me. I heard it yesterday, and I didn't like it."

In both sets the goodbye at home after the answer is the composed one from #8758, which the before branch already holds, naming the part of the day: "We'll talk more later this morning.", "I'll check on you again this morning.", "I've got a few things to get done this morning."
