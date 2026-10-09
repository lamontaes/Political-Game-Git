---
id: p4-7-browser-tests-wait-for-opening-or-menu
impact: none
---

The browser tests' shared steps for entering and leaving a life wait for
whichever screen actually comes, the opening or the room's menu, and the
leave question or the title, instead of giving the first one two seconds and
then assuming it was not coming.
