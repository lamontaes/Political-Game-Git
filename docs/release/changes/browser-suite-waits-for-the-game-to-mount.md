---
id: browser-suite-waits-for-the-game-to-mount
impact: none
---

Test infrastructure only. The browser suite now waits for the game to replace
its loading line after every page load, because the title is drawn after the
page finishes loading rather than as part of it. Nothing a player sees changes.
