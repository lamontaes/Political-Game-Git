---
id: state-lookup-found-once
impact: patch
section: Improved
title: Places weigh their month's outcomes faster
---

Each time the game worked out which laws are in force in a place, it searched
the list of places once for every state to find that state's identity. The
list never changes, so each state is now found once and kept. In South Fork,
Pennsylvania, weighing each month's outcomes takes about 1.4 seconds less of
every game year. Nothing that happens in the world has changed: the world
after each of five years is exactly the same as before.
