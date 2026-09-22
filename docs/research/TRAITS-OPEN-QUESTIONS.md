# Traits: questions that need research, not engineering

**The questions themselves are filed in the research queue**, one record each
under `docs/research/requests/`: `player-temperament-source`,
`ordinary-life-trait-set` and `personality-change-pace`. Those records are what
makes the questions exist for a researcher; this document is the design-side
reasoning behind them and is not a substitute for filing.

Three questions the trait system has running on placeholder answers. Each one
is a judgement about what a believable life looks like, which is why they are
here rather than settled in code: the owner's standing rule is that anything
without explicit research behind it is deferred to ChatGPT and distilled from
what comes back.

Everything else about the trait system is measurable and stays in the code. How
resistance is computed from a chain of records is engineering. What that
resistance should feel like is not.

Each question below says what the build currently does, so an answer can be
applied by changing that and nothing else.

## 1. Where the played character's temperament comes from

**Currently:** only from choices made in play. `recordPlayerTraitChoice` writes
a trait with `player-choice` provenance, and a player who never uses it has an
entirely unsaid temperament, which holds nothing back — everybody who deals
with them simply has nothing recorded to go on.

**The question:** should the setup questionnaire's answers also become the
player's temperament? The questionnaire already carries dimensions and priors,
so the wiring is available. The reason it was not done is that a setup answer
and a fictional behaviour tendency are not obviously the same kind of thing,
and conflating them would put words in the player's mouth about who they are.

**What an answer needs to say:** whether answering a setup question counts as
choosing a disposition, and if so which answers map to which traits, or whether
the two should stay separate with setup describing a life and play describing a
character.

## 2. How many traits, and which

**Currently:** five — sociability, deliberation, reliability, conflict, risk —
declared in `people-trait-pack.ts`. The owner has given one or two as a
starting answer and expects the set to move.

Nothing about the number is load-bearing any more. A trait is a row in a pack,
so adding, removing or replacing the set is an edit to that one file. The
question is what set makes characters feel like people, not what the code can
hold.

**What an answer needs to say:** which dispositions recur often enough in
ordinary life to be worth modelling, and which of the current five are really
the same trait wearing two names.

## 3. What a believable pace of personality change looks like

**Currently:** each trait declares three numbers in `people-trait-pack.ts` —
what a settled value resists, how long it takes to settle, and what each move
already made adds. The values in the file are authored guesses. Deliberation
settles harder and over fifteen years; reliability settles soonest, over eight;
the rest sit between.

Those numbers decide how much has to happen to somebody before they change, and
they were picked to be plausible rather than researched.

**What an answer needs to say:** roughly how much of a life it takes to shift a
disposition, how much a single formative event should be able to do on its own
against how much accumulated pressure should be needed, and whether people
become harder or easier to change after they have already changed once. The
build currently says both: recently shaken people are easier to shift again,
and every move made adds a permanent cost, so each shift leaves somebody harder
to move than the last time they settled.
