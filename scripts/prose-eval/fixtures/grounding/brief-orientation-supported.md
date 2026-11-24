# probe: brief-orientation-supported

expect: PASS

## PACKET

SURFACE: Full scene.
CHARACTER: State representative.
KNOWN WORLD FACTS:

- The committee vote on HB 214 happened two days earlier.
- Leadership is asking whether the character will bring HB 214 back.
  PURPOSE: Ask for the character's decision with enough context to understand it.
  OUTPUT REQUEST: One brief context line, then return control.

## OUTPUT

result: SAFE_RENDER
prose: Two days after the committee vote, leadership is asking whether you'll bring HB 214 back. How do you respond?
