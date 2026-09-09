# Legislative Politics: Provisions, Commitments, and Bargaining

The legislation core answers where a bill is and whether a question carried. It
says nothing about what is _in_ the bill, what anyone has promised about it, or
what was asked for in return. Those three things are most of legislative
politics, and this is where they live.

Nothing here replaces the merged legislation state machine, the rule packs, the
vote arithmetic, or the conversation substrate. It is a layer over them.

## Three rules

**Talking never legislates.** A member can promise support, drop an objection,
or agree to carry an amendment, and none of it puts a word into the bill. A
section's text changes only by recording a new version that names the one it
replaces, and only on the authority of an amendment the chamber actually
adopted. Integrity re-checks this on every snapshot: a save that carried a
rewritten section without the amendment that carried it is rejected.

**A commitment is a claim about the future, not the future.** What was said is
recorded once, with its conditions, its audience, and the words. Whether it was
kept is _derived_ from later canonical events and never written back over the
statement. A private word and a public pledge are different political facts,
and the existing audibility and claim semantics decide which one happened.

**Asking for a project in your district, trading support with a colleague, and
taking money for yourself are recorded as different things**, because they are
different things. Exactly one exchange character means personal benefit to the
officeholder. Nothing on the list is ranked, and a narrowly written provision
is never reported as corrupt by the fact of being narrow.

## Provisions

A provision is one operative section of a measure: its number, heading, and the
language as it would read in the bill. Provisions are append-only; a revision
is a new record naming the version it supersedes and the adopted amendment that
carried it. `provisionKey` is the section's durable identity across versions,
and at most one version of a key may be live at a time.

Who a provision reaches is a typed distinction, not a `pork` flag. A
general-application provision states who it reaches. A particularized one names
its beneficiary, the place it is written for when it names one, its
`MetricScope` segment, and — required — the stated public ground for writing it
narrowly. Targeted spending is an ordinary legislative act that has to be
argued for in the open, and the record carries the argument rather than a
verdict.

## Commitments

A commitment records a holder, a subject, a stance, a firmness, its explicit
conditions, its audience, who actually heard it, and the words. Firmness is a
word — explicit, qualified, provisional, noncommittal — never a probability;
the player is told how hedged something sounded, not how likely a hidden model
thinks it is to hold.

Conditions are typed so they can be checked against canonical state rather than
re-read: a provision adopted, a scope narrowed, a fiscal ceiling, an analysis
delivered, reciprocal support, or a step the promise was only good before.
Every one of them is a condition the world can actually decide, and the list is
exhaustive by construction — a condition kind the assessor cannot answer is
refused at the point of recording and at snapshot validation, rather than
offered and silently never met.

A conditional commitment binds in one direction only, and being free of it is
not the opposite of it. "I support it if you do X" is **not owed** until X has
happened: before that it is neither a promise to vote yes nor a reason to vote
no, and a vote that happens to match it has not kept it. "I oppose it unless
you do X" binds to no while X is missing and is **released** once X arrives —
released to neutral, because being answered is not the same as having promised
support. If the member wants what is now in the bill, the bill says so; the
promise does not say it for them.

Whether anything was owed is settled before whether it was kept. Assessment is
derived and reports `open`, `conditions-met`, `conditions-unmet`, `honored`,
`departed-from`, or `superseded`, with a sentence a player may read.

## Which question, exactly

A measure is asked more than one question. Passing a bill, agreeing to the
other chamber's changes, overriding a veto, and adopting one amendment to one
section are four things a member can answer four different ways, and a promise
about one of them is not a promise about the others.

One canonical identity says which: the measure, the stage the question is put
at, the amendment or section the question turns on when it turns on one, and
the chamber and floor stage when the promise named them. Three things compare
it, and they all compare the same thing — whether newer words replace older
ones, which recorded vote tested a promise, and which of a member's promises
bear on the question in front of them. A promise that named no chamber is a
promise that did not distinguish them, not a promise about all of them.

## Member decisions

One simulated member deciding one question runs through the same deterministic
evaluator as every other character choice, over considerations drawn from what
is in the bill, what they have said, and who they have been working with. A
vote on an amendment weighs what the amendment _would_ do, not only what the
bill currently says, so a member does not vote against the very section they
asked for.

This is deliberately not a whip count. Seats without a simulated person keep
their authored dispositions; a member the game has never modelled does not
acquire a mind because a neighbouring seat has one. Extending this to a whole
chamber is a separate piece of work with its own content problem, and the seam
is `deriveMemberDisposition` rather than a guess.

## Dialogue

Bargaining beats are drawn from a motif layer keyed by two independent things:
the _family_ — what kind of move this is — and the _voice_ — which concern this
particular member reaches for first. A fiscal guardian and a district advocate
refusing the same amendment do not refuse it the same way. Variants declare
what facts they need, so a line naming an amount is never offered when the
section states none, and a line written as a reply is never offered as an
opener. Selection hashes the turn's own stable key, so replay is word for word.

No line reads a decision score, states a probability, or names an internal
enum.

## Deliberately not here

Lobbying, campaign finance, ethics investigation, a media ecosystem, the full
appropriations process, party-caucus AI, district electorate simulation, and a
generalized member-vote model for a whole chamber. None of them is required to
represent a bargain, and each is its own problem.

## Current-main conversation integration (D-081 / D-082)

The subject registry owns the bargaining response, the next conversation
progress, and the resolved turn's commit contract. The optional `consequence`
hook returns a canonical writer that runs once after the engine has recorded
the event, claim and resolved listener knowledge. It receives those exact IDs
and listeners; a subject cannot substitute intended listeners for actual ones.
Relationship effects use the same kind/change/significance/summary contract as
ordinary subjects. The engine has no `resolved.bargaining` write branch.

Ordinary subjects omit the new hook. The integration regression compares their
complete relationship, commitment, aftermath, event and turn records with
digests captured on main before the hook existed, including an actual scheduled
household callback. The repaired domain modules and existing regression cases
remain unchanged.

The floor fixture uses main's canonical dynamic-surface projection for its own
world. It is still a developer route. Player-world construction and the
OfficeScene paper/floor navigation remain the PR85 ownership handoff after that
route lands; missing canonical measure content must fail closed.
