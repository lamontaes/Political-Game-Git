# probe: modal-may-not-month

expect: PASS

## PACKET

SURFACE: Quick interaction.
CHARACTER: Zoning board member.
KNOWN WORLD FACTS:

- The board is weighing Permit 19.
- A second reading is possible.
  UNKNOWN / DO NOT ASSUME:
- The meeting date.
  PURPOSE: Test that the modal "may" is not read as the calendar month.
  OUTPUT REQUEST: One sentence.

## OUTPUT

result: SAFE_RENDER
prose: The board may take Permit 19 to a second reading.
