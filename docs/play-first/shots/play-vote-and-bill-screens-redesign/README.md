# The meeting panel (play-vote-and-bill-screens-redesign, meeting half)

Bench 1440×900. Place: Brookside, Delaware (County of New Castle commission). Seed `4d50e1f88df997f9`; the player steps in as a commissioner through the Advanced start and drafts a bill. Replay: `BENCH_SEED=4d50e1f88df997f9 SHOTS_DIR=<dir> node src/bench/meeting.browser.mjs`.

- `meeting-before.png` (main): a narrow panel of huge headings and seven stacked full-width buttons per item, no members, no tally, no result.
- `meeting-after-before-vote.png`: a titled panel (the body), each item with its name, number and sponsor, the seven members as round faces, the paper and speech buttons in one row and the four votes in another.
- `meeting-after-vote.png`: after Yes on the first item the members are ringed green or red by how each voted, the result ("Enacted, 5 yes, 2 no") and a tally bar sit under them.

Where it still differs from the owner's ask: the chamber behind the panel is empty. The room (`county-commission`) has no mannequin plate, so its members come back `no-plate` from the staging and cannot be drawn in it. Asked of People v4.
