# Grading packet, Nov 24, three lives (for the owner; not to merge)

- Head played: 1ca359b2b6f7a259727fb19d81a8ef6f6e6d6d98 (story/first-evening, #10390's head, main contained)
- Built and played by the Replay session, never a builder: no code changed, no scene triggered through dev mode, no line changed. The game's own director decided every scene.
- Format: `packet.json` (per life, per scene: `n`, `title`, `when`, `here`, `blocks` with `who`, `text`, the piece key, its `elements` ids and `issues`; `replies` with every reply offered and the one taken; `after` with Journal notes and news toasts; `img`, a 1440x900 picture) and `img/`.
- Replies were picked by rule per life (warmest, bluntest, middle), recorded as offered.

- Notes for the reader: a block with `"piece": null` carries a `note` (a screen label, a fallback or a line built from the planner with no piece key). The loading story entry lists every progress line the screen showed, each with its own picture (`blocks[].img`); the first and last differ in their lit step and progress line. Scenes titled "A scene: ..." are the director's own morning stops (a Governor's or mayor's address on TV, a letter, a layoff or a first day if it came); none was triggered. A first day at work or a layoff did not come in any of the three lives.
- Replay in every life: the Replay session pressed Day and Week as a player does, talked to people at home through the Here strip, and used the Campaign tab's player controls (Announce, Knock on doors, Ask for an interview, Call donors, Volunteers, Endorsements); no dev mode.

## Life 1: Greeley, Colorado

- Seed: `56f2d087-96cd-49e1-85d4-ba22eb3c176e`
- Played: Monday, January 20, 2025, 7:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: warm; 13 scenes.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, An interview call, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: nothing.

## Life 2: Towaoc, Colorado

- Seed: `9faf530e-a91b-477e-ada7-83f4eb91c79e`
- Played: Monday, January 20, 2025, 7:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: blunt; 12 scenes.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: An interview call.

## Life 3: Hartford, Michigan

- Seed: `6cbdaccf-e733-4d22-82e6-4f694c416b8e`
- Played: Monday, January 20, 2025, 9:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: middle; 16 scenes.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, An interview call, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: nothing.

Replay: start the bench, choose New game, Advanced, and use the seed above (or play it again without a seed for a new draw).
