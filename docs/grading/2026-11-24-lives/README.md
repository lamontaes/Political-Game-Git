# Grading packet, Nov 24, three lives (for the owner; not to merge)

- Head played: 1ca359b2b6f7a259727fb19d81a8ef6f6e6d6d98 (story/first-evening, #10390's head, main contained)
- Built and played by the Replay session, never a builder: no code changed, no scene triggered through dev mode, no line changed. The game's own director decided every scene.
- Format: `packet.json` (per life, per scene: `n`, `title`, `when`, `here`, `blocks` with `who`, `text`, the piece key, its `elements` ids and `issues`; `replies` with every reply offered and the one taken; `after` with Journal notes and news toasts; `img`, a 1440x900 picture) and `img/`.
- Replies were picked by rule per life (warmest, bluntest, middle), recorded as offered.

- Notes for the reader: each line carries `who` (the player's lines are under the player's name, the name stripped from the text), `where` (a TV channel, when the line came on one), `piece`, `elements`, `issues`. `piece_source: matched to bank text templates by sentence` marks keys the Replay session matched from the sentence to the bank's text (when one sentence's text is shared by more than one bank piece, every key is listed and the note says so) (the address and State of the State speeches come from the outline planner, which this packet does not call); a line with `"piece": null` carries a `note`. `"kind": "screen"` marks text that is a screen's own (loading progress lines, the Journal and news screens, campaign result lines), not words from the bank. The loading story lists the progress lines and the life-story lines the screen played, each with its picture. The Journal page at the end lists every chapter as the page shows it. Scenes titled "A scene: ..." are the director's own morning stops, none triggered. A first day at work or a layoff did not come in any of the three lives.
- The Replay session pressed Day and Week as a player does, talked to people at home through the Here strip, and used the Campaign tab's player controls (Announce, Knock on doors, Ask for an interview, Call donors, Volunteers, Endorsements); no dev mode.

## Life 1: Greeley, Colorado

- Seed: `56f2d087-96cd-49e1-85d4-ba22eb3c176e`
- Played: Monday, January 20, 2025, 7:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: warm; 13 scenes; 62 blocks, 35 with a piece key, 27 screen text.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, An interview call, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: nothing.

## Life 2: Towaoc, Colorado

- Seed: `9faf530e-a91b-477e-ada7-83f4eb91c79e`
- Played: Monday, January 20, 2025, 7:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: blunt; 12 scenes; 45 blocks, 25 with a piece key, 20 screen text.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: An interview call.

## Life 3: Hartford, Michigan

- Seed: `6cbdaccf-e733-4d22-82e6-4f694c416b8e`
- Played: Monday, January 20, 2025, 9:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: middle; 16 scenes; 73 blocks, 44 with a piece key, 29 screen text.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, An interview call, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: nothing.

Replay: start the bench, choose New game, Advanced, and use the seed above.

## Reply trees (grading page v2)

`tree-life-1.json` is life 1's tree (Greeley, Colorado, seed `56f2d087-96cd-49e1-85d4-ba22eb3c176e`, head 1ca359b2). Each scene with replies is a node: the line, the replies offered (and the lies, when the game offers any), and for each reply the lines that follow, with each line's piece key, `elements`, `issues`, bank and record ids. `kind: "story-scene"` trees (a door knock, an interview call) come whole from the game's own story payload (`talk.tree`), so every branch is the game's own. `kind: "conversation"` trees (a talk with someone at home) were branched from the same recorded request log, rebuilt from the same seed once per reply and once per lie, to two levels; a `result.lines` list there is the whole talk so far, the earlier lines first. Nothing was re-rolled and no scene was triggered through dev mode.
