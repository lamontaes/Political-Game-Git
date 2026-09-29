---
id: long-lives-save-in-pieces
impact: patch
section: Fixed
title: A life played for about twenty years can be saved and opened again
---

A world played for about twenty years writes out longer than the longest
piece of text the game's engine can hold, a little over 536 million
characters, and saving it stopped with "Invalid string length". Such a world
is now saved in pieces of about 16 million characters, and it opens again
from those pieces as the same world, with the same name and the same check
that nothing changed after it was written. A save that fits in one piece is
written exactly as before, so every existing save opens as it did.
