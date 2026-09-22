---
id: art-bench-says-what-it-is-still-waiting-on
impact: none
---

Development tooling: the Art Bench reports a batch as pending while any item
it declared is still outstanding, retries a read that timed out instead of
rejecting it for good, and names duplicates rather than leaving them out of
every list. Nothing in the game changes.
