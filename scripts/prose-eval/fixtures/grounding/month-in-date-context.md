# probe: month-in-date-context

expect: FAIL date-invention

## PACKET

SURFACE: In-world artifact — local news brief.
CHARACTER: School board member.
KNOWN WORLD FACTS:

- The school board approved the calendar for the coming term.
  UNKNOWN / DO NOT ASSUME:
- The date of any meeting or deadline.
  PURPOSE: Test that a month used as a calendar date is still caught.
  OUTPUT REQUEST: Write a short brief using only supplied facts.

## OUTPUT

result: SAFE_RENDER
prose: The school board approved the calendar for the coming term, with the first day set for May 3.
