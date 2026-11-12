---
id: art-full-body-people-move-to-the-archive
title: "The full-body art moves to art/archive/full-body with a README, and nothing in the game reads it"
area: art
kind: cleanup
priority: 2
size: S
status: blocked
standard: 2
claimed-by:
pr:
after: play-rooms-are-the-painting-and-people-are-busts
blocked-on: play-rooms-are-the-painting-and-people-are-busts and play-new-game-and-creator-open-without-busts, which remove the last readers
lead: screens
source: "owner, Nov 10, 2026, about 9:27 p.m.; the CTO's order on #7365 (set aside, not deleted)"
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-11
---

**What.** The owner ruled on Nov 10, 2026: "people will eventually be in the game, but right now for early access, it's just we have to do the busts." The full-body art is kept for later and leaves the game's path. Step 5 of docs/art/full-body-people-after-early-access.md. The desktop build copies every art folder that code names, so the game a player downloads is about 154 MB smaller once nothing names these folders. Seen: the size of the packaged game, and how fast it installs and starts.

**Cause.** Found in code: art/people-engine/v4 (140 MB) is read by src/bench/people-pack.ts (line 13), art/people-rooms (3.3 MB) by src/bench/mannequin-plates.ts (line 14), and art/backdrops/occluders (11 MB) by src/bench/occluders.ts (line 7). desktop/scripts/build-play-api.mjs (line 43) copies each folder a module reaches through `import.meta.url`.

**Fix.** After the last reader is gone, `git mv` the three folders under art/archive/full-body/ and add a README there that names docs/art/full-body-people-after-early-access.md and the commit it gives. Delete src/bench/people-pack.ts and what is left of src/bench/appearance.ts that reads figures. Change the `people-pack` and `room-spots` skills (both copies) to open with one line: set aside until after early access, with the record's path. Update the two links in scripts/skill-ops/skill-ops.test.ts (lines 43 and 44). Add the pull request to the record's removal log.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Preserve asset originals, hashes and lineage: the files move with `git mv`, unchanged. Replace, never layer: no code path reads the archive. Skills are mirrored byte for byte; run `npm run test:skill-ops`.

**Done when.** A second session, not the builder, runs `git grep -n "people-engine\|people-rooms\|backdrops/occluders" src desktop scripts` on main and gets nothing outside the archive's README, builds the desktop play bundle and states its size beside the size before, and starts the bench in a drawn place (named, with its seed) and sees busts on You, People and a talk.

**Waits on.** play-rooms-are-the-painting-and-people-are-busts; play-new-game-and-creator-open-without-busts.

**Files.** art/people-engine/v4, art/people-rooms, art/backdrops/occluders, art/archive/full-body/README.md (new), src/bench/people-pack.ts, src/bench/appearance.ts, .agents/skills/people-pack/SKILL.md, .agents/skills/room-spots/SKILL.md, .claude/skills/people-pack/SKILL.md, .claude/skills/room-spots/SKILL.md, scripts/skill-ops/skill-ops.test.ts, docs/art/full-body-people-after-early-access.md
