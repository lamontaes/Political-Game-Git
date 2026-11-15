---
name: file-a-pool-item
description: >
  How to add or change a pool item by hand in Our Civic Duty without
  `npm run pool -- add`: the file under docs/pool/items, the Cause prefixes
  the standard allows, the release declaration, and where the new file goes.
  Use whenever you find something worth an item (a defect, a gap, a finding
  from a measurement) while working a thread, and before writing an item's
  Cause. Not for claiming or finishing an item (session-start) or for
  pool-only bundles on main (pool-notes).
---

# File a pool item by hand

`npm run pool -- add`, `claim` and `next` push to main. On this account nothing pushes to main, so edit the item file yourself, on the thread's own branch.

1. **Search first** (`look-first`): `docs/pool/items` for a match. If one exists, add your evidence to its Notes instead of a twin.
2. Copy a neighboring item's frontmatter: `id`, `lead`, `standard: 2`, `model`, `effort`, time box, `Files`, `Waits on`. The id is the file name.
3. **Cause begins with one of four prefixes** and nothing else (`.agents/rules/pool-item-standard.md`):
   - `Found in code:` a path that exists, with a function or line, and the record ids followed.
   - `Measured:` the place and seed, or the command that shows it.
   - `Design:` the owner's ruling or the design page it follows.
   - `Needs cause.` an item that is not built until someone finds it (`docs/pool/FIND-A-CAUSE.md`).
4. **Fix** names the existing function it changes and says where the player sees it; an item with no place the player sees is dropped. **Done when** keeps the words "second session".
5. Do not set `checked:`; the lead does.
6. Add a release declaration `docs/release/changes/<id>.md`. `impact: none` has no section or title; any title is under 140 characters.
7. Run `npm run pool -- --check` and prettier on the file. Known reds on two words items are not yours.
8. The item goes in the thread's own PR, not a PR of its own.
9. An item you set `status: in-pr` needs `pr:` filled, and the PR number exists only after the PR is opened: open the draft, then set `pr: <number>` in a second commit (the pool guard reads 19 of 20 until you do; Nov 15, the town hall stop).
10. **Write an item with every field named, never positionally (Nov 15).** A shell function that filled the template by argument position shifted each field down one (the Cause text landed under What, the file list under Waits on) and CI's pool guard failed on all three items; the local check had not looked at them yet. Write the file with named fields, then open it, run `npm run pool -- --check` and read what it says of your items.

## A new item fails the pool check on its own words (Nov 15, fee-bills thread)

- The What must end in a sentence beginning `Seen:`, `Feeds:` or `Guards:`, and a `Measured:` Cause must contain the word "seed" (`REALISTIC_SEED=` alone does not count). Run the pool check right after filing.
