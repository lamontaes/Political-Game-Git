# Notes that were in src/director/data/swearing-in.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

Taking office is an event the player is at (owner, Sept 22: 'swearing in needs to be an event'; Oct 29: 'that's just a scene... depending on what your office is, you'll give a speech'). The offices engine's took-office record fires it; this file holds only what the scene reads that no engine records: why the heads of an executive branch give an address (which offices those are is src/core2/data/offices/executives.json), and how many colleagues stand in the room. It holds no sentence: the oath, the narration and the address are the English engine's banks (scene-talk, scene-words, journal).

## `address.about`

The offices whose holder gives an address when sworn in: each office that heads its level's executive branch. A mayor, a county executive, a governor and a president each speak on the day; a council member, a commissioner or a legislator takes the oath and sits down. Which offices those are is the `heads` field of src/core2/data/offices/executives.json, the one list of executive offices.
