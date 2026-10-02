---
id: player-referrals-use-the-institutions-committee-choice
impact: patch
section: Fixed
title: Player bills use the institution's committee choice
---

Requesting a referral for a player bill now uses the same committee choice as
an automatic referral. A congressional bill follows the existing policy-field
mapping; other bills retain the first compiled committee as their fallback.
A chamber without compiled committees refuses the referral. Both routes keep
the existing session-end rules and record the referral through the same writer.
