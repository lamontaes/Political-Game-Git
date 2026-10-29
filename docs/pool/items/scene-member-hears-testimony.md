---
id: scene-member-hears-testimony
title: "A council member hears a resident's three minutes at a public hearing, and can answer or ask"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web legislating pass (packet three-minutes-at-the-microphone)"
lead: director
milestone: play-first
claimed-at:
---

**What.** `public-hearing` casts only the resident who speaks (subject, `causeNames: subject`). So a player who sits on the body never gets a scene when residents testify. Testimony reaches members only as a room balance in their lobby reason (`roomTerm`, `src/core2/modules/meetings.ts`), with no speaker named. The packet `docs/design/scenes/from-life/three-minutes-at-the-microphone.md` draws on hearings in Pasadena, California and Highland Village, Texas and Raleigh's comment rules, calibration only. It shows the member's side: thank and engage, ask a question, promise to look into it, or stay silent.

**Rules.** No dice: the scene fires from the `public-comment` record of a hearing on a body the player sits on. Ask why: when a member's stance moves after testimony, the reason names the speaker's comment record. Serves `scene-standard`: the speaker is cast from the comment's own record.

**Done when.** In a buildBenchWorld drawn place (seed named), a full-person member present at a hearing gets a scene with one resident who spoke, citing the `public-comment` record by id. The member's reply is written back as a `scene.reply`. A test fails when a member is present at a hearing with comments and no scene stages.

**Time box.** 3 hours.

**You will see.** At the hearing, a neighbor steps to the microphone about the rezoning, looks at you, and you can answer.

**Screenshot.** The hearing scene from the member's seat, in the bench.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts

**Notes.** Engine gaps the packet names (meetings): no sign-up, speaker cap or per-speaker time; testimony moves no member's stance by speaker.
