# Planning words that ended up in runtime data

Measured 2026-09-22 against `origin/main` at `1c4992e8`. Audit lane: hardcoded
content. This is a fourth species alongside the three already filed — hardcoded
names and bills, systems gated shut, and decision thresholds that are bare
constants. The species is: **a coordination artefact that became a product rule
by being written into a field something reads.**

## 1. Five person art requests are held by a lane letter that no longer exists

`art/requests/art-desk-reconciliation.json` carries a `holds` map. Five entries
hold the value `d-held-people`:

- `person-production-standing-body`
- `person-production-seated-body`
- `person-child-body-morphology`
- `person-adult-body-silhouette-reexport`
- `person-adult-lectern-pose`

`src/authoring/art-desk.ts:304` turns that value into a coverage disposition of
`history`, with this note, which is what the Art Desk displays:

> D's hold covers new people/body/head generation. Visible as history, not a P0
> generation job.

`src/authoring/artbench.ts:1129` is blunter: **any** `generationHold` at all
becomes `"history"`.

Where the letter D comes from: `docs/plans/active/alive43-a-art-desk.md:14`, an
`## Excluded` section that reads, in full —

> PlayerGame, D-held people/compositor/head/geometry, B legislation, W
> producers, L intro UI, LAND Play, private pack pixels on public GitHub.

That is a note about which lane owned which surface while several lanes worked
at once. It is not a decision about the game.

**There is no lane D plan in the repository.** `docs/plans/active/` holds
`alive43-a-art-desk.md`, `alive43-l-intro-recap-encounters.md` and
`alive43-w-world-and-parties.md`. `grep -rl "Role D\b" docs/plans/` returns
nothing. The hold names an owner that cannot be looked up.

The file landed on **2026-09-15** (`253103dd`, "Add private Art Desk with
durable reviews and compatibility tags"). So for a week, a note about who was
holding a pencil has been reading, to anyone opening the Art Desk, as a
standing ruling that new people, body and head generation is closed work.
Nobody decided that.

The hold carries no expiry, no date and no resolvable owner, and nothing checks
whether the owner still exists.

**Smallest honest change:** drop the five `d-held-people` entries from the
holds map. That returns those requests to the Art Desk as ordinary open work.
No player-facing change; the Art Desk is a private authoring surface. What
changes for lamontae is that five person art requests he has not been shown
since 15 September come back into view.

Filed for ChatGPT as `planning-words-that-became-product-rules` (P1).

## 2. Two more field values carry lane names, and neither reaches a player yet

Both are the same species caught before it was exposed, so they are recorded
rather than fixed.

- `src/simulation/education-study-progression.ts:26` defines a shared
  `provenance` object whose note is `"WEEKEND19-F period study progression."`
  It is written into world records at six sites (`:285`, `:451`, `:590`,
  `:603`, `:623`, `:753`). A wave name is now a provenance fact inside saved
  worlds. It does not currently render.
- `src/simulation/executive-work-entry.ts:512` — `EXECUTIVE_NORMAL_ENTRY`
  carries `owner: "REST37-X / N office identity"` and a `missingProducer`
  paragraph written in lane vocabulary. Its only consumer is
  `projectExecutiveEntry` in `src/presentation/executive-entry.ts`, which
  **has no caller in `src/player/`** — `PlayerGame.tsx` and
  `IncidentResponsePanel.tsx` import only the other two exports of that file.
  So a projector written to be shown to a player exists, carries lane words in
  an `owner` field, and nothing mounts it.

## 3. Negative result: the rest of the planning vocabulary is comments, not data

I swept `src/` and `art/` for `P0`, `P1`, `lane`, `Role <X>`, `ALIVE4`,
`WEEKEND`, `REST37`, `packet`, `handoff`, `worktree` and `wave`. The large
counts are false positives of the ordinary kind — `lane` is road and transit
lanes, `wave` is signal shapes, `packet` is the canonical fact-packet term. Of
the narrow hits, every one other than the three above is a **code comment**
recording which wave authored a module, which is provenance for a developer
reading the file and reaches nothing.

The discriminator that matters, and the one to use next time this is swept: a
planning word in a `//` or `/** */` comment is documentation; a planning word
in a **field value** is data, and data gets read.

## 4. Separate find, same sweep: a player-facing "Sources and detail" panel

Not this species, but it turned up on the way and it is live.

`src/player/CampaignWorkspace.tsx:100` — `splitEligibilityText` takes the
sentence explaining why a character cannot file for office and splits it in
two: any sentence matching an ISO date or `/(observed|retrieved|source text|
shapefile|pack)/i` is routed to a `provenance` list, everything else to
`reasons`. The reasons print as the plain answer; the provenance list prints at
`:394` inside a `<details>` element labelled **"Sources and detail"**.

That is a source-and-provenance disclosure on a player-facing screen — the
campaign workspace, which every player who tries to run for office reaches. It
is the same class #382 took off the World overview, surviving because it is
behind a disclosure triangle rather than in the sentence. It is deliberate code,
not an accident, so it needs a decision rather than a quiet deletion: either
the rule means this goes too, or a folded-away source panel is the agreed
exception.

Not fixed here. `CampaignWorkspace.tsx` is a live surface with other lanes in
it, and this is one line of render to remove once somebody says which way.
