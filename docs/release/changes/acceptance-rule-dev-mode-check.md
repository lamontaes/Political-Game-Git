---
id: acceptance-rule-dev-mode-check
impact: patch
section: Fixed
title: A bill whose votes are already in hand no longer picks up an unrelated extra section.
---

When every member's vote on a bill was already cast, the body could still trade a second, unrelated section onto it. A vote already cast is now that member's vote, and nobody trades for it. In dev mode, a bill's page now says how the bill ended and why, who its law reached in people and dollars, and where the money went compared with the same world left alone.
