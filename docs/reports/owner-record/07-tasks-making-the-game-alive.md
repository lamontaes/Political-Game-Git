# Tasks — making the game alive

Distilled 2026-09-22 from the owner record, the 63-page audit and ALIVE44, on
his instruction: _"take the liberty and distill these findings to tasks. start
making the game alive. that was referenced in a doc i sent so look at that."_

Ordered by **his own ranking**, overnight [81], not by convenience. Each task
says what it is in a sentence a player would recognize, which lane takes it,
what it depends on, and whether it can start now. Where his words define the
task they are quoted.

Research is not in here. Under the rule he set on 2026-09-22, a judgment about
how the world should feel goes to ChatGPT as a brief, not to a lane as a task.

---

## Correction, 2026-09-22 04:50

Four things this project has been calling "never started" are built and
reachable on `origin/main` `273fd2b8`, measured rather than assumed: party
evolution (foundings, splits, mergers, platform drift), choosing who to
continue as at death, the in-game Guide, and the news front page. P1, C1, U5
and U4 below are rewritten accordingly, and B6 notes that `byCaucus` is already
computed for every chamber and read by no interface.

Genuinely untouched: the fifty state-capitol scenes, derived facial
expressions, and the Congress faction view — and that last one is a screen over
data that exists, not a system.

The pattern is worth naming on its own: more than once tonight the gap has
turned out to be between what the game does and what he can find, not between
what he asked for and what exists. UI sits above his priority list for a
reason.

---

## Where "alive" is defined

**ALIVE44**, Drive `1wDpqx3b9a_O0iqLgxm3YREJNN469pC4LPyJ2eJWD_jA`, section
**ACCEPTANCE STANDARD FOR 'THE WORLD FEELS ALIVE'**. It is a test, not a
feature list, and it opens by ruling out the metric everyone reaches for:

> "Do not use number of event types or headlines as the success metric. A
> representative ordinary month should prove at least:
>
> • some institutions/people change without player initiation;
> • some intervals are quiet;
> • a background event can later become personally actionable because the
> player's role/relationship changed;
> • at least one NPC initiates contact for a recorded reason;
> • the same matter remains coherent across News, people, Calendar/commitments,
> conversation and official Work;
> • an event can fail, be declined, be corrected or matter very little without
> the simulation forcing drama;
> • severe outcomes are possible but not quota-driven;
> • save/reopen preserves identities, exposed history, beliefs/claims and
> consequences;
> • progressive materialization enriches relevant people without rewriting
> already-exposed facts."

And the same document on pacing:

> "No fixed quota of scandals, bills or crises. Ordinary weeks may contain
> mostly routine decisions. A living world comes from overlapping low-, medium-
> and high-salience institutional processes with real clocks, not perpetual
> catastrophe."

**Every task below is scored against those nine lines.** A task that does not
move one of them is not an aliveness task, whatever else it is worth.

**One thing to note about ALIVE44's own wave order.** It proposes ALIVE44A →
ECON45 → POL46 → CRISIS47 → CLAIM48, and marks that list _"EARLIER PROPOSAL,
SUBJECT TO THE PRIORITIES ABOVE; NOT DISPATCH"_. It is not wrong, but it does
not contain his 1A at all: relationships, personality, private goals and
long-life memory are not one of the five waves. Where the two disagree, his
ranking governs, because it is later and it is his.

---

# 1A · Relationships, personality, private goals, long-life memory

> "Relationships, personality, private goals, and long life memory. Actually,
> this is number one. It's 1A and 1B. This is 1A." — overnight [81]

**Already built, do not re-specify.** On `origin/claude/people-and-life-4qpuwb`,
25 commits ahead of main: a trait is loaded data rather than a compiled tuple
(`7af87594`); the byte-identical allow-list became a pack-identity check, which
was the hard blocker; a decision publishes its own option keys and a trait
declares what it argues for (`aeaa88d8`); the person card no longer shows a
temperament the game never wrote down (`283c1bef`). That is the seam. The tasks
below are what is left on top of it.

### A1 · A person can be changed by what happens to them, and resisting is itself a fact

**Player-recognizable:** someone who has been a certain way for nine years is
not moved by one afternoon, and the time you failed to move them is remembered.
**Lane:** people-and-life. **Depends on:** the trait pack seam (built).
**Status, measured 2026-09-22 on `origin/claude/people-and-life-4qpuwb`
`6f26b575`: BUILT.** `attemptTraitChange` in `src/simulation/people-trait-change.ts`
is the mechanism, with `traitChangePressure` reading resistance from the
person's own record chain and failed attempts recorded so pressure accumulates.
Covered by `trait-resistance.test.ts`. What remains is A2.
**His words, 2026-09-22 03:36:** _"every character should be able to change with
varying levels of resistance."_
**The shape, from the same document:** resistance is read from the person's own
record chain — how long the value has stood, how often it has already moved,
how movable the pack says the trait is — never a hidden stubbornness number.
`recordTraitChange` gains a force; when force loses, **the attempt is recorded
rather than discarded**.
**Alive criteria:** _institutions/people change without player initiation_;
_an event can fail, be declined, be corrected or matter very little_.

### A2 · Nobody's temperament has ever actually moved

**Player-recognizable:** people are the same at sixty as at eighteen.
**Lane:** people-and-life. **Depends on:** A1 (built). **Start now:** yes —
this is the live 1A gap.
**Measured on `origin/claude/people-and-life-4qpuwb` `6f26b575`:**
`attemptTraitChange` is referenced in exactly three places — its own
definition, `trait-resistance.test.ts`, and `docs/systems/traits.md`. Nothing
in play calls it. The mechanism is built and the supply is not, which is this
project's recurring failure shape rather than a new one.
The task is a producer: at least one ordinary life event that argues for a
change and either moves somebody or records that it did not.
**Alive criteria:** _change without player initiation_; _save/reopen preserves
consequences_.

### A3 · The player has a temperament other people can read

**Player-recognizable:** other characters form a view of what you are like.
**Lane:** people-and-life. **Depends on:** the pack seam. **Start now:** yes.
**His words, 2026-09-22 03:36:** _"obviously you as a character need your own.
it's how you are portayed to people."_
**Measured on `origin/claude/people-and-life-4qpuwb` `6f26b575`:** the writer
is built. `recordPlayerTraitChoice` in `src/simulation/people-player-traits.ts`
records with `player-choice` provenance and `playerTemperament` reads it back,
with no exception added to the `mind.ts` wall. But its only callers are
`player-traits.test.ts`, so no choice a player makes has ever written one.
**What is left:** the same gap as A2 — a call site in play, and consumers that
read the player's temperament when other people size the player up. The
player's own trait never argues for the player's own option.
**Alive criteria:** _the same matter remains coherent across people,
conversation and Work_.

### A4 · Someone gets in touch with you first — WITHDRAWN, already met

**I got this wrong and the people-and-life lane caught it.** I read
`const contactAvailable = false;` at `src/presentation/person-contact.ts:81`
as a producer switched off. It is not. It is the player's **outbound** Contact
button, and the reason sitting beside it is true: _"No phone, mail or message
channel exists in this life yet."_ Flipping it would claim a producer that does
not exist, which is the failure the Constitution names directly.

**The criterion is already met.** `produceReachingOut`
(`src/simulation/people-contact.ts`) is wired into play through
`contextual-scene-producers.ts:530` on `origin/main` `273fd2b8` and runs while
time passes, whether or not the player ever opens that person's page. NPCs do
initiate contact for a recorded reason. The lane added test coverage for it
tonight, including a negative control.

**Nothing to do here.** An outbound channel is a separate feature and is not an
aliveness task; nobody should plan work from this item.

### A5 · Your life reads back as a story, not a log

**Player-recognizable:** the journal says you ran for governor and what it cost
you, instead of listing every click.
**Lane:** prose / UI. **Depends on:** nothing. **Start now:** yes.
**His words, overnight [20]:** _"this is my journal. This doesn't really make
sense. It needs to be more in a narrative way... It's literally just a
word-for-word account of what I did in 2026. It should say, oh, you know, you
ran for governor, you ended up raising this much. You know, maybe this could
affect your legacy or something like that... Like a chronicle sorts of sorts."_
**Constraint:** the renderer composes from recorded history and invents nothing
absent from its packet. This is selection and voice, not new facts.
**Alive criterion:** _save/reopen preserves exposed history_.

### A6 · Leisure preference stops standing in for personality

**Player-recognizable:** whether someone wants company is a different question
from what they want to do.
**Lane:** people-and-life. **Depends on:** the pack seam. **Start now:** yes.
**Source:** the personality catalog's clearest concrete finding — the existing
three-way switch conflates _what the activity is_ with _who is present_, and
should stop carrying personality's weight now that traits are a real seam.

### A7 · Private aims actually lead somewhere

**Player-recognizable:** deciding you want something changes what the world
offers you.
**Lane:** people-and-life. **Depends on:** nothing. **Start now:** yes, as a
check first.
`PersonalGoalsPanel` exists and shows active aims with progress and currently
offered opportunities (audit PEOPLE-007), and correctly says so when the world
offers no route. The task is to establish whether any producer reads an aim and
offers something because of it, and to close that loop if none does. If the
check finds the loop already closed, this is done and costs an hour.
**Alive criterion:** _a background event can later become personally actionable
because the player's role/relationship changed_.

### A8 · Connectors so personality can reach dialogue later

**Player-recognizable:** nothing yet, deliberately.
**Lane:** people-and-life. **Depends on:** A1–A3. **Start now:** yes, as
declaration only.
**His words, 2026-09-22 03:37:** _"also build the 'blocks' to where personality
and stuff can dictate dialogue choices. notihng material now but that is
something i eventually want to add."_
**The shape:** dialogue decision sites declare their identity, scope and option
keys the way the eleven existing decisions now do. No lean is authored against
them yet. He said "nothing material now" and meant it.

---

# 1B · A genuinely seated world

> "A genuinely seated world. Yes, this is, like... out of this list, this is
> number one, I think." — overnight [81]

### B1 · The country has people in its offices

**Player-recognizable:** Congress is not empty.
**Lane:** nationwide government. **Depends on:** nothing. **Start now:** yes.
ChatGPT's finding, overnight [21]: _"House — All 435 seats have no recorded
holder. Senate — 33 seats have no recorded holder, alongside a separately
identified vacant seat."_ And the distinction that must survive the fix:
_"'No recorded holder' is not the same as 'vacant.'"_
**Alive criterion:** _progressive materialization enriches relevant people
without rewriting already-exposed facts_.

### B2 · An unresearched jurisdiction is playable

**Player-recognizable:** a lifelong resident can stand for their own
legislature.
**Lane:** nationwide government. **Depends on:** nothing. **Start now:** yes.
Three states rather than two — sourced, generated from a realistic **national**
range, genuinely unknown — with the middle one missing today. The legislation
for that jurisdiction is drawn from the same range. Nothing is labeled on
screen. Full chain and quotes in `01`, section A4.

### B3 · Being elected governor gives you something to do

**Player-recognizable:** you win, you take office, the desk has work on it.
**Lane:** nationwide government. **Depends on:** B2. **Start now:** yes.
**His words, overnight [20]:** _"So now it should have, like, some transition.
You know, I give a victory speech and now I start the transition."_ and _"it's 2027. I don't have anything I can do as an executive. This is what I mean. This
state stuff should have been being put in this entire time. Like all 50 states.
That keeps being bottlenecked."_
**The actual bottleneck**, overnight [66] and audit JUR-002: fifty governor
_identities_ exist; **five** executive-authority packs do. The ordinary
executive-entry function returns without creating the term when the pack is
absent. This is the third layer, not the first, and B2's generated profile is
what unblocks it at scale.

### B4 · Time does not lurch

**Player-recognizable:** you advance a day and it is the next day.
**Lane:** playtesting, then whoever owns the clock. **Depends on:** nothing.
**Start now:** yes.
`QUIET_ADULT_STEPS: readonly number[] = [31, 47, 78, 124]` at
`src/presentation/life-story.ts:803` on `origin/main` `273fd2b8`, selected by
`total % length`. This produced his _"Oh, it's April 11th, 2028. Whoa! What the
hell happened? How did we go to April?"_ in overnight [20].
**Alive criterion:** _some intervals are quiet_ — quiet is not the same as
skipped without saying so.

### B5 · The president does not live in your town

**Player-recognizable:** the president lives in Washington.
**Lane:** nationwide government. **Depends on:** nothing.
**His words, overnight [17]:** _"Owen Watson. He's a Democrat in office since
2025, lives in Arlington, Washington. No, he doesn't. He lives in Washington,
D.C. He lives on Pennsylvania Avenue."_ Named at `opening-officeholders.ts`,
which assigns `homeJurisdictionId: player.homeJurisdictionId` to both the
president and the chief justice, with `locationJurisdictionId: null` on their
organizations. Re-verify at the current head before fixing.

### B6 · You can see the shape of the government

**Player-recognizable:** a screen that shows Congress, its coalitions, and your
legislature.
**Lane:** nationwide government + UI. **Depends on:** B1. **Start now:** yes.
**His words, overnight [20]:** _"I should have a big thing of Congress and my
state legislature. I want to see, you know, different coalitions of Congress.
It doesn't have to be insider stuff, but what you can tell... I know the Squad...
You know the Tea Party members. You know the Libertarian people. And, you know,
Independents, like Bernie Sanders, who caucuses with liberal Democrats. I
should be able to, you know, glean that much... it should go politics and then
some kind of, like, view total government screen... state, federal, local, and
then you should be able to choose legislative, judicial, executive."_
**Half of it is already computed.** `congress.ts:340-374` builds `byCaucus`
for every chamber and publishes it on the living-world contract; on
`origin/main` `273fd2b8` the only readers are two test files. No interface
reads it. This is one screen, not a system.
**Constraint:** what the player can glean, not simulator truth. Audit CAMP-002
warns specifically against leaking `canonicalSupportBasisPoints`.

---

# Above the list · UI and prose

> "obviously the UI and shit's number one in pros" — overnight [81]

### U1 · Things he has asked to have removed, removed

**Lane:** UI. **Start now:** yes. Each of these he reported at least twice and
each survived the last playtest (overnight [17] and [20]): the shading behind
the title; the "uncommitted" build label at the top; the "V.2.0" label; the
black box behind the creator; the back button wired to custom start; the
top-bar element (_"Remember, this up here needs to be completely removed.
There's no reason this should be here."_); Taxes and public receipts as a
player-facing form (_"I shouldn't be entering this kind of information"_);
Transit service as its own menu entry.

### U2 · The creator asks in the right order

**Lane:** UI. **Start now:** yes.
**His words, overnight [17]:** _"It should have you—it should do gender first:
gender, name, birthday, age. That's how it should go. And there should be some
thing somewhere that tells you that you're starting on January... 2026... And
so you should put in your birth month, day, and year, and then it should say
you will start the game at this years old."_ Plus: hair must not follow the
face, and skin tone is its own control — _"These should all be individual."_

### U3 · No developer language in front of the player

**Lane:** UI + hardcoded-content audit. **Start now:** yes.
**His words, merge263 [2]:** _"all that developer view shit. I don't like that.
Like, your character does not know this, or whatever... I don't want that."_ And
2026-09-22 00:36: _"there should be NO references to sources in the game."_
**The rule that must not be broken in response**, merge263 [3]: _"DO NOT remove
the underlying knowledge, authority, privacy or evidence logic. That logic
remains authoritative and should normally operate silently."_ Live instances:
the Alaska source-acquisition-date explanation on the office screen (overnight
[74]) and raw ISO dates in study deadlines, judicial history and constitutional
history (audit PORK-DATE2).

### U4 · The news looks like news

**Lane:** UI + art bench. **Depends on:** an asset. **Start now:** the surface,
yes; the asset is an art request.
**His words, overnight [20]:** _"The Civic Ledger. No, this doesn't... I said I
want it to, like, literally visually look like a newspaper or a magazine... And
then it needs to have, you know, scripts. So... there needs to be a bunch of
different titles, kind of like Apple News."_
**What already ships**, measured on `origin/main` `273fd2b8`:
`news-front-page.ts`, `NewsDesk.tsx` and `World39News.tsx`. The front page
exists; his complaint is that it does not look like one. This is presentation,
not a missing surface.
**Constraint**, audit PRESS-003: a generated background must not permanently
paint a fictional poll result or official quote into the scene. The frame is
art; the headline, date, name and number are runtime content.

### U5 · You can look something up without leaving the game

**Lane:** UI + prose. **Depends on:** nothing. **Start now:** yes.
**His words, overnight [95]:** _"I'd like for the inline thing to now be made...
go ahead and start the kind of encyclopedia-ish. Not quite. I don't want it to
lead to, like, actual sources, but, like, I want it to be explained in the game,
just using, like, public source things... I want it to read as a part of the
game... And I think the goal is to Shift-click to mark something as learned."_
**Correction, measured on `origin/main` `273fd2b8`:** a Guide already ships —
`GuideWorkspace.tsx`, `GuideTerm.tsx`, `guide-terms.ts` with 29 terms, and
`civic-glossary.ts`. The task is to establish what it covers, whether
Shift-click-to-learn is wired, and whether he can reach it from where he reads
the term, rather than to start an encyclopedia.

### U6 · It stops looking like a web page

**Lane:** UI + art bench. **Start now:** partly — this is a theme decision plus
assets, and the theme is his.
**His words, overnight [20]:** _"This stuff needs to start having, like, visual
assets. I'm tired of the HTML, CSS look of this game. I'm absolutely sick of
it."_ And modgen [146]: _"I dont really want any of those ui redesigns. im
talking design, color, etc. a theme."_
**This one needs him**, and it is a decision only he can make, so it is the one
item here that should be put to him directly rather than researched or built.

---

# 8–9 out of 10 · Governing and legislative

> "The governing and legislative, I would like to go to, like, an eight or nine
> out of ten" — overnight [81]

### G1 · A bill reaches a player

**Lane:** modular legislation. **Depends on:** nothing. **Start now:** yes.
PR #282's own disclosure: "No shipped surface consumes bundles yet." Audit
LAW-001: _"These are types of proposals the compiler can form, not 43 enacted
statutes."_ The next unit of work is a consumer, not a forty-fourth variant.

### G2 · One measure traced all the way through

**Lane:** modular legislation + governing. **Depends on:** G1. **Start now:**
yes.
Audit LAW-007 names the chain: introduction, amendment, chamber action,
executive action, effective date, authority reference, appropriation,
administration, service or payment, and knowledge. The staged transit variant
(LAW-006) is the one route with real arithmetic behind it and is the obvious
first subject.
**Alive criterion:** _the same matter remains coherent across News, people,
Calendar/commitments, conversation and official Work_.

### G3 · Negotiation that is not arithmetic

**Lane:** governing. **Depends on:** G1. **Start now:** yes.
**His words, overnight [87]:** _"it shouldn't be a math problem... Or if it is,
it's one that makes sense in the world."_ And vision invariant 15: a member may
support a bill only if a provision changes; another needs political cover;
another refuses on a hard belief.
**The specific defect**, overnight [86]: _"The function cannot express 'they
heard you clearly, understood your position, and disliked it.'"_ Its direct
response can reach zero but never goes negative. Note this is **not** the
campaign outcome curve, which he tabled — that hold stands.

### G4 · Staff competence comes from evidence, not a hash

**Lane:** governing. **Start now:** yes.
Overnight [92]: `staffAssessment(personId)` selects background, strength,
caution and an internal rating from fixed lists keyed on the person's ID. Audit
GOV-003 says the real seams — staff evidence, office staffing, committee
assignment, office continuity, outside-mandate payment — now exist, so the
substitute is no longer needed.

---

# High · Map content; health, death, succession, disasters, crisis

### M1 · Approved regional art appears

**Lane:** art bench and regional scenes. **Start now:** yes.
Five approved scenes; `WorldOrientationPanel.tsx`, named by all twenty-three
requests, paints no plate. Audit DESK-001: _"A file bundled in a snapshot is not
proof it appeared."_

### C1 · The succession choice

**Lane:** people-and-life. **Depends on:** nothing. **Start now:** yes.
**His words, overnight [87]:** _"it first prompts you to do your closely related
people: a protege, your vice president... your daughter. That's a cool decision.
Do you be your vice president? Do you be the upcoming person? Or do you be a
child? That's a cool decision to make when you die. It keeps you invested in an
ever-changing world."_ And overnight [85]: _"once the character's dead, it's
dead. I'm thinking of Crusader Kings."_
**Correction, measured on `origin/main` `273fd2b8`:** the choice exists.
`LifeContinuationPanel.tsx` is mounted in `PlayerGame.tsx`,
`life-continuation-shell.ts` carries the refusal line _"Nobody is being played,
so nothing can be done in the world. Choose who to continue as, or keep
browsing."_, and `tests/e2e/ui36-successor.spec.ts` exercises it. Birth,
adoption, control transfer and continuation writers exist (audit PEOPLE-008).
The task is therefore to play it and check what the choice actually offers
against his words — a protege, a vice president, a child, ranked by closeness —
rather than to build it.
**Alive criterion:** _save/reopen preserves identities, exposed history,
beliefs/claims and consequences_.

### C2 · Mortality cannot divide by zero

**Lane:** crisis. **Start now:** yes, as a check.
Overnight [84]: the project RNG can return zero, and `-log(0)` is infinity.
Re-verify at the current head before changing anything.

---

# Core, must ship · Party evolution and multi-generation play

> "Party evolution should be included too. That seems like something that
> should be included in the seated generation, and multi-generation play.
> That's a core part of something that needs to be shipped." — overnight [81]

### P1 · Party evolution is built — the question is whether he has ever seen it

**Lane:** UI and surfacing first; unassigned for the rest. **Depends on:** B1.
**Start now:** yes, as a playtest of what already ships.

**Correction, measured 2026-09-22 on `origin/main` `273fd2b8`.** I had this in
his must-ship column as untouched. It is not. `src/simulation/living-world/party-evolution.ts`
is 1,969 lines and its own header states the rules: _"a founding needs a
founder, a consenting co-organizer and a public organizing decision; a split
needs a disputed decision and named members who elect to leave; a merger needs
every side's authorized leader"_ and _"No quota, no forced split, no two-party
rebalancing."_ Platform records supersede one another
(`supersedesPlatformId`), so drift is recorded rather than overwritten. It is
imported by `campaigns.ts`, `world-setup/integrity.ts` and the living-world
index, and `PartyChapterSurface.tsx` and `PartyInitiativesPanel.tsx` are both
mounted in `PlayerGame.tsx`.

**So the task changed shape.** He said this was _"a core part of something that
needs to be shipped"_, and the honest report is not that we have not started —
it is that it is built and he may never have found it. That is a surfacing
problem, and UI sits above the priority list for him. The work is: play the
party surfaces as a player, establish what a founding, a split and a platform
change actually look like on screen, and fix the route to them. Vision
invariant 13's distinct layers — voter coalition, public perception, activists,
donors, geographic support — are the part to re-measure against the code before
anyone specifies more of them.

---

# Low · Ordinary life

> "Ordinary life, that's still pretty low for me. I'm not really worried about
> that right now." — overnight [81]

Nothing is scheduled here. One item is worth recording because it is a defect
rather than a feature: audit PEOPLE-006 flags the repeated household premise —
groceries, a clothing fitting, a cupboard-hinge repair — as _"more specific than
'ordinary life' and may be an unwanted recurring chore template"_, and he has
not been asked about it. That is a question for ChatGPT under the rule, not a
task.

---

## What is deliberately not here

- **Anything that is really research.** Under his 2026-09-22 rule it goes to
  ChatGPT as a brief. The trait count is the worked example.
- **The campaign outcome curve.** He tabled it. Display bugs in it are still
  fixed; the curve is not retuned.
- **Repairing the current cast of modular people's heads and collars.** He said
  he is not attached to them (overnight [114]); making generation general is the
  task, and it belongs to the art lane's existing scope rather than to this
  list.
- **A theme for the UI.** U6 above is the one item that needs him rather than a
  lane.

---

## Appendix · 61B, read 2026-09-22

`61B_CLAUDE_ORIGINAL_VISION_AND_DYNAMIC_CAUSAL_ARCHITECTURE_AUDIT`, Drive
`1982313Yo3NKERYCBQsyszNfafSxi62UiIMWLoIWaH7A`, dated 2026-09-04 and audited at
main `b986fbe`, PR #60. This is not the "61 page audit" — that is the 63-page
_Full-Game Audit — Review Edition 1_. It is a separate document with a
confusingly similar name.

**It is three weeks stale and most of it is already overtaken.** Its central
claim about parties — _"no party model exists"_ — was true at `b986fbe` and is
false at `273fd2b8`, which is the same trap P1 above corrects. Nothing in it
should be turned into a task without measuring at the current head first.

**Two things in it are still worth checking**, because neither would announce
itself:

- **R5, a crash rather than a defect.** It found production time paths calling
  `advanceWorld(world, days)` with no transition-handler registry, and predicted
  that the first scheduled item outliving the call that scheduled it throws
  _"Missing future-transition handler"_ the next time the player advances the
  day. At `273fd2b8` the throw still exists at `future-transitions.ts:390` and
  `:429`, and `character-history.ts:1159` still calls `advanceWorld` with two
  arguments while `people-continuation.ts:638` passes handlers. Whether it is
  reachable today is unmeasured. A fixture that schedules across a call
  boundary would settle it in an hour. **Update, 2026-09-22:** people-and-life
  could not reproduce it — 24 lives across six places, 220 days each, three
  step granularities, zero throws — and blind probing is exhausted. That is
  consistent with 61B itself, which said the throw was _"NOT currently
  reachable, because the only production scheduler — the committee hearing —
  schedules and resolves inside the same call."_ It named
  `formative-play.ts:353`, `ordinary-life.ts:234` and `character-history.ts:1061`;
  at `273fd2b8` neither `formative-play.ts` nor `ordinary-life.ts` calls
  `advanceWorld` at all, so most of what it described no longer exists. The
  remaining question is narrow and is not answered by walking lives: does any
  production scheduler now create a due item that outlives the call that
  scheduled it? If none does, this is latent and should be closed, not chased.
- **P8, the behavior it calls the one most responsible for "the game
  remembered that".** Callbacks that fire because preserved causal state says
  they should. It reported the ingredients present and never assembled. This is
  the same territory as A5 and A7 and should be checked alongside them.

**Its framing is useful even where its findings are not.** Its eight-row
dynamism matrix asks, for each claim, whether the capability exists, whether
content supplies it, whether anything player-facing is wired to it, and whether
a test proves it. Capability without supply or wiring is the failure mode this
project keeps rediscovering — it is what A2, B6, G1 and M1 all are.
