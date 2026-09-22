---
id: title-screen-names-a-set-aside-save
impact: patch
section: Fixed
title: The title screen no longer says you have no saved games when you do
---

If a saved game could not be opened — most often because it was written by a
newer version — the title screen counted it as nothing at all. It offered to
import one, and Continue sat dead with no explanation, while the game had
deliberately kept that life and said so on the Saved games screen.

The title screen now says a saved game needs attention, and Continue says why
it cannot be pressed. Nothing about how saves are stored has changed; the life
was always still there.
