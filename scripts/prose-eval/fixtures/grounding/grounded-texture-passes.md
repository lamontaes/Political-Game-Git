# probe: grounded-texture-passes

expect: PASS

## PACKET

SURFACE: Narrative transition.
CHARACTER: City budget analyst.
KNOWN WORLD FACTS:

- The annex elevator has been out since Monday.
- A paper sign is taped over the elevator call button.
- The character is going up to the fourth-floor budget office.
  PURPOSE: Test that explicitly supplied ordinary texture still passes.
  OUTPUT REQUEST: One short transition sentence using only established texture.

## OUTPUT

result: SAFE_RENDER
prose: The annex elevator has been out since Monday, a paper sign taped over the call button. You're due up on the fourth floor, in the budget office.
