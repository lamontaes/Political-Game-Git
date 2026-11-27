---
id: offices-fill-vacancy-steps
impact: none
---

`fillVacancy` (the offices engine's rule for how an empty seat is filled, 178 lines) is now a short dispatcher over named steps: `acceptingResident` (the best suited resident who accepts), `appointToVacancy`, `seatNamedSuccessor` and `scheduleSpecialElection`. The order of every read and write is kept, and the records proof over two played years (Old Orchard Beach, Maine, seed offices-fill) is identical before and after.
