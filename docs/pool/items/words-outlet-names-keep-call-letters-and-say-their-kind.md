---
id: words-outlet-names-keep-call-letters-and-say-their-kind
title: "A radio station is KKFX, not Kkfx, and every line can say how an outlet is read, seen or heard"
area: words
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: 9352
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead on the election-results talk, Nov 14 (coordinator relay 20:42Z)
checked: m3 2026-11-14
---

**What.** A neighbor's line names a radio station as "Kkfx" where the call letters are KKFX. The outlet's own record has the name right (a paper in mixed case, a station in capitals), but two director sites ran it through `properName`, which title-cases any name written wholly in capitals and only spares call letters that carry a band suffix such as -TV. Lines that name an outlet also need to say it as people do: a paper is read in and takes "the", a television station is seen on, a radio station is heard on, and the outlet record did not say which. Seen: News, a talk about an election result at a place with a radio station.

**Cause.** Found in code: src/director/words.ts `properName` spares only call letters with a band suffix (the bare letters of a radio station, "KKFX", are title-cased), and src/director/conversation.ts (the in-paper talk) and src/director/scene.ts (the address heard-on and the sitting's outlet) called it on an outlet's name; the press module's outlet rows hold the kind (`OutletRow.kind`) but no line could read it.

**Fix.** Say an outlet's name only as its record has it, with no case rule guessed from the shape of the name (a bare four-letter capital word such as "WEST" must keep title-casing in other record names), and add one reader of the outlet record, `outletTelling` in src/core2/modules/press.ts, whose medium (paper, television, radio, online) and whether it takes "the" reach every line as the facts `outlet-paper`, `outlet-television`, `outlet-radio`, `outlet-online` and `outlet-the` through `outletFacts` in src/director/conversation.ts. The Words lead's lines then read them.

**Time box.** 2 hours.

**Rules.** No hand-written player text; no named station or place in logic; one place says how an outlet is named, and the old `properName` calls on outlets are removed, not left beside it.

**Done when.** In the running game, in Creve Coeur, Illinois (seed pl5; a radio station, television stations and newspapers), a second session reads a neighbor's talk about the paper or station and sees the call letters in capitals, and the test at that place names each outlet's kind and whether it takes "the" by record.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts,src/director/scene.ts,src/core2/modules/press.ts,src/director/outlet-telling.test.ts

**Notes.** Nov 15: not done at #9352's fold. Seen again at Salado, Texas (4864268), seed review1:2: a reporter at KZBY said "I've been working at Kzby." through `employerWords` and `properName`; fixed by saying an outlet's name through `businessNameSaid` (src/director/words.ts), which keeps a media organization's name as its record has it, the one place `organizationName` and every employer line read (pinned in src/director/outlet-name-said.test.ts).
