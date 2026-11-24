# Confirmer replay: Lane 1, Path 1, after #7239 (Haleyville)

Main db8af7b0b0 (includes #7239, Alabama towns vote in 2025), Nov 4, 2026. New Game in Haleyville, Alabama (creator; replay ab5f58e9be125c95), Emily Carter, born 1985, the Week button once a week (`haleyville-filing.log.txt`).

- Nothing is open for 17 weeks. On May 20, 2025 (week 18) the Campaigns screen lists the August 26, 2025 town election: five "Council member" races, one per at-large seat, each named by its holder, and the Mayor (`haleyville-001-campaigns-open.jpg`). The player may file for a council seat and for mayor.
- The race page says "Filing closes Jul 15"; the municipal clerk Juan Copeland says "You've got until July 15 to get it all back to me." The dates match (`-002-race-page.jpg`, `-003-talk-26.jpg`).
- No petition here: the filing goes straight onto the ballot.

**Result: fail at "an at-large council as one pooled race".** The five at-large seats are five races, which is `elections-at-large-race-pooled` (open). #7239 fixed the year: the council race now comes in 2025 (`elections-town-council-on-state-municipal-cycle`). The petition half (Johnson, Minnesota) was not replayed.
