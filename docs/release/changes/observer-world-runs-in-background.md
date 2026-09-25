---
id: observer-world-runs-in-background
impact: patch
section: Fixed
title: Watched worlds keep moving while the screen stays responsive
---

Watch the world now advances in a background worker. The date updates as weeks
pass, and the visible world catches up at regular checkpoints. Run, Pause,
Save, and Save and return use the same world clock and keep the latest completed
checkpoint. Large watched worlds are saved in smaller pieces so the browser
does not reject a whole game for exceeding its single-record size limit.

Closing the tab while unsaved weeks remain now warns the player. The observer
clock and the recap also stay apart on a desktop-sized screen.
