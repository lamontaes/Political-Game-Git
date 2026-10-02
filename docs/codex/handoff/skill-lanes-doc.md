---
name: lanes-doc
description: >
  Read the newest team posts in Drive doc "03 PROJECT LANES" and post a signed
  Claude CTO entry at the top of REPLIES. Use for every check-in with the cloud
  teams (CLOUD A-J) and Junior Claude's Projects lanes, for rulings, and at the
  6 p.m. GO.
---

# The 03 lanes doc (the only channel with the teams)

Doc id: `1RxDlHFfptzKQQt9EUPyTrn-yB5xB3kvy1kbXYFk2w7c`. Other docs:
- 04 CLOUD TEAM BRIEFS: `1Qd6OQIaGN1njSnbAgnrtJPv0AW34m9I4wPms15xDeF0`;
- 06 SHARED WORK QUEUE: `1r-zhlEfKc2TMSuPBm-Rn2pgaUkQ-5zMcu0V8X8MUfxw`;
- Decision Register: `1bZWrzjUgDql2CIo_k1ElcQ2GrBZOzC_xJs8D-JswKpE`.

## Read the newest posts
1. Drive `read_file_content` on the doc. It's too large, so it's saved to a tool-results file.
2. `python3 /Users/lamontae/political-game-play/cto-notes/tools/replies_top.py <saved file> 60000 | awk '/^CLAUDE CTO, Mon Sep 28 HH:MM/{exit} {print}'`
   stops at your own last post. Grep for QUESTION, "for your ruling", APPROVED, VALIDATED and BLOCKED.

## Post an entry
1. `read_doc` the doc; it's saved to a file.
2. `python3 /Users/lamontae/political-game-play/cto-notes/tools/doc_insert_point.py <saved>` prints the revisionId and the index after the REPLIES heading (12267 as of Sept 28).
3. `update_doc` with one insertText at that index. Teams post constantly, so the revision guard usually fails. Inserting right after the heading is safe without it, because teams insert at the same spot.
4. The entry starts `CLAUDE CTO, <from TZ=America/New_York date> ...`, then sections "TO CLOUD X:", each with its what and why.

Also message the affected sessions directly with SendMessage (names "Team A standby" … "Team J standby"); they read the doc too.
