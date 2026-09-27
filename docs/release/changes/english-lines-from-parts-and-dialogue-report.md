---
id: english-lines-from-parts-and-dialogue-report
impact: none
---

Two development pieces for the English engine, with no change in play yet.

A line can now be built from reviewed parts: an opener, the core of what the
person means, a reason and a closer, each chosen by what the save records about
the facts, what the speaker knows, their traits, how they read the listener and
a recorded mood. The same saved moment always gives the same line, and a
speaker avoids parts they used with the player lately. Every line is labeled
with one of the seventeen speech acts in the English engine brief.

`npm run dialogue:report` plays seeded lives with the ordinary Day command and
writes every conversation they had, with the choices offered, the words said,
the lines that repeat most, and the part keys a reviewer can point at.
