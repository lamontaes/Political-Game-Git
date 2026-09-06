# probe: npc-pronoun-supported

expect: PASS

## PACKET

SURFACE: Quick interaction.
CHARACTER: Planning board member.
RELATIONSHIPS: Board chair Ines Okafor runs the meetings; she keeps them short.
KNOWN WORLD FACTS:

- Okafor opens the session and moves straight to the first item.
  PURPOSE: Test that a packet-supplied NPC pronoun may be used for that NPC.
  OUTPUT REQUEST: One or two sentences.

## OUTPUT

result: SAFE_RENDER
prose: Okafor opens the session and moves straight to the first item; she keeps it short.
