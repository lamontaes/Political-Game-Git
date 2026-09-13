---
id: playable29-g-apartment
impact: patch
section: Fixed
title: Fit standing people to the existing calibrated apartment
---

The supported apartment now places a full standing figure at its authored floor/depth scale. Framing uses the composed figure, and furniture occludes rear depths without covering the foreground person or filling the open floor beneath the table.

Retain both drawn-person missing-calibration diagnostic regressions using a scoped uncalibrated copy of the now-authored room. The original diagnostic and drawn/not-refused assertions remain; the room's actual calibration is asserted before the negative control. This corrects the old test premise without removing diagnostic coverage or changing runtime code.
