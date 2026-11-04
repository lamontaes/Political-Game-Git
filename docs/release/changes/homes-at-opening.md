---
id: homes-at-opening
impact: patch
section: Fixed
title: Homes are ready on the first New Game screen
---

New Game creates household dwelling records before the first person card and room read them. The existing housing initializer now runs during opening setup and remains safe to call again, so the first screen uses the same home and contract records as later housing payments.
