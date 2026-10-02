---
name: feature-walkthrough
description: Take one game feature from a question to a held draft in the game, Lamontae's gold standard (why-chain, research, revisions, numbered parts, simulate/record/world/checks, proof run), and post it on the docket with drop-down sections. Use for every feature going into Our Civic Duty.
---

# Feature walkthrough (Lamontae's gold standard, Sept 30 2026)

Worked example to imitate: evictions, Sept 30 1:40–2:00 a.m. (docket cards x-evict, x-evict-2, x-evict-3; coordinator doc entry "OVERNIGHT BUILD: WHAT HAPPENS AFTER AN EVICTION").

## Steps
1. **Why-chain from the real code.** Check out origin/main in /tmp/wt-main. Grep the system. Write "X happens because Y; why Y?" until it bottoms out. Label each bottom: a person's decision from their record (good), a researched mechanism with a size (good), a stand-in number or seeded draw (finding), or nothing happens at all (finding). List the real-world reasons the chain leaves out.
2. **Research.** Read the actual source. For PDFs: WebFetch saves the file; extract text with `node scratchpad/pdftext.mjs <pdf> <out.txt>` (pdfjs from /tmp/wt-play/node_modules). Quote exact numbers and time horizons. Note where and whom the study covered.
3. **My revisions.** Breadth (never one place stretched to all; send team 9 to corroborate). Outcomes such as pay, health and credit are CHECKS the world must land near, produced through people, never flat cuts. Mark early evidence as provisional.
4. **What gets built.** Numbered parts Lamontae can keep or drop. Build for all cases one way, never a small pilot. The owning Codex team builds it as a draft PR held for his look.
5. **Split it:** SIMULATED (people deciding from their own records), RECORDS (bookkeeping), WORLD PIECES that must exist for the decisions to work (say whether each exists today), CHECKS only. Always cover the "what if there's none" case (no shelter, no relatives, no transit). Far from the player: same decisions, lighter detail, filled in on demand.
6. **Proof.** A watched run in a random place listing every case and outcome against the research checks. Use observer mode, a dev tick or a proof script; build one if needed.
7. **Worked example.** Named people, real dollar amounts, month by month.

## Posting
- Coordinator doc (00 WAVE COORDINATOR, 1jakd6cgW5v2nQbSikQ6xis1ZChuBmYzVfwq1tHfyYkA): finding, approved research numbers, team 9 corroboration asks, the build parts for the owning team (held draft, changed tests only), and effects-map links for the coordinator.
- Docket (X9oY94hW8FMoU9jyyQZLGt): one card per step, or a Tonight plan item with `sections` drop-downs (Why-chain, Research, My revisions, What gets built, Simulated / Records / World pieces / Checks, Proof, Worked example). Plain words, no engineer talk.
