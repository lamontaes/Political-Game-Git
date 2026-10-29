---
id: scene-signing-casts-who-it-reaches
title: "At a signing, the sponsor, a resident the law reaches or a skeptic asks the executive for the next step"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web executive pass (packet the-signing)"
lead: director
milestone: play-first
claimed-at:
---

**What.** `bill-signed` casts only the sponsor, the signer and the press, and makes the executive the asker. At real signings it goes the other way. The sponsor, a resident the law was written for or an advocate asks the executive for the next step (full funding next session, how it will be enforced), and the executive answers. The packet `docs/design/scenes/from-life/the-signing.md` draws on signings in Arizona, Wisconsin, California and elsewhere, calibration only. The records exist to cast them: a resident the law reaches (filled in from the counted adults, as the executive-order episode does) and a member who voted no.

**Rules.** No dice: the guest is cast from the law's own reach and the roll call. Serves `scene-standard`: four replies for the executive (commit to the next step, credit others, temper expectations, decline), and the answer written back.

**Done when.** In a buildBenchWorld drawn place (seed named), a full-person executive's signing stages a scene where the sponsor or a resident the law reaches asks the executive, citing the act record and the guest's record by id. The executive's reply is written back as a `scene.reply`. A test fails when a signing with a sponsor present stages no ask to the executive.

**Time box.** 3 hours.

**You will see.** You sign the ordinance; the sponsor, pen still in hand, asks whether you'll fund it in the next budget.

**Screenshot.** The signing scene in the bench, with place and seed.

**Files.** src/director/data/situation-types.json, src/director/civic-roles.ts

**Notes.** The words lead writes the executive-reply lines once the arc's asker and asked are swapped. Engine gap (legislature): no record of what a bill asks for next.
