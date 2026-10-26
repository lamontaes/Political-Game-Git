---
id: tests-officeholder-desk-bill-on-signing-stale
title: "officeholder-scenes test still expects the desk scene on a signing; the desk scene now comes when a bill is presented"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: words/officeholder-desk-test
pr: #6134
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T03:02:36.466Z
---

**What.** src/director/officeholder-scenes.test.ts, 'a signing reaches the signer's press and desk and the sponsor's signing scene', fails on main: it expects the desk-bill situation type to stage on an executive-action record with action 'signed'. Since 896fe11bcc (Oct 24, words-desk-bill-scene), desk-bill stages when a bill is presented to the executive (cause:event:bill-presented), which src/director/desk-scene.test.ts covers in a played world. The test's expectation is stale; the game is right.

**Rules.** A failure that's also red on clean main is fixed at its root on its own PR. The test keeps checking what the signing does stage (the signer's press interview, the sponsor's signing scene) and states what it no longer stages.

**Done when.** officeholder-scenes.test.ts passes on main: the signing stages the press interview and the sponsor's signing scene and not the desk scene, with a pointer to desk-scene.test.ts for the bill presented; the other four cases pass unchanged.

**Files.** src/director/officeholder-scenes.test.ts

**Notes.** TODO
