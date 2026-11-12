# Measurer Tally: measured causes for gap-sheet rows, November 12, 2026

Branch `claude/measurer-tally-gap-rows`, off `claude/skills-gap-trace` (33ed4ac82d). Scripts are in `scripts/measure/`. No game code changed. Every run names its place and seed.

## Row 2: how many adults carry "works outside the town"

**Measured.** `scripts/measure/row02-outside-jobs.ts`: build the town, fill in 600 counted adults (ages 18 to 64, spread evenly over the households) with `fillInPerson`, read each one's job title.

| Place | Seed | Counted adults 18-64 | Sampled | No job | "Works outside the town" | Share of sample | Share of those with a job |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Songsong, Rota, Northern Mariana Islands | r2a (f04e657b0bc6b403) | 970 | 600 | 93 | 441 | 73.5% | 87.0% |
| LaBelle, Florida | r2b (ee80728a75cdd79b) | 16,128 | 600 | 119 | 445 | 74.2% | 92.5% |
| Grandview, Washington | r2c (940b3e7c9ea31407) | 25,257 | 600 | 84 | 466 | 77.7% | 90.3% |

**Result.** About three in four filled-in adults, and nine in ten of those who work, carry the title. Every other title is a handful (the next is 8 of 600). So the title is not the fill-in's leftover for a few people; it is the job most adults in a drawn town are given.
