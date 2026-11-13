---
id: gov-treasury-diversion-part-4-the-players-seat
title: "A played mayor, county executive or governor whose line runs short is offered the same three choices in a scene"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: none
source: split from gov-treasury-diversion by Fable after the owner's Nov 10 ruling
checked: fable 2026-11-10
---

**What.** Part 1 never decides for the person the player controls. Give the player the same moment as a scene: the keeper of the books says a line is short and another has room, and the player asks the body, moves it quietly, or leaves it. This is part 4 of gov-treasury-diversion. Read docs/design/treasury-diversion.md first; this part builds "What the player sees" for a played executive. Seen: a scene where a played mayor, county executive or governor chooses to ask the body, move the money quietly or leave it.

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("Yes, keep it": an official can move money from one budget line to another outside the law, found out the way bribery is, through audits, the press or complaints). In code today, a bribe put to the player waits as a pending record answered in the scene `bribe-offer` (`announceOffer`, src/core2/modules/corruption.ts line 341, and the `scene.reply` handler in the module's `onEvent`); a diversion has no such scene, and src/director/data/situation-types.json holds no type for it.

**Fix.** At a month's close where part 1 would ask an official and that official is someone `isPlayerSeat` is true for, and a line the player's recorded stance or promise favors is short while another has room, write the pending record and emit a cause event the director reads, the way `announceOffer` does. Add one situation type to src/director/data/situation-types.json (its arc in src/director/data/purpose-arcs.json) that casts the keeper of the books and carries the short line, the line with room and the amounts as facts, with three endings the corruption module's `onEvent` settles: ask the body (the budget amendment bill of part 1), move it quietly (the diversion), leave it. The builder ships the type, its cast, its facts, its endings and the test, and writes no lines: the scene's lines in data/english/parts/ are Story's under the Nov 10 split of words work, so list each spot and what it must say in the pull request body.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** A scene exists only if it writes something back (.agents/skills/scene-standard/SKILL.md): each ending writes the record part 1 defines. No hand-written player text in code. This is a game, not a spreadsheet: the scene comes only from the recorded cause, never on a schedule. Follow .agents/skills/scene-producers/SKILL.md.

**Done when.** A second session, on main, plays an executive in a drawn place (place and seed named), uses dev mode to cut a line the player's recorded stance favors until it runs short at a close, and sees the scene with its three choices. Choosing each in turn on reloads of the same world, it sees a budget amendment bill filed, a diversion on the journal by record id, and nothing moved. A test in src/director names the place, the seed, the scene and the three records.

**Waits on.** gov-treasury-diversion-part-1-the-act-and-its-money. Story's lines for the scene.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/core2/modules/corruption.ts, src/director/treasury-diversion-scene.test.ts (new)
