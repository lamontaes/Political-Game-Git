---
id: calendar-redraw-once
impact: patch
section: Fixed
title: The screen redraws after a press in a tenth of a second instead of two seconds on a long save.
---

After every press, the game works out which calendar entries the player can see. It did that once per entry, going through the whole life's activities each time. On Parker Brooks's 84 MB Woonsocket save, the calendar options took 1.5 seconds and the list of places to go took 0.5 seconds. They now take under 0.1 seconds together, and the answer is reused until the calendar changes. The bill clock also finds a free record key without comparing every candidate to every key it has written.
