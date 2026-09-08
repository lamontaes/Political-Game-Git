# probe: date-invention

expect: FAIL date-invention

## PACKET

SURFACE: In-world artifact — local news brief.
CHARACTER: Township zoning board member.
KNOWN WORLD FACTS:

- The zoning board voted 5-2 to approve Permit 19, a storage-yard expansion.
- The character voted no.
- Board chair Ines Okafor voted yes.
  UNKNOWN / DO NOT ASSUME:
- The date of the meeting.
- Why the character voted no.
  PURPOSE: Test journalistic register with no supplied date.
  OUTPUT REQUEST: Write a short brief using only supplied facts.

## OUTPUT

result: SAFE_RENDER
prose: The township zoning board voted 5-2 Tuesday to approve Permit 19, a storage-yard expansion. Board chair Ines Okafor voted in favor.
