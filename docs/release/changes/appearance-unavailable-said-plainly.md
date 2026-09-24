---
id: appearance-unavailable-said-plainly
impact: patch
section: Fixed
title: The creator says plainly when appearance cannot be chosen yet
---

In a build with no approved character art, the appearance step at character
creation said "No compatible artwork is available in this catalog." That read
like a fault, and it used a word the player has no reason to know. It now says
"Choosing how you look is not available yet. Your character can still begin."
The Begin button was never blocked, and it still is not.

The step also gave its only sentence a 69-pixel strip on a phone: it kept an
empty column for a figure it had nothing to draw. With no figure, the text now
has the whole step, and it sits on its own backing so it can be read over the
room.

The appearance section under Personal had the same sentence in different
words. It now reads "Changing how you look is not available yet."

Nothing is drawn differently. Development fixtures are still never offered
as a choice.
