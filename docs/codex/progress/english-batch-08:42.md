# English dialogue batch — 08:42

## Who

This review artifact contains ten saved turns from the ordinary new-game dialogue report: twenty spoken lines, with the player’s recorded line followed by the named person’s saved reply.

## Why

The sampled scene is an invitation to meet. The run spans random localities and different selected replies, so reviewers can inspect the same situation across people and places.

## Parts

- Runner: `scripts/dialogue-report/run.ts`, function `runDialogueReport`.
- Exact run: 20 lives, 2 days each, age 34, seed `english-batch-0842-matrix`. It generated 19 conversations and 23 saved turns in randomly selected localities. This artifact selects the first ten turns.
- Runner workaround: the normal script entry fails at module load because `scripts/playtest/mass-play/driver.ts` imports `performCareerWork` from `src/simulation/career-path7.ts`, where it is not exported. The report was run from a temporary copy that supplied the same seeded `rng` and `placeFor` helpers locally. New-game, conversation and saved-record code was unchanged.
- Exact report result: 0/23 turns carried English composition part keys. The report omits stable event IDs, personality facts and relationship facts. I have not inferred those missing values.
- Common offered wording recorded by the runner:
  - “Say on January 15, 2026 works” — “On January 15, 2026 works. I’ll be there.”
  - “Offer a different day” — “I can’t do on January 15, 2026. Could you do January 22, 2026?”
  - “Say you can’t” — “I can’t at the moment. I’m sorry.”
  - “Ask what it’s about” — “What’s it about?”
  - On follow-up turns, the saved offer omitted “Ask what it’s about.”

## Exact fact packets and assembled output

All spoken lines below are copied verbatim from the report’s saved conversation projection. Every turn was dated January 6, 2026 and used the internal subject key `scene-favor`. The exact selected action is captured by the player line.

### Packet 01 — Chouteau, Oklahoma

- Game seed `english-batch-0842-matrix-0`; Alice Jones and Carrie Cross; Carrie invited Alice to meet. Selected: ask what the meeting was about. Part keys: none.
  1. You asked Carrie what the meeting was about.
  2. “Nothing in particular. I just thought of you,” Carrie says.

### Packet 02 — Chouteau, Oklahoma

- Game seed `english-batch-0842-matrix-0`; Alice Jones and Carrie Cross; same invitation, after the first question. Selected: offer January 22 instead of January 15. Part keys: none.
  3. You offered Carrie January 22, 2026 instead.
  4. “Maybe. I’ll check,” Carrie says.

### Packet 03 — Delphos, Kansas

- Game seed `english-batch-0842-matrix-1`; Kendall Wise and Kristen Wilkerson; Kristen invited Kendall to meet. Selected: offer January 22 instead of January 15. Part keys: none.
  5. You offered Kristen January 22, 2026 instead.
  6. “Maybe. I’ll check,” Kristen says.

### Packet 04 — Moab, Utah

- Game seed `english-batch-0842-matrix-2`; Travis Perkins and Justin Ingram; Justin invited Travis to meet. Selected: offer January 22 instead of January 15. Part keys: none.
  7. You offered Justin January 22, 2026 instead.
  8. “Maybe. I’ll check,” Justin says.

### Packet 05 — Washington, District of Columbia

- Game seed `english-batch-0842-matrix-3`; Isaiah Simpson and Rachel Rowe; Rachel invited Isaiah to meet. Selected: ask what the meeting was about. Part keys: none.
  9. You asked Rachel what the meeting was about.
  10. “Nothing in particular. I just thought of you,” Rachel says.

### Packet 06 — Washington, District of Columbia

- Game seed `english-batch-0842-matrix-3`; Isaiah Simpson and Rachel Rowe; same invitation, after the first question. Selected: accept January 15. Part keys: none.
  11. You agreed to meet Rachel on January 15, 2026.
  12. “That’s settled, then,” Rachel says.

### Packet 07 — Delphos, Kansas

- Game seed `english-batch-0842-matrix-4`; Julian Morrison and Meghan McKinney; Meghan invited Julian to meet. Selected: accept January 15. Part keys: none.
  13. You agreed to meet Meghan on January 15, 2026.
  14. “That’s settled, then,” Meghan says.

### Packet 08 — Haviland, Kansas

- Game seed `english-batch-0842-matrix-5`; Derek Workman and Chase McLean; Chase invited Derek to meet. Selected: decline. Part keys: none.
  15. You turned down meeting Chase.
  16. “Understood. Take care of yourself,” Chase says.

### Packet 09 — Frederiksted, U.S. Virgin Islands

- Game seed `english-batch-0842-matrix-6`; Leah Kim and Joshua Rivera; Joshua invited Leah to meet. Selected: offer January 22 instead of January 15. Part keys: none.
  17. You offered Joshua January 22, 2026 instead.
  18. “Let me look at that and come back to you,” Joshua says.

### Packet 10 — Cambridge, Massachusetts

- Game seed `english-batch-0842-matrix-8`; Clara Price and Zachary Roach; Zachary invited Clara to meet. Selected: decline. Part keys: none.
  19. You turned down meeting Zachary.
  20. “Another time, then,” Zachary says.

## Tests and review

- The batch comes from a new-game report that opened the saved turns through the conversation projection; no dialogue was rewritten or hand-authored for this output.
- Civic-prose review: all twenty selected lines are complete sentences with finite verbs. No clipped officialese or dangling appositive appears in this selection.
- Grounding review: names, places, dates, offered choices, selected actions and replies match the report. Unsupported personality, relationship and event-ID claims are omitted.
- Terminology review: `scene-favor` and missing part keys appear only as internal metadata; they are not presented as spoken words.
- The usual `npm run dialogue:report` entry is blocked by the missing `performCareerWork` export. Focused Vitest startup in this isolated worktree failed at `spawnSync git EPERM`; no test pass is claimed.

## Docket status

BLOCKED: no repository document or Drive result identified the destination `updates/kind big/phase english`. The exact docket URL or document ID is needed. The independent artifact preserves the generated output and measured limitations for review.
