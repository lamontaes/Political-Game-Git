---
id: scene-signing-casts-who-it-reaches
title: "At a signing, the sponsor, a resident the law reaches or a skeptic asks the executive for the next step"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web executive pass (packet the-signing)"
lead: director
milestone: play-first
claimed-at:
after:
model: sonnet
effort: medium
root: design-story-director
checked: fable 2026-11-10
branch: claude/pool-scene-signing-casts-who-it-reaches
---

**What.** The bill-signed type casts only the sponsor, the signer and the press, and makes the executive the asker. At real signings it goes the other way. The sponsor, a resident the law was written for or an advocate asks the executive for the next step (full funding next session, how it will be enforced), and the executive answers. The packet docs/design/scenes/from-life/the-signing.md draws on signings in Arizona, Wisconsin, California and elsewhere, calibration only. The records exist to cast them: a resident the law reaches (filled in from the counted adults, as the executive-order episode does) and a member who voted no.

**Cause.** Found in code: src/director/data/situation-types.json, the bill-signed type (line 2667), binds the sponsor as subject and the signer as chair and sets asker to signer, so the executive speaks first; no role is a resident the law reaches. Packet: docs/design/scenes/from-life/the-signing.md.

**Fix.** Swap the asked and asker in bill-signed so the sponsor, or a resident the law reaches filled in from the counted adults, asks the executive, with four executive replies (commit to the next step, credit others, temper expectations, decline) written back as scene.reply. The reply lines are Story's under the Nov 10 split of words work.

**Time box.** 3 hours.

**Rules.** No dice: the guest is cast from the law's own reach and the roll call. Scene standard: four replies for the executive, and the answer written back. One model, two tiers: a resident filled in from the counted adults follows the counted group's rule made one person.

**Done when.** A second session, in a buildBenchWorld drawn place (seed named), sees a full-person executive's signing stage a scene where the sponsor or a resident the law reaches asks the executive, citing the act record and the guest's record by id. The executive's reply is written back as a scene.reply, and a test fails when a signing with a sponsor present stages no ask to the executive.

**You will see.** You sign the ordinance; the sponsor, pen still in hand, asks whether you'll fund it in the next budget.

**Screenshot.** The signing scene in the bench, with place and seed.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/civic-roles.ts, docs/design/scenes/from-life/the-signing.md

**Notes.** The words lead writes the executive-reply lines once the arc's asker and asked are swapped. Engine gap (legislature): no record of what a bill asks for next.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:43 UTC) on branch claude/pool-scene-signing-casts-who-it-reaches.

Released (2026-11-11): Swapping asker/asked in bill-signed would put the 55 existing signing-ask lines (written with the executive as asker, e.g. 'Nice work on this one', 'You signed it because it was good') in the wrong mouths; needs Story's new lines under data/english/parts first. Cause is right (situation-types.json bill-signed asker=signer asked=sponsor). Continue on branch claude/pool-scene-signing-casts-who-it-reaches.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:44 UTC) on branch claude/pool-scene-signing-casts-who-it-reaches.

Released (2026-11-11): the executive's four replies (commit to the next step, credit others, temper expectations, decline) are bank lines, Story's under the Nov 10 split; swapping asker/asked without them leaves the executive with no replies. Continue on branch claude/pool-scene-signing-casts-who-it-reaches.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:27 UTC) on branch claude/pool-scene-signing-casts-who-it-reaches.

Released (2026-11-11): Claimed by my own next loop, not worked: each needs Story-session lines under data/english/parts, a dedicated machine for speed runs, or a rewrite beyond one pass (see my earlier release notes on this item). Continue on branch claude/pool-scene-signing-casts-who-it-reaches.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:37 UTC) on branch claude/pool-scene-signing-casts-who-it-reaches.

Released (2026-11-11): The four executive reply lines are Story's alone to write and casting a resident the law reaches is not in the records the type reads; not built. Continue on branch claude/pool-scene-signing-casts-who-it-reaches.
