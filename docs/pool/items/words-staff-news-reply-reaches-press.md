---
id: words-staff-news-reply-reaches-press
title: "An officeholder's answer to a story against them reaches the press: calling the outlet gives their side"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When an aide brings an officeholder a printed story that runs against them (words-scene-staff-bad-news-a), the officeholder's reply is recorded as a scene.reply, as every scene's is, but no engine reads it. The parent item asked that the reply (respond, ignore, call the outlet) be an event the press and views engines read. The aide already offers "You could call {outlet} and give them your side." The press engine should read an agreeing reply to that offer as the officeholder's statement to the outlet, the way an interview is read, so the outlet's next story on them or their bill can carry it and its readers' views move by it.

**Rules.** An effect is a read: the press engine reads the scene.reply record by its cause and move, never a new record type. No dice: what the outlet does with the statement follows its own line and the reporter's regard, by record. Ask why: the next story cites the reply's record id.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, an officeholder who answers an aide's story with the reply that calls the outlet has that reply read by the press engine: the outlet's next story about them or their bill cites the scene.reply record id, and its readers' views move by the statement, shown by record id in a test in src/director or src/core2.

**Files.** src/core2/press-desk.ts, src/core2/modules/press.ts, src/director/purpose-scene.ts

**Notes.** TODO
