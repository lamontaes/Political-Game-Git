---
id: art60-non-background-requests
impact: patch
section: Changed
title: The art queue can ask for chart, card and tab-strip grounds too
---

Nothing changes in play yet. Behind the scenes, three more requests join the art queue for interface art the game currently draws from color values alone: the ground behind every economic chart, the card the Guide opens on a civics term, and the strip along the top of the Politics hub. Each was checked against the art already owned before it was asked for, and none of them is approved art yet. Alongside them, the width floor that says a picture must be at least 4608px wide now applies only to the art it was written for — a room plate and a title tableau, which fill a screen. A nameplate, a card ground or a chart frame is a few hundred pixels wide on purpose, and was being turned away for being the size it is meant to be; each of those is held to the width its own request declares instead.
