---
id: status-card-follows-the-current-room
impact: patch
section: Fixed
title: After a day passes the status card names the room you are in
---

The status card used yesterday's opening workplace as the live room after a day
had passed, which left the old workplace on the card and an empty room. It now
uses the opening placement only while the opening scene or today's work arrival
is current, and otherwise shows the ordinary day's room and the people actually
there.
