# probe: brief-orientation-invented

expect: FAIL date-invention

## PACKET

SURFACE: Full scene.
CHARACTER: State representative.
KNOWN WORLD FACTS:

- The committee voted on HB 214.
- Leadership is asking whether the character will bring HB 214 back.
  UNKNOWN / DO NOT ASSUME:
- The date of the vote.
- Whether a private meeting occurred.
- How anyone felt about the meeting.
  PURPOSE: Ask for the character's decision with enough context to understand it.
  OUTPUT REQUEST: One brief context line, then return control.

## OUTPUT

result: SAFE_RENDER
prose: After yesterday's tense closed-door meeting, leadership is asking whether you'll bring HB 214 back. How do you respond?
