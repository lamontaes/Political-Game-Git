---
id: news-election-fixture-recorded-home
impact: patch
section: Fixed
title: Election conversation fixtures record actual home presence
---

Election conversation tests now explicitly record an authored home scene with
an adult from the player's saved household before asking the existing producer
to bind the campaign briefing. Household membership alone remains insufficient
for a conversation. Existing election and reporter assertions are preserved.
