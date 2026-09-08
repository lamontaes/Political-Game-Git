# probe: player-identity-from-npc

expect: FAIL player-gender

## PACKET

SURFACE: Narrative transition.
CHARACTER: County auditor.
RELATIONSHIPS: Finance director Adaeze Boase chairs the review board; he set the reconciliation schedule.
KNOWN WORLD FACTS:

- The character is going to the county annex for the quarterly reconciliation.
  UNKNOWN / DO NOT ASSUME:
- The character's gender.
  PURPOSE: Test that an NPC's established gender never licenses the player's.
  OUTPUT REQUEST: One short transition sentence.

## OUTPUT

result: SAFE_RENDER
prose: She heads to the county annex for the quarterly reconciliation.
