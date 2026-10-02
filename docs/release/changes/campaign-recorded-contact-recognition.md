---
id: campaign-recorded-contact-recognition
impact: patch
section: Changed
title: Campaign recognition reads actual recorded contacts
---

The old unknown-candidate, afternoon and prior-win return curve now reads the
share of recorded adult residents who have actually met the candidate in saved
campaign-contact events. Repeated encounters count a person once. Both people
must be recorded as present or acting in the dated source event; untagged
relationships, mentions, children, outsiders and future contacts do not count.
Current household-location records govern residency; the saved person home is
used when no household location is recorded. The reader exposes the actual resident, recognized-person and contact-record IDs.
An action's own outcome does not supply its prior recognition.

Completed afternoon and prior-win counts remain informational. No win, newcomer
or attendance-count bonus is invented. This measures the recorded resident
cohort, not the unrecorded population, and does not create contacts for unnamed
door-knocking. The existing minutes/workers field-gain calculation is unchanged.
