# Grading packet, Nov 25, three fresh lives with reply trees (for the owner; not to merge)

- Head played: 731dd990add2fd6952ab781ffc78416824f9cf0f (story/first-evening, the Story lead's head, with the W4, W6 and W7 cuts; main is 12 commits ahead and not merged, so this is what the Story lead graded)
- Built and played by the Replay session, never a builder: no code changed, no scene triggered through dev mode, no line changed. The game's own director decided every scene.
- Format: `packet.json` (per life, per scene: `n`, `title`, `when`, `here`, `blocks` with `who`, `text`, the piece key, its `elements` ids and `issues`; `replies` with every reply offered and the one taken; `after` with Journal notes and news toasts; `img`, a 1440x900 picture) and `img/`.
- Replies were picked by rule per life (warmest, bluntest, middle), recorded as offered.

- Notes for the reader: each line carries `who` (the player's lines are under the player's name, the name stripped from the text), `where` (a TV channel, when the line came on one), `piece`, `elements`, `issues`. `piece_source: matched to bank text templates by sentence` marks keys the Replay session matched from the sentence to the bank's text (the address and State of the State speeches come from the outline planner, which this packet does not call); a line with `"piece": null` carries a `note`. `"kind": "screen"` marks text that is a screen's own (loading progress lines, the Journal and news screens, campaign result lines), not words from the bank. The loading story lists the progress lines and the life-story lines the screen played, each with its picture. The Journal page at the end lists every chapter as the page shows it. Scenes titled "A scene: ..." are the director's own morning stops, none triggered. A first day at work or a layoff did not come in any of the three lives.
- The Replay session pressed Day and Week as a player does, talked to people at home through the Here strip, and used the Campaign tab's player controls (Announce, Knock on doors, Ask for an interview, Call donors, Volunteers, Endorsements); no dev mode.

- Three fresh drawn lives (places and seeds below); a draw whose player could not run for office was redrawn so each life reaches the campaign.
- Reply trees: `tree-life-1.json`, `tree-life-2.json`, `tree-life-3.json`. Each scene with replies is a node: the line, the replies offered (and the lies, when the game offers any), and for each reply the lines that follow, with each line's piece key, `elements`, `issues`, bank and record ids. `kind: "story-scene"` trees (a door knock, an interview call, a morning stop) come whole from the game's own story payload (`talk.tree`). `kind: "conversation"` trees (a talk at home) were branched from the same recorded request log, rebuilt from the same seed, once per reply and per lie, to two levels; a `result.lines` list there is the whole talk so far, the earlier lines first. Nothing was re-rolled and no scene was triggered through dev mode.

## Life 1: Moscow, Kansas

- Seed: `a5cc795a-fdb4-4890-a0a1-20711eff3fcb`
- Played: Monday, January 20, 2025, 8:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: warm; 12 scenes; 57 blocks, 24 with a piece key, 33 screen text.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: An interview call.

## Life 2: Evendale, Ohio

- Seed: `81b0776a-4bc4-4b0c-a479-3c2c5000b0d1`
- Played: Monday, January 20, 2025, 9:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: blunt; 15 scenes; 89 blocks, 43 with a piece key, 46 screen text.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, An interview call, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: nothing.

## Life 3: Tall Timbers, Maryland

- Seed: `b62acd12-85c9-4138-93e0-071488a97f56`
- Played: Monday, January 20, 2025, 9:00 PM to Thursday, February 13, 2025, 7:00 AM; reply policy: middle; 16 scenes; 128 blocks, 69 with a piece key, 60 screen text.
- Reached: The loading story, The President's address, Talk at home after it, The Journal evening, The news, A door knock, An interview call, A donor ask, An offer of help (volunteers), An endorsement ask, The Journal page at the end of the life.
- Not reached: nothing.

Replay: start the bench, choose New game, Advanced, and use the seed above.
