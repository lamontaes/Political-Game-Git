# probe: approx-time-supported

expect: PASS

## PACKET

SURFACE: Narrative transition.
CHARACTER: City council member.
KNOWN WORLD FACTS:

- It is around 11 at night.
- A stack of budget printouts sits on the kitchen table.
  PURPOSE: Test that a packet-supplied approximate time may be used.
  OUTPUT REQUEST: One short transition sentence.

## OUTPUT

result: SAFE_RENDER
prose: It's around 11, the budget printouts still stacked on the kitchen table.
