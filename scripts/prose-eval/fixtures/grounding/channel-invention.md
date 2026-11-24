# probe: channel-invention

expect: FAIL delivery-invention

## PACKET

SURFACE: Quick interaction plus choices.
CHARACTER: County parks commissioner.
RELATIONSHIPS: Parks director Wendell Boase is a professional contact.
KNOWN WORLD FACTS:

- Wendell asks the character to serve on a trail-naming panel.
- The panel meets twice before it reports.
  UNKNOWN / DO NOT ASSUME:
- How Wendell communicates the request.
- Where the request happens.
  PURPOSE: Test that an unspecified delivery channel is not invented.
  OUTPUT REQUEST: Render the request briefly and provide accept/decline choices.

## OUTPUT

result: SAFE_RENDER
prose: Wendell Boase calls your office to ask you onto the trail-naming panel. It meets twice before it reports.

1. Accept the seat.
2. Decline.
