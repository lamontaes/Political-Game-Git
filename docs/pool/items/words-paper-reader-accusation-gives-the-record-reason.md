---
id: words-paper-reader-accusation-gives-the-record-reason
title: "When someone who read the paper asks if you took the bribe, your answers give the reason from the record, and a confrontation is answered in kind"
area: gov
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: conflict-accuse short replies
pr:
after:
blocked-on:
lead: effects
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder (#9262) playing the paper's accusation after #9359, Nov 15, 2026; the Account lead asked for it as one PR
---

**What.** Since #9359 the person who asks whether you took a bribe is someone who read the paper's story. Their talk knew only the story. Your answer "It's not the way they printed it. Let me tell you how it happened." never told anything, and the reason lines written for a complaint (what the money was for, that you took it) never played. In both kinds of talk, a confrontation in the second round had no reply in kind: in the complaint talk the taken arc offered none, and in the paper talk the branch ended with no last line. Seen: in the accusation scene after the paper prints a taken bribe, the first answers name nothing the record holds.

**Cause.** Found in code: `src/director/purpose-scene.ts` set the bribe facts (`money-moved`, `you-took`, `wanted`, `motive-*`) only for a `justice.accused` cause. A `news.read` record carries the story's `crimeId` and `officialId` (news.ts, #9359), but nothing read the crime. The reason pieces in `data/english/parts/scene-talk.json` had uses only for the complaint's key (`threat`), not the paper's (`bribe-reported`). `src/director/data/arc-variants.json`: taken's `again.confront` was `["tell", "leave"]`, so the `mirror` gap fired after the accuser's confront.

**Fix.** A `news.read` cause naming a crime and an official reads the crime (`crimeRecord`) and sets the same facts a complaint gives, from `wantedFacts`, `taken`, the accused's part and `motiveOf`. It sets neither `read-complaint` nor a basis: the reader read it. The record's tell gains a `bribe-reported` use. The taken arc's second round after a confront offers a confront, and two new replies in kind and one close are added.

**Time box.** 1 hour, Opus.

**Rules.** An effect is a read: the scene reads the crime record the story names. No dice. Lines are judged by M5, never by the builder.

**Done when.** In the played world at Adams, Massachusetts (seed f54fcb0fe1c46cd2:2), and one place drawn from all 56 (named with its seed), a taken bribe reaches the paper. A reader asks, and the first answer names what the money was for, cited to the crime record. The accusation test checks `money-moved` and `you-took` against the crime id. The complaint talk's taken tree reports no mirror gap. A second session sees it in the running game.

**Waits on.** Nothing. The player's own reasons for taking come with `gov-player-taken-bribe-keeps-no-reasons`. `motiveOf` is already read here.

**Files.** src/director/purpose-scene.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/political-asks.test.ts

**Notes.** Filed by hand on the follow-up branch, Nov 15.
