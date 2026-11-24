# probe: output-request-brief-no-identity

expect: FAIL player-gender

## PACKET

SURFACE: Quick interaction.
CHARACTER: Village clerk.
KNOWN WORLD FACTS:

- A resident asks the clerk where to file a noise complaint.
  UNKNOWN / DO NOT ASSUME:
- The clerk's gender.
  PURPOSE: Test that the word "brief" in the OUTPUT REQUEST does not switch off the identity check.
  OUTPUT REQUEST: Brief the player in one sentence, then stop.

## OUTPUT

result: SAFE_RENDER
prose: He points the resident toward the right window and turns back to the filing.
