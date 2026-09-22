# People and life, overnight 2026-09-21 into 2026-09-22

Written for the morning report. PR #280 is **merged**: all of it is on `main`
at `d4dca882`. Findings that need a decision are marked **OPEN**; everything
else is settled and built.

## What changed for a player

Personality is now packs of data rather than five traits written into the code,
so a sixth can be added without touching TypeScript. Your own character has
their own temperament, said by you rather than seeded, and unsaid until you say
it. People who have actually dealt with somebody can read them; strangers say
nothing rather than guessing at a middle. And letting a day go by is no longer
recorded as you turning something down, which three different surfaces were
getting wrong.

---

## 0. OPEN, and the biggest thing here: the game answers asks addressed to you

**Not fixed. This is a decision, not a defect to be quietly patched.**

`npcContactAnswer` in `src/simulation/people-contact.ts` never checks whether
the person being asked is the controlled character. So when somebody reaches
out to you, the simulation decides your answer — accept, decline or counter —
before you are ever shown the ask. Instrumented over several rounds of ordinary
play, the count of asks still awaiting the player's own answer was zero in every
round: not "rarely reaches you", never.

This sits directly on top of the thing ranked first: relationships, private
goals and the people around you. An invitation answered on your behalf is the
game playing that part of your life for you.

**What the fix would change about play.** The answer path would have to split:
an ask addressed to the played character stops at the calendar as something
waiting, and the player answers it the way they answer any other standing thing
— including by letting it lapse, which since this branch is recorded as a lapse
rather than as a refusal. Asks between two other people keep deciding
themselves exactly as they do now. The cost is that a player who ignores their
messages accumulates unanswered asks, which is either realistic or annoying
depending on taste, and that is the judgement somebody has to make rather than
me.

It was left alone deliberately. It changes how the game behaves in a way a
player will feel, and the choice belongs to the owner.

---

## 1. The one thing a player will notice: letting a day go by is not turning something down

**Fixed.** `docs/release/changes/lapse-is-not-a-refusal.md` carries the
player-facing wording.

Optional things on the calendar that the clock simply ran past were being
recorded as though the player had declined them, with their name on the
decision — including holds they were never shown and had no control for. The
day-passing path called the decline writer to get past them, which wrote
`Decline <title>` as the player's own choice.

Three systems then read those records as refusals:

- an organizer followed up to say there was no problem about a meeting the
  player had supposedly turned down,
- a chapter invitation showed as declined when nobody had put the question to
  them,
- a campaign activity was counted as refused for the same reason.

None of it had happened.

### What it does now

Two acts, two records. A refusal carries a `chosen` tag and is only ever
written by an answer the player gives. Time passing writes
`life.scheduled-activity-lapsed` with no choice on it, because none was made.

### Why old saves read as neither

Every `life.scheduled-activity-declined` record written before the split could
have come from either path, and there is no way to tell which. So they read as
`unknown`: they keep loading, they are not reinterpreted, and they are not
evidence of a refusal. A consumer that needs a refusal treats `unknown` as not
one.

The alternative was to guess — to decide today what the player did months ago
in game time. The game does not get to do that. The cost is that some genuine
old refusals now read as nothing; the benefit is that no invented refusal reads
as real.

### The two ways a player found this

Both are closed in the same change. The day went on saying "The agenda is
posted. Decide whether to attend." twelve weeks after the evening had gone by,
with no control anywhere for deciding. And nothing acknowledged an answer once
given. A pending thing now carries what became of it, the day says so in its
own words, and what is over leaves "what is waiting on you".

---

## 2. The trait framework, and the fact that nothing in play ever called it

**Built.** `docs/systems/traits.md` carries the design.

The owner asked for the trait system itself rather than the five hardwired
traits — "built the connectors for later traits and effects etc" — and for it
to be modder-friendly in the way RimWorld and The Sims are.

A trait is now a row in a pack, not a tuple in the codebase. An effect is a row
saying which trait argues for which option of which decision. A decision
publishes its own id, scope and option keys, so "what can a pack affect" is an
enumerable list rather than a wiki page. Every reference resolves once at load
against declarations that exist, and a row that resolves to nothing is rejected
by name with a reason rather than silently doing nothing at play time.

The five existing traits are the first pack, `people-mind-v1`, built from the
same constants they always were. The pack name is the version string every
record already carries, so no save is touched and nothing is converted.

### The part worth putting in front of him

**Until tonight, nothing in shipped play had ever changed anybody's
temperament.** `recordTraitChange` existed, had a contract, had tests — and had
no production caller at all. The machinery was complete and inert. Section 4
below is the first caller.

The same was true of the played character: the mind store refuses any record for
the controlled person whose provenance is not `player-choice`, and no path
wrote one, so the player came back empty. That emptiness was a side effect
rather than a decision, and the guard was never the obstacle.

### Resistance

Every character can change, with varying resistance, and nothing anywhere
stores how stubborn anybody is. Resistance is read from the person's own chain
of records — how long the current value has stood, how often it has already
moved — together with what the declaring pack says about how movable that kind
of trait is at all.

Two people who have lived differently therefore resist differently, from
records that already exist, and the reason can always be said out loud: _she
has been like this for as long as anyone has known her._ A hidden stubbornness
number could not do that, which is why it was rejected.

A failed attempt is written down rather than discarded, and counts as pressure
on the next one. One argument does not change somebody; the same argument for
the tenth time does. A system that dropped its failures would have ten
independent coin flips instead of a life.

### The player's own traits

`recordPlayerTraitChoice` writes with `player-choice` provenance and refuses
anybody but the controlled person. A lean row may declare it reads the traits
of the person being _decided about_ rather than the person deciding, which is
how a character is portrayed to other people — somebody weighing an ask reads
whether the person asking keeps the plans they make.

A player who never says who they are is simply somebody nobody has an
impression of. `playerTemperament` returns `said` and `unsaid` rather than a
value per trait, so a screen can say which parts they have never decided
instead of showing a seeded value they never picked. Nothing is blocked and
nothing is invented. This is "ignore it and say so".

---

## 3. What is deferred to research rather than guessed at

Three questions are filed in the research queue as records under
`docs/research/requests/`, and appear in the rendered `OPEN-QUESTIONS.md`:

- `personality-change-pace` (**P1**) — how much has to happen before a
  disposition shifts, how much one formative event should do against how much
  accumulated repetition, and whether prior change makes the next change easier
  or harder. **The numbers currently shipped are authored placeholders and say
  so in the file.** No test in this repository can catch a wrong answer here:
  the suite passes identically whether characters reinvent themselves every few
  months or never change at all.
- `player-temperament-source` (**P2**) — whether setup answers count as
  choosing a disposition, or whether temperament should come only from choices
  in play. Built as the second; an answer of "both" is additive.
- `ordinary-life-trait-set` (**P2**) — which traits an ordinary life needs and
  how many before they stop being distinguishable. Changing the set is an edit
  to one file and touches no code.

---

## 4. The first occasions in play that change somebody

**Built**, in `src/simulation/people-trait-occasions.ts`, called from the
ordinary-life scene refresh.

The standard each occasion has to meet: **a player must be able to point at the
thing that happened.** A trait that moves for a reason nobody can find is a
number drifting, not a person changing. So each occasion is weighed once per
specific event and cites that event, which means the chain of records afterwards
names the particular evenings rather than reporting that sociability moved.

### Occasion one: an ask that came to nothing

Somebody reaches out, and it is either turned down or never answered. Chosen
because the world already writes every part of it — who asked, who was asked,
the day it was for, and what became of it — so nothing had to be invented to
make it fire. Repeated, it makes somebody reach out less.

### Occasion two: a plan made and not kept

Not yet built. It is only possible because of the lapse fix in section 1: a
refusal is now distinguishable from time running out, so reliability can move
on things somebody actually declined after agreeing, without counting the ones
nobody ever answered.

### Why these two rather than anything more dramatic

Both are ordinary life rather than campaign or legislature, both read events the
world already writes, neither needs a new producer, and both are traceable. A
player can point at the evening. That is the whole difference between a person
changing and a number drifting.

### **OPEN** — a finding while wiring this: the game answers for the player

While testing occasion one it turned out that asks made _to the player_ are
answered automatically by the scheduled answer handler
(`contactAnswerTransitionHandler` → `npcContactAnswer`), which does not check
whether the person being asked is the controlled character.

So an invitation to the player can be accepted or declined on their behalf
without them ever seeing it. This is why "an ask nobody answers" almost never
occurs in practice, and it is the reason occasion one was widened to count
asks that were turned down as well.

This was not changed tonight. Fixing it would visibly change play — the player
would start receiving asks they have to answer — and that is his call, not a
thing to land unannounced on a merge deadline. **It is the single most
interesting thing found tonight that has not been acted on.**

### A real bug this exposed

Building the consumer side turned up a genuine defect in the portrayal work
from earlier the same night. A decision consideration may only cite a mind
record belonging to the person deciding — the store enforces it, and the rule is
right: somebody's reasoning cites their own mind, not a private note about
another person they could not possibly have read.

A row about the subject was citing the subject's own record, which threw when a
scheduled answer resolved. It now cites the dealings the two people have had,
which is how one person comes to have an impression of another. Somebody with
no recorded history with this person has no grounds, and the row contributes
nothing rather than borrowing a reason it cannot support. **That gate is the
feature**: being read by people who know you is not the same as being read by
strangers.

---

## 5. The day-advance crash: could not reproduce

**Negative result, written down so nobody re-investigates it from scratch.**

A reading of document 61B reported a scheduling path that would throw on the
next day advance. Advancing the day is the core loop, so it was checked before
anything else.

**Method.** Isolated git worktree at main `445441a5`. Lives created across six
real places — `kentucky`, `0664000` (Sacramento), `5103648` (Austin),
`2815420` (Columbus), `0656870` (Phoenix), `1304000` (Atlanta) — at ages 24, 31,
38 and 45, in both household kinds. Each life advanced 220 days in mixed step
sizes, one day then three then seven, twenty rounds each, so every calendar hold
boundary is crossed at several granularities.

**Result.** 24 lives, 0 throws.

**What this does and does not establish.** It is one path through one surface
and it is not proof of absence. It does establish that the ordinary day-advance
loop does not throw across a reasonable spread of places, ages, households and
step sizes. 61B was written roughly three weeks ago against a much older build
and is overtaken in other respects — it claims no party model exists, which is
wrong — so the likeliest explanation is that it describes code that no longer
exists.

**If it resurfaces**, what is needed is the specific call, path or error text.
Blind probing is exhausted. And the fix would almost certainly be to fail soft
with a stated reason rather than to throw, per the standing rule that unknown
content is skipped with a reason, never refused whole and never silent.

---

## 6. A break on main that blocks every branch

Commit `72261fe6` ("Let the office briefing read its own fact packet") reworded
a computed prose site in `conversation-subjects.ts` without re-minting its
anchor, leaving `describeBriefing-0005` recording text that no longer appears
and the new text unanchored.

That is a hard error rather than a warning: `corpus:prose` refuses to build. Any
branch that adds a file under `src/` or `scripts/` hits it the moment it
regenerates, which is every branch in the merge train. Three lanes hit it
independently and all three made the same narrowest repair — 1 reworded, 0
minted, 0 retired, same id, ledger unmoved. The audit lane owns the commit and
its repair is #301.

Worth knowing for the future: this class of break is invisible to whoever causes
it, because it only fires on the next regeneration, which is usually somebody
else's branch.

## 7. The art requests: two filed, one held

`interface-graphic` reached `main` with #281, so the class this lane was
waiting for now exists. Two requests are filed in
`art/requests/asset-requests.json`, each with its
`unaffected-still-required` verdict in
`art/requests/preserved-asset-reconciliation.json`, which
`tests/asset-readiness.test.ts` requires of every open request.

- **`ui-ordinary-day-page-furniture`** — the day a player actually lives in.
  It is the most-read surface in the game and every one of the twenty-eight
  stylesheets under `src/player/` contains zero `url()` declarations,
  `player.css` and `shell.css` included, which between them are 10,558 lines.
  There is no artwork on it at all.
- **`ui-standing-thing-state-marks`** — three marks for the three ways a
  standing thing ends. Section 1 made a lapse genuinely different from a
  refusal in the simulation, and the interface still draws both, and a thing
  still waiting, with the same 4px grey dot at `src/player/player.css:4992`.
  A player who cannot tell them apart reads every expired hold as a decision
  they made.

Both forbid lettering in the artwork, because every word on those surfaces —
names, dates, the things themselves — is generated per world, and a word
painted into the art would be a fact the game never recorded.

**The third is held, and this is the interesting one.** A per-pole treatment
for traits was the obvious third request: something that reads as "far toward
this end" and, separately, as "nothing recorded". It is not filed because it
has no player-facing consumer. No `.tsx` under `src/player/` reads a trait at
all; the only thing that renders tendencies is `src/ui/MindProfile.tsx`, which
is a developer view. Asking for art for a screen that does not exist is asking
somebody to draw for a wish. The request should be filed the day a surface
reads traits, and it should be a _pole_ treatment rather than one drawing per
trait, because a pack may add a sixth trait and anything drawn per-trait is
wrong the moment somebody does.

---

## 8. Two process findings that cost other lanes rounds

**Byte-identity is the wrong test for prose anchors.** The advice circulating
last night was to confirm `computed-anchors.json` and `metrics-baseline.json`
come back byte-identical to main's after regenerating, so that nobody's
re-anchoring is silently reverted. That gives a false alarm on every branch
that legitimately retires or mints an anchor — and the obvious response to a
false alarm is to revert real work.

The right test is the set difference in both directions, with every entry
named. On this branch: the only anchors `main` had that this tree lacked were
`RETURN_SUMMARY-0017` and `RETURN_SUMMARY-0029`, the two scenes this work
removes, both burned in `computed-anchor-ledger.json` rather than deleted; and
the only one this tree added was `unavailableReason-0005`, minted for new
text. Every difference accounted for, nothing of anybody else's reverted.

**Tracked generated files are costing about one conflict per merge.**
`docs/prose-inventory/coverage-report.md` conflicted on every one of the six
merges of `main` this lane did between 06:00 and 07:05Z.
`docs/dehardwire/census.json` conflicted on three of them, and
`docs/prose-inventory/README.md` on five. None of these is hand-written; each
is regenerated by tooling the repository already owns, and the resolution is
always the same — take either side, run the generator, commit. With four lanes
pushing it is a tax paid per merge, and on a night with a deadline it was the
single largest consumer of merge time here.

The fix is to stop tracking them, as three of the four prose artifacts already
are (`.gitignore` lines 37 to 40), or to regenerate them in CI rather than in
the tree. Not a job for tonight. One caution that comes with the existing
gitignoring: because those three are untracked, `git checkout` never touches
them, so in a clone that has switched branches `corpus:prose -- check` can be
checking the previous branch's leftover files. It fails loudly in one direction
and passes silently in the other. Regenerate before trusting a prose verdict in
a clone that has changed branches.
