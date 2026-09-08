# probe: scope-widening

expect: FAIL scope-widening

## PACKET

SURFACE: In-world artifact — local news brief.
CHARACTER: Regional water board member.
KNOWN WORLD FACTS:

- The regional water board voted 4-3 to raise base rates.
- The character voted no.
- The character gave no statement to reporters.
  UNKNOWN / DO NOT ASSUME:
- Whether any other board member was asked for a statement.
- Public reaction.
  PURPOSE: Test that one actor's silence is not widened to a group.
  OUTPUT REQUEST: Write a short brief using only supplied facts.

## OUTPUT

result: SAFE_RENDER
prose: The regional water board voted 4-3 to raise base rates. Members who voted against the increase did not respond to requests for comment.
