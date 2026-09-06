# probe: explicit-channel-allowed

expect: PASS

## PACKET

SURFACE: Quick interaction.
CHARACTER: Utilities commission member.
KNOWN WORLD FACTS:

- The commission secretary calls to say the hearing on Docket 7 has moved to the larger room.
- Docket 7 concerns a rate case.
  PURPOSE: Test that a packet-supplied channel may be used.
  OUTPUT REQUEST: Render the notification in one or two sentences.

## OUTPUT

result: SAFE_RENDER
prose: The commission secretary calls: the Docket 7 hearing has moved to the larger room. Docket 7 is the rate case.
