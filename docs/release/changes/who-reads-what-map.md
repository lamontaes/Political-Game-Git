---
id: who-reads-what-map
impact: none
---

A map of every producer the game runs, what it writes, what reads it, and what
should read it and does not. Each missing link names the thread that owns each
end and says whether it is open, being built, handed off, waiting on research
or closed; a closed link must cite the test that fails without it. The entries
live one per file under `docs/connectivity/links/`, and
`npm run connectivity:links -- render --write` rebuilds
`docs/connectivity/WHO-READS-WHAT.md`. Nothing changes for a player.
