---
id: playtest34-birthday-refusal
impact: patch
section: Fixed
title: Resolve invalid birthdays before leaving the character step
---

New Game explains an invalid named birthday at the character step and keeps Next
unavailable until the fields form a supported date. Existing saved birthdays and
unnamed replay descriptors remain unchanged. This receiver adds no art, save
schema, updater or installed-profile changes.
