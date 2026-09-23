# A real integrity check that has never run for any player

**Verified:** 2026-09-22 at `45ba86a4` on `claude/playtest-cwpd3o`. Found by
the people-and-life lane from their college trace; traced here independently
because this lane owns the campaign walk. Not fixed — the fix is a design
decision, stated at the end.

## The claim, and what is actually true

A campaign's staff list is written once, when the campaign is filed, and never
again. Eight places read it. One of them is the review that would catch a
candidate spending campaign money on themselves. Every filed campaign starts
with no staff, so that review has never run for any player.

Traced at this head:

- `campaigns.ts:754` creates `staffWorkRelationshipIds` as a local array inside
  `fileCampaign`, fills it at `:784`, and sets it on the record at `:857`.
- Outside tests, `staffWorkRelationshipIds:` is written in exactly two places
  in the whole repository: that local array and the field declaration at
  `types.ts:3296`. **No function anywhere produces a campaign record with a
  different staff list.**
- Both filing routes pass `staffPersonIds: []` —
  `campaign-projection.ts:699` and `nationwide-candidacy.ts:162`. So the list
  is not merely never updated; it starts empty every time.

The review itself, `press/matters.ts:531`:

```ts
const bookkeeper = campaign
  ? world.history.workRelationships
      .filter((r) => campaign.staffWorkRelationshipIds.includes(r.id))
      ...
  : undefined;
if (!bookkeeper) return done("press:no-one-reviewed-the-books");
```

With an empty list there is never a bookkeeper, so the path always ends on
`press:no-one-reviewed-the-books`.

## The offence works

The other half is real. `press/matters.ts:68` carries the action — "Use
campaign money for a personal expense. This is misuse of campaign funds" — and
`:150` types it as `finance.campaign-funds-personal-use`. It moves real money
and it can be alleged and taken to an ethics body.

So the offence is implemented and the thing that would discover it is looking
at an empty list.

## Two things it is not, which matter for how this gets written up

**It is not a lying surface.** There is no control anywhere that claims to
recruit campaign staff and quietly fails. The only "Join as a volunteer" button
in the game is `PartyChapterSurface.tsx:121`, and that joins a party chapter,
which is a different thing and works. This is a missing route, not a broken
one.

**It does not fail silently.** `press:no-one-reviewed-the-books` is a stated
reason. The fail-soft rule is working; it is just that the reason is the same
one every time, for everybody, forever.

The nearest thing to a recruitment route is a refusal:
`life-paths2.ts:327` turns away any non-personal path with "This opportunity
requires recruitment by the active campaign." Nothing on the campaign side
answers it.

## Why this is not fixed here

The repair is not a line. It is a recruitment route, and building one settles
questions nobody has answered: who a campaign may recruit, when in the campaign
it can happen, whether it costs money or a player's time, whether a recruit can
refuse, and which surface a player does it on. That is a feature with
consequential semantics, and the rule in this repository is that those get an
explicit decision and independent review rather than an engineer's default.

What would make it fixable in one sitting is small: a decision on those five
questions. The plumbing — a work relationship, an id appended to the campaign
record — is already the shape the filing route uses.

## What I would check the moment a route exists

The integrity check at `campaign-integrity.ts:417` rejects a strategy whose
proposer is not on the staff list. With an empty list that is currently
unreachable rather than lax. The first campaign with real staff is the first
time that branch is exercised in play, so it wants a walk rather than a unit
test on the day it lands.
