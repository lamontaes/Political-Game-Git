---
id: instant-story-choices-carry-no-extra-line
impact: patch
section: Fixed
title: A choice that takes no time shows only its words
---

In the story view, a choice that takes no time printed a second, smaller line
under its button. In some builds that line said "No time passes"; in others it
repeated the choice's own words. Neither told the player anything.

That line is gone for instant choices. A choice that really takes time still
shows how long it takes, and a choice with its own note still shows the note.
