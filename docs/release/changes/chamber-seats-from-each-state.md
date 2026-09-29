---
id: chamber-seats-from-each-state
impact: minor
section: Changed
title: Each legislature seats as many members as the state's own
---

Before, a legislature the game builds took its size from the state's Census
districts, and a chamber with none was sized by a draw. A state whose
districts elect more than one member came out too small: Arizona's House had
30 members instead of 60, and New Jersey's Assembly 40 instead of 80. Idaho,
Maryland, North Dakota, South Dakota, Vermont, Washington and the West
Virginia Senate were short the same way.

Now each chamber seats the count The Council of State Governments lists for
2023 (The Book of the States, Table 3.3). A chamber no table lists takes the
middle of the compiled chambers' range, marked as an estimate. A legislature
already seated in a saved game keeps the size it was seated with.

A game saved before September 29, 2026 with a veto override vote in one of
these legislatures loads again. Correcting each state's override bar had
made such a save fail to open; the vote is now checked against the bar it
was taken under.
