# A filing name on four player surfaces — Nashville, 2026-09-22

Tree: `claude/playtest-cwpd3o`, based on `main` at `d956b92a`.
Walk: a new ordinary life started in Nashville, Tennessee. Chromium 141 locally,
not CI's version.

## What the player read

The census label, not the name of the town, on four separate surfaces:

1. The home screen heading.
2. The parties screen, six times, including as part of a party's name:
   "Nashville-Davidson metropolitan government (balance), Tennessee Democrats".
3. The campaigns screen.
4. Inside the sentence that opens the day: "A day in Nashville-Davidson
   metropolitan government (balance), Tennessee, and a short list of things
   nobody else is going to do. Snow is in the next room."

The party name is what lamontae noticed first, and it is the worst of the four,
because it reads as a claim about what the party calls itself.

## Where it came from

Not a renderer. `LifePlace.displayName` itself, whose contract in
`src/simulation/life-places.ts` already says:

> What the player reads. Never a slug, an ID, or a fixture name... A player
> told they are in "Lexington-Fayette" is being shown a filing name; they live
> in Lexington.

Lexington was fixed by a hand-written special case. Indianapolis and Nashville
were not, so every surface downstream of `displayName` printed the Gazetteer
string verbatim.

## How wide it is

Measured against the shipped corpus, not estimated: 32,350 place rows. No
ordinary row ends in a lowercase unit type — the Gazetteer has already stripped
them. Exactly **8** rows carry "(balance)", and those eight are the whole of the
defect:

| Census row                                                    | What a resident says |
| ------------------------------------------------------------- | -------------------- |
| Athens-Clarke County unified government (balance), GA         | Athens               |
| Augusta-Richmond County consolidated government (balance), GA | Augusta              |
| Butte-Silver Bow (balance), MT                                | Butte                |
| Greeley County unified government (balance), KS               | Greeley County       |
| Indianapolis city (balance), IN                               | Indianapolis         |
| Louisville/Jefferson County metro government (balance), KY    | Louisville           |
| Milford city (balance), CT                                    | Milford              |
| Nashville-Davidson metropolitan government (balance), TN      | Nashville            |

Greeley County stays Greeley County: the merged half is the county itself, so
there is no separate town name to recover, and inventing one would be worse
than the census label.

## The fix

`residentPlaceName(censusName, usps)` reverses three census conventions rather
than carrying a list of eight places: drop "(balance)"; drop a trailing
lowercase unit-type phrase; drop a merged county name when the shipped counties
corpus confirms it is a county of that same state. Controls that must not move
— Springfield, Kansas City, Oklahoma City, Salt Lake City, Winston-Salem,
Wilkes-Barre — are asserted unchanged in `src/simulation/resident-place-name.test.ts`.

The census label is not discarded. It moves to `formalName`, so a legal or data
view and the place search both still carry it. In Nashville:

- `displayName` → `Nashville, Tennessee`
- `formalName` → `Nashville-Davidson metropolitan government (balance), Tennessee`

## Not established

Whether the same string reaches any surface not walked here. The four above were
read on screen; the fix is at the source field, so it should cover the rest, but
that is inference, not a measurement.
