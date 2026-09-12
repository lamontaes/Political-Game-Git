# The playable build with rendered generated people

This is the thing to open. It is a development preview of **unreleased candidate
art that nobody has approved**, running the real game.

## Exact build

|                 |                                                                            |
| --------------- | -------------------------------------------------------------------------- |
| **Head**        | `8ebd522e92d101d6ef63045ecebe4ae64dc86333`                                 |
| **Branch / PR** | `claude/ui144-pt3-composition` — PT3's composition, PR #184                |
| **Mode**        | `?art-preview=candidate`                                                   |
| **Contains**    | #179's fitted Visual4 provider, plus PT3's crown / panel / selection fixes |

Not `?view=character-proof`. That is the developer gallery and it is not this.
This is New Game, a life, a room, a save and a reload.

## Start it

```sh
git fetch origin claude/ui144-pt3-composition
git worktree add ../ocd-play 8ebd522e92d101d6ef63045ecebe4ae64dc86333
cd ../ocd-play
npm ci
npm run dev -- --port 5190
```

Then open:

```
http://127.0.0.1:5190/?art-preview=candidate
```

A worktree rather than a checkout so your own working folder is untouched, and
port **5190** so nothing goes near your play folder on 5188. Any free port
works; the mode in the address is what matters.

## How to reach a person

New Game → **Custom start** → age 34 → **Kentucky**, then a hometown
(Lexington) → **Later years** and **Shares a home** → Discover through play →
**Begin**. Step through the household introduction and you are in the room with
somebody.

The household matters: `shares-a-home` is what makes another adult legitimately
present. Nobody is injected into a solo home, and the room stays first-person —
the player is not standing opposite themselves. Their own likeness appears in
their record, which is where it belongs.

## What the run actually did

Five fresh lives through that exact route, then two more saved side by side.

```
play-a  Cedric Jenkins     average-woman-a  6 layers
play-b  Carmen Walls       skinny-man       6 layers
play-c  George Tran        fat-man          6 layers
play-d  Vanessa Stewart    average-woman-b  6 layers
play-e  Yasmin Lloyd       average-woman-a  5 layers
```

Four distinct bodies, five distinct heads, five distinct tops across five
lives — and on every one of them:

- **pointer selection works at the figure's centre** (`elementFromPoint` returns
  `PERSON` at both the centre and the upper body). This is PT3's repair landing:
  on the earlier composition the centre returned `section.game-story`, so only
  the part of the figure above the panel could be clicked.
- **the person's record opens with a portrait**, and the portrait's layers are
  byte-identical to the room's layers — one identity across contexts, not two
  compositions of the same person
- **Keep → reload returns the same person**, same name, same parts
- **only `political-life-worlds-art-preview` is ever created**; an ordinary save
  cannot be touched by this mode

Two lives saved together, both reopened from the saves screen:

```
Leonard Wilder  (Lexington)   fat-man       + navy zip hoodie + khaki shorts
Sean Rodriquez  (Louisville)  average-man   + gray long-sleeve tee + light gray dress trousers

both listed: 2      the two reopened lives differ: true
each reopened life matches its original exactly: true
```

No mixing, no rerolled parts.

Screenshots: `play-a-room.png` (the one to look at), `play-a-record.png`,
`play-a-reloaded.png`.

## Two things you will see, and what they are

**Everybody is wearing the same khaki shorts.** Four of the five are — and Sean
Rodriquez above is the exception that proves it, in dress trousers. Eleven of
the twelve banked bottoms are authored for `average-man` alone and the fit
pipeline measured them against the other bodies and rejected them: male trousers
miss a woman's silhouette by 20.2% of body span after the best affine derivable.
Khaki shorts pass because they stop above the knee, above where the silhouettes
diverge. It is a real gap in the art, not a weighting, and it is not hidden by
one — see `../WARDROBE-COVERAGE.md`.

**A face is not painted in the same skin as the body carrying it.** This is the
real defect in the run above, and it is systematic rather than unlucky: every
banked head declares every banked body as compatible, so the compatibility
filter passes all of them and the seeded draw put any face on any body.
Measured on the rasters, the chosen head sat a median of 54 RGB from the chosen
body across the twenty-five people five lives create, worst case 85.

It is fixed, for people created from now on, by appearance recipe **v2** — see
`../APPEARANCE-RECIPE-V2.md` for the same twenty-five people measured under both
recipes (median 54 → 24, worst 85 → 27). The recipe is declared by
`buildProductionWorld`, not defaulted into, so nobody already saved is
repainted and the fixture constructors with accepted serialized bytes keep
building exactly the people they always built.

> **A correction to an earlier version of this note.** It previously read the
> run as "names and bodies do not agree about gender", citing Cedric Jenkins on
> a woman's body and George Tran with a feminine head. That was wrong at the
> root: the name corpus deliberately does not encode gender, so a name is not
> evidence of anybody's identity, and long hair or a given garment is not a
> contradiction. Nothing about gender, anatomy or complexion is inferred from a
> name anywhere in this work. What was actually measurable — and what was
> repaired — is the skin mismatch above, read from pixels.

The fix costs face variety, and the cost is the art's rather than the policy's:
the nine banked heads cluster darker than the five dressable bodies, so under
v2 two faces stay in play where v1 drew nine. Widening the tolerance buys faces
back only by restoring the mismatch. Getting more faces needs heads measured
into the bodies' tone range — a specific, named art limit.

## What this preview is not

Candidate art in an isolated database, for looking at. It approves nothing,
promotes nothing, and cannot be selected by a shipped build. Normal production
selection keeps every guard it has, including the ones that refuse these rooms
for missing floor calibration.
