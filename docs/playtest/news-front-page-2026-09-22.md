# What the front page actually prints

Measured on `main` at `445441a5`, 2026-09-22, by the playtest lane.

## How it was measured

A party founding was driven to adoption through the simulation's own writers —
`proposePartyInitiative`, `respondToPartyInitiative`, `adoptPartyInitiative` —
in an opening life generated from `DEFAULT_NEW_GAME_SETUP` with the seed
`measure-news-party`. The world was then advanced sixty days with the campaign
and election transition registry, so the press desk ran its own sweeps, and the
front page was read through `projectNewsFrontPage`.

Nothing was injected. Every record on the page was written by the game.

## Finding one: the news already carries a party change

It was previously written down, by this lane, that the news front page renders
no party evolution. That is false, and it was false when it was written; it had
been read off a screen rather than measured.

The founding appeared on the front page, published by The Evening Compass. The
event is `party.organizing-decision`, it is public, it is not excluded by the
press desk's prefix list, and `resolvePublicationSource` resolves it as a civic
event. The pipeline works end to end.

So a player who never joined a party can already learn that one was founded.

## Finding two: the headline is the machine's words, not a writer's

The story read:

> 2 organizers publicly decided to form The Commons Party.

A numeral where a person would write a word, no names, and "publicly decided",
which is the mechanism describing itself. The headline is the event's internal
`summary` field, which exists to identify a record, printed at a reader.

Every story on the page has this shape. It is not specific to parties.

## Finding three: three papers, one sentence

Thirteen publications produced a front page with the same headline printed
three times, word for word, by three different outlets:

| Outlet | Headline |
| --- | --- |
| The Evening Compass | Several governments opened talks over fishing rights in shared waters. |
| Longwire Public Affairs | Several governments opened talks over fishing rights in shared waters. |
| Civic Ledger | Several governments opened talks over fishing rights in shared waters. |

The same for the shipping story, three times, and the January unemployment
figure, twice. Ten of the twelve stories under the lead are one of three
sentences.

Three papers covering one story is right and real. Three papers printing the
identical sentence is not, and it comes from the same cause as finding two:
each outlet renders the event's `summary` rather than writing its own account.
The outlets already differ in scope, resources and reporters, so there is
something to write from.

The visible effect is worse than the cause: a front page that looks broken
rather than busy, because the reader's eye lands on the repetition first.

## What this does not establish

- How much of a party's life a non-member should see. The owner marked that
  extent "tbd" himself; it is open in
  `docs/research/requests/party-evolution-public-or-private.json`.
- Whether the duplication is bounded. It was measured at sixty days in one
  world with one seed, and three outlets. More outlets may make it worse.
- What the headlines should say. That is authoring work, and the prose
  process in `.agents/skills/civic-prose/` is where it belongs.
