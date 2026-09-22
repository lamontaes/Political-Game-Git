---
id: the-parties-screen-says-who-decides
impact: patch
section: Changed
title: The parties screen says who settles a proposal, and what is public
---

Before: a new life opened the parties screen and read "No party proposals
involve you yet." Party evolution is built and runs — parties are founded,
they split, they join together, and their platforms drift — so the screen was
closed rather than empty, and it said nothing to tell the two apart.

After: it says that parties settle these among their own officers and
committee people, that a proposal reaches you when you are one of them or have
put one forward yourself, and that a change a party has already made is public
and appears there either way.

The last part is the screen describing what it already does: a decided change
is shown to everybody, involved or not. A fresh world has simply not made one
yet.

How: the empty-state paragraph in the party initiatives panel. No behavior
changed, and a browser test walks to the screen in a varied place and fails if
the line stops saying who decides, how a player gets in, or that the decided
half is public.
