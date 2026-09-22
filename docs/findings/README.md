# Findings

What was measured, where, and what it means for a player. One file per finding,
dated, naming the head it was measured at.

A finding belongs here when somebody would otherwise have to rediscover it: a
defect measured and fixed, a piece of research admitted and the part of it that
was deliberately left out, a contradiction between two lanes' work. The
conclusion alone is not enough — each file says what was run and where, so a
reader can disagree with it on evidence rather than on memory.

These are reports, not tasks. Current work lives on the Assignment Board, open
questions in `docs/research/requests/`, and binding product choices in
`docs/GAME-CONSTITUTION.md` and `docs/decisions/DECISION-LOG.md`.

## 2026-09-22

- [Where an ethics complaint goes, state by state](2026-09-22-ethics-routing-coverage.md)
  — twenty-four jurisdictions now reach their own body, twenty-seven still
  reach the simulated review, and what was deliberately not claimed about
  either.
- [Nine veto overrides read from the law, forty-two left out](2026-09-22-veto-override-readings.md)
  — why a threshold quoted from a research summary was kept out of the runtime
  while a threshold read from a constitution went in.
- [Four states whose generated veto override contradicted their constitution](2026-09-22-generated-overrides-contradicting-constitutions.md)
  — Tennessee, North Carolina, Virginia and West Virginia, measured, reported
  and fixed the same night, with two gaps still declared.
- [The front page read like machinery, and only half of that was the renderer](2026-09-22-news-front-page-reads-like-machinery.md)
  — the headline was the simulation's note to itself, three papers printed one
  sentence, and the repetition turns out to be six authored subjects in a
  source file rather than a rendering defect.
- [The prose gate was failing on clean main, and it blocked everything](2026-09-22-prose-gate-red-on-main.md)
  — one stale sentence anchor, measured both ways, blocking every branch that
  added a file.
