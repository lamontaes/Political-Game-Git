# probe: multiline-bare-extraction

expect: FAIL delivery-invention

## PACKET

SURFACE: Quick interaction.
CHARACTER: Records clerk.
KNOWN WORLD FACTS:

- A quarterly filing is due.
  UNKNOWN / DO NOT ASSUME:
- How or when anyone follows up.
  PURPOSE: Test that every prose line is inspected, not only the first.
  OUTPUT REQUEST: One or two sentences.

## OUTPUT

You review the quarterly filing before the deadline.
The clerk calls Tuesday to confirm the hearing time.
