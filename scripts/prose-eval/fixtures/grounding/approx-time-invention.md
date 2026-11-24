# probe: approx-time-invention

expect: FAIL time-invention

## PACKET

SURFACE: Narrative transition.
CHARACTER: City council member.
KNOWN WORLD FACTS:

- The character is home; a stack of budget printouts sits on the kitchen table.
  UNKNOWN / DO NOT ASSUME:
- The time of day.
  PURPOSE: Test that an approximate, colloquial time is not invented.
  OUTPUT REQUEST: One short transition sentence.

## OUTPUT

result: SAFE_RENDER
prose: It's around 11, the budget printouts still stacked on the kitchen table.
