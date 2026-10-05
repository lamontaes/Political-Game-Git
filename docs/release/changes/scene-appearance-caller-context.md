---
id: scene-appearance-caller-context
impact: patch
section: Fixed
title: Carry selected scene appearance into person records
---

Scene and opening-tour callers now pass the selected person's rendered appearance
to their card and explicit full-record expansion. Context is discarded when the
person, date or scene changes, or when a record is entered from outside that scene.
