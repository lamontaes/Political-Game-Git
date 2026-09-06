# probe: envelope-multiline-valid

expect: PASS

## PACKET

SURFACE: Quick interaction plus choices.
CHARACTER: Utilities commission member.
KNOWN WORLD FACTS:

- The commission secretary calls to say the Docket 7 hearing has moved to the larger room.
- Docket 7 is a rate case.
  PURPOSE: Test that a valid multi-line envelope with choices still passes.
  OUTPUT REQUEST: Render the notice, then provide two choices.

## OUTPUT

result: SAFE_RENDER
prose: The commission secretary calls: the Docket 7 hearing has moved to the larger room.

1. Head over now.
2. Send word that you are on the way.
