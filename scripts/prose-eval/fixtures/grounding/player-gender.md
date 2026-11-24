# probe: player-gender

expect: FAIL player-gender

## PACKET

SURFACE: Narrative transition.
CHARACTER: County auditor.
KNOWN WORLD FACTS:

- The character is going to the county annex for the quarterly reconciliation.
- Nothing consequential happens on the way.
  UNKNOWN / DO NOT ASSUME:
- The character's gender.
- Weather, traffic, or anything not established.
  PURPOSE: Test that player gender is never inferred.
  OUTPUT REQUEST: One short transition sentence.

## OUTPUT

result: SAFE_RENDER
prose: She heads to the county annex for the quarterly reconciliation.
