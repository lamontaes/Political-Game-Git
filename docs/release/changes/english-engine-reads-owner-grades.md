---
id: english-engine-reads-owner-grades
impact: patch
section: Changed
title: The English engine reads the owner's grades
---

Grades the owner gives a dialogue batch are folded into one part ledger, and the English engine reads it: a part graded BAD or FIX, and never GOOD, is no longer chosen, so the next line comes from another part of the same bank. The ledger starts empty, so no line changes until grades land. The dialogue batch tool now spreads each kind of text across its worlds and combines seeded runs into one numbered batch for grading.
