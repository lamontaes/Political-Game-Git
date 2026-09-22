---
id: a-render-says-what-it-contains
impact: none
---

The research queue's rendered document now lists every question id it
carries, open and answered, and names the branch as well as the commit it
came off. `research:request render` refuses when this checkout holds fewer
questions than the document already on disk, unless `--allow-drop` says they
were withdrawn on purpose.

The document is mechanically a function of whichever request files the
rendering branch happens to hold, so a branch missing another lane's records
produced a copy that was short, complete-looking and stamped with an
authoritative count. Publishing one of those deletes questions from the copy
people read; two lanes came within a step of it in one morning, once with a
P0 among them. Ids on the page make the loss visible to a reader, and the
refusal makes it visible to whoever is about to publish.

`research:request file` now writes records through Prettier as well as
canonical ordering. The two disagree about a short array, so the filing tool
was handing its user a branch that failed the format gate.

No player-facing behaviour changes: this is the authoring queue, and nothing
in a running game reads it.
