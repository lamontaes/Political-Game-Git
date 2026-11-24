# probe: envelope-unknown-class

expect: FAIL envelope-drift

## PACKET

SURFACE: Quick interaction.
CHARACTER: Budget analyst.
KNOWN WORLD FACTS:

- A quarterly filing is due.
  PURPOSE: Test that an unknown result class is rejected, not read as valid.
  OUTPUT REQUEST: One sentence.

## OUTPUT

result: RENDER
prose: You review the quarterly filing.
