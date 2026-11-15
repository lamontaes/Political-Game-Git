---
id: director-gracious-statement-is-placed-as-a-confrontation
title: "A gracious line from the rival is answered only with jabs"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: played page read at Salado TX (P32) and the second reader on the rival after a debate, Nov 15 2026
checked:
---

**What.** In the scene after a debate the rival says something gracious ("Whatever happens in this race, that was a decent night for it", "We agreed on more than I expected") and every reply offered is a jab or a brush-off ("I'm here to talk to voters, not to you.", "You could have said that on stage."), then the rival turns hostile on their own friendly line. The player has no way to take the remark as said. Seen: at Superior WY and Hope Valley RI the rival said the gracious line and the only replies were jabs.

**Cause.** Found in code: the rally-opponent purpose has one arc whose statement move is `confront` (data/purpose-arcs.json, "rally-opponent"), and the replies and follows are chosen by that move, not by what the line says. A statement piece placed as `confront` therefore always gets confront replies, whatever it means. The arc variants (src/director/arc-variant.ts, data/arc-variants.json) are the engine's one way to give one purpose another arc by what the records hold, but the family list has no row for rally-opponent and no read looks at how a debate went.

**Fix.** Add one family row for rally-opponent in data/arc-variants.json with two variants: the existing arc for a rally and for a debate where the two split or the player passed on a question, and a warm one for a debate where nothing split, whose statement move is one the player can accept (replies that accept and thank, follows that answer them). Add one read of kind `debate-split` in src/director/arc-variant.ts that scores 1 where the debate record holds a question the two answered on opposite sides or one the player passed on, and 0 where it holds none, read from the debate row's answers (no roll, no threshold). The Words lead writes the warm variant's lines from the fact packet; until they exist, the gracious pieces stay out of the debate scene (this pull request removes "Whatever happens in this race, that was a decent night for it.").

**Time box.** 4 hours for one Opus session with the Words lead's lines.

**Rules.** An effect is a read, not a record: the variant is read from the debate row when the scene is staged. No dice: the variant is the highest read, never a draw. One engine per mechanic: this is the arc-variant engine, not a second one. Review: words.

**Done when.** A second session plays three drawn places with a fresh seed, one where the two split, one where the player passed on a question, and one where nothing split, and sees the warm variant only in the third, with a reply that accepts the rival's remark and a follow that answers it, the debate row's id named in the packet.

**Waits on.** The Words lead's lines for the warm variant.

**Files.** src/director/arc-variant.ts, src/director/data/arc-variants.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Evidence: /mnt/project-files/words-lead/debates/rival-after-debate-played.md and /mnt/project-files/words-lead/regression/page-read-salado.md (P32). The same class: any statement piece whose words do not match the move it is placed under.
