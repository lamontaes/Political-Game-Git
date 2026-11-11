# Where someone stands, before and after

Pool item `words-home-own-view-lines-are-composed`. Each picture is the bench at 1440x900 (`npm run bench`, page `/play`). A new life is started with `POST /api/newlife?seed=<seed>`, then Continue on the title, then each person in the room at home is clicked on the first evening until one says where they stand. In each set:

- `-view` is that line with the replies;
- `-card` is their card, opened from the name above the talk;
- `-answer` is the reply that names the speaker, and the answer back.

Before is `claude/words-w3-news` at 77d07c51, the branch this one starts from. After is this branch at 759a4fe6. The worktree that took them holds no image files, so the room behind the talk is dark; the talk box and the card are the game's own.

| #   | Place           | Seed        | Who says it            |
| --- | --------------- | ----------- | ---------------------- |
| 1   | Canaan, Vermont | `w3-view-4` | Sean Zimmerman, father |
| 2   | Bonanza, Utah   | `w3-view-8` | Annette Wolfe, mother  |
| 3   | Sunrise, Alaska | `w3-view-3` | John Figueroa, father  |

## Before

On the first evening nobody at home said where they stood. The talks were the day's small talk ("Pretty good, actually." / "Good to hear."), and the lean sentence, when it came, named nothing ("I should tell you, I lean conservative.").

## After

Each person names the question they care most about and their side. Their card then says "Cares most about …". The replies are different moves, and none names the question again:

- Canaan: "I should tell you, I lean conservative. I'd vote against a clean electricity standard every time." The replies are "Good to know." / "Mine's private." / "I'd vote the other way, Sean.". Picking the last: "I still think I'm right."
- Bonanza: "I should tell you, I lean liberal. I've always backed a ban on discrimination in housing and work." The replies are "Good to know." / "Rather not say." / "No argument from me, Annette.". Picking the last: "Good. I thought it was just me."
- Sunrise: "I'm a conservative, and I don't mind who knows it. If it's a ban on discrimination in housing and work, count me out." The replies are "Good to know." / "I'll keep mine." / "I'd vote your way, John.". The click on the answer timed out on the card's close button, so Sunrise has no answer picture.

Asking why ("Why that one?", "How come?") is offered only when the person has a reason on record, their employer or money. None of these three had one.
