---
id: words-address-records-and-speaker-id
title: "A person's addresses (floor speech, briefing, town hall) are recorded, and the composer knows the speaker, so crafted devices are earned in play"
area: words
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/address-records
pr:
blocked-on:
after: words-speech-craft-earned
source: added with npm run pool -- add
claimed-at: 2026-10-20T08:05:58.342Z
---

**What.** PR #5601 added the gate that admits a crafted device only as far as the speaker's recorded addresses earn it (speakerAddressRecordIds, devicesEarned), but nothing writes an address record and the press-briefing newscast carries its anchor only as a packet slot, so no played-world line uses the gate. Write one address record each time a person gives a floor speech, a briefing or a town hall in the director's producers, with the speaker, the register, the date and the source scene id, and pass the speaker's records into the composer as speakerAddressRecordIds. Give the newscast a speaker person id where the speaker is a recorded person (a press secretary) so the records can be found.

**Rules.** An effect is a read: the composer reads the address records when it words a line and names them in sourceRecordIds. No dice: the count of a person's addresses decides the devices, never a share. One rule, all 56 places: no place named. OWNER DECISION: what counts as an address and how many earn each device (SG-WORDS-speech-craft-earned); read docs/coordination/OWNER-DECISIONS.md first and build the simplest version.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 (name and seed in the PR body), a recorded person who gave no address has no crafted device in a line of theirs, and the same person after their recorded addresses has at least one device, shown by the address record ids in the line's sourceRecordIds; a test in src/english or src/director states it.

**Files.** src/english/english-composition.ts, src/english/english-newscast.ts, src/director/conversation.ts

**Notes.** Follow-up of words-speech-craft-earned (#5601). Authored variants with a device do not exist yet, so a device bank is needed too (a Words-line task).
