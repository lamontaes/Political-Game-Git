---
id: scene-bill-sign-on-colleague-ask
title: "You ask colleagues to sign on to your bill, and the chair weighs the names"
area: words
kind: feature
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/project-thread-lcf812
pr: #9305
claimed-at: 2026-11-14T15:00:00.000Z
after: scene-hearing-witness-after-the-hearing
blocked-on:
lead: words
source: 'owner, Nov 14, 2026, 06:23Z ("a ton for legislating and negotiating, because there''s so much that has to go on with each bill"); brief V, stages of a bill, stage 2; owner, Nov 10 (co-sponsors only for the player''s own bills, docs/stopgaps/triage-2026-11-10/legislature.md row 11)'
model: opus
effort: medium
root: rc6-scenes-repeat
---

**What.** When the player drafts a bill in a state or territory chamber, they go to the colleagues they are close to and ask each to sign on. The colleague answers from where they stand on the bill and what a favor to the player is worth to them: yes, not yet, or no. A no says the reason the record holds (their views, the people they represent, their party's leaders, or a no vote they cast on the question before), never a deal, a lobby or a bribe. The player can thank a yes, plead or press a not-yet, or let a no go. A yes puts the colleague's name on the bill, and the committee chair weighs the names by how close they are to each signer when deciding whether to hear it. A yes won by a plea is a favor the player owes. Asked again on the same question, a colleague who said no knows it. Seen: a talk in the colleague's office, the chamber or on the phone in the days after the player drafts.

**Cause.** Found in code: src/core2/modules/legislature.ts kept no co-sponsors on a bill and `chairHears` read only the chair's own position and temperament, so a bill's support among colleagues never reached the hearing decision, and no scene asked anyone to sign on.

**Fix.** `askToSignOn` (legislature.ts) writes one `sign-on-asked` record per close colleague when the player drafts; the `bill-sign-on` situation type stages it as the player's own ask (`cosponsor-ask` arc, with `thanked` for the colleague's line after a thank); `keepReply` routes the answer to `answerSignOn`, which adds the name, writes the owed favor after a plea, or keeps the no as a declined ask of kind `sign-on`; `chairHears` adds `cosponsorChairWeight` times the chair's closeness to each signer. purpose-scene.ts says the reason from the position parts a colleague names, and the past no vote only from `signOnRecord`.

**Time box.** 6 hours for one Opus session.

**Rules.** No dice: the answer comes from the colleague's position parts and favor, never a roll. Ask why: a no says only a reason its record holds, by record id. Plain American English, no figures in talk, no new stopgaps.

**Done when.** A second session plays a state legislator in a drawn place, drafts a bill, and in the days after sees a colleague asked to sign on, answering from the record; a yes shows the colleague's name on the bill in dev mode and in the chair's reasons at the hearing; a no's reason matches the colleague's position parts, and a colleague who voted no on the question before says so.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/data/campaigns/parameters.json, src/core2/data/legislature/vote-replies.json, src/core2/data/life/remembered.json, src/director/data/director.json, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/scene-talk.ts, src/director/purpose-scene.ts, src/bench/data/scene-places.json, data/english/parts/scene-talk.json, src/director/bill-sign-on.test.ts (new)

**Notes.** 2026-11-14: the director's season cap (situation-types.json `seasonCap`, six moments of a type in 91 days) also holds the player's own sign-on asks; a player who drafts bills on many days of one season sees the later asks as Journal lines only (Manteca CA, seed 1d3c1565, a second ask on 2025-02-12 held). Asks drafted on one day fold into one sitting (`repeatsBy: bill`).
