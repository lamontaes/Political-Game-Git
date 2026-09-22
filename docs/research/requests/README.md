# Research questions

Any thread that hits something it cannot answer by reading code files it here.
One JSON file per question, named for its `questionId`. Filing is creating a
new file, so two threads working on two branches never conflict and no question
is lost to a merge.

The readers are people — lamontae and ChatGPT — so write it to be read, not
parsed.

Schema and rules: `src/research/research-request.ts`.

## File one

Write the record, then:

```
npm run research:request -- file path/to/record.json
```

It validates first and writes nothing if the record is incomplete. Then commit
the file it created under this directory.

## Read the queue

```
npm run research:request -- list             # open questions, most blocking first
npm run research:request -- check            # validate every record; non-zero on error
npm run research:request -- render           # the whole open queue as one document
npm run research:request -- render --write   # …and put it in docs/research/OPEN-QUESTIONS.md
```

`render` is the one to hand to whoever is going to answer these. The written
copy is generated: if two branches both wrote it, run `render --write` again
rather than merging the prose.

## Publish it where the researchers can see it

The people answering these — lamontae and ChatGPT — read Drive, not our
branches, so a question that only exists in this directory has not been asked.
After the queue changes:

```
npm run research:request -- render --write
```

then publish the file it wrote into this Drive **folder**:

<https://drive.google.com/drive/folders/1YKUgzXCRog97z5VMcA2vlZZP0jjbeCd6>

("OPEN RESEARCH QUESTIONS — live", inside `CLAUDE_MEGA_WAVE_STAGING` beside the
Staging Index.)

**The link is the folder, never a document id.** The Drive connector cannot
rewrite the body of an existing Google Doc, so each refresh creates a new dated
document. A document id written down anywhere is therefore guaranteed to go
stale at the next refresh — which has already happened once, and sent a lane to
a document that was no longer current. The live folder holds exactly one
document at rest, so whatever is in it is current, and its title carries the
render time and the commit so you can tell without opening it.

**Never trash the previous render. Rename it and move it.** Prefix its title
with `SUPERSEDED — `, keeping the rest of the stamped title exactly as it was,
and move it to the sibling archive folder, "OPEN RESEARCH QUESTIONS —
superseded renders (kept for comments)". Renaming and moving preserve the
document id, so every link already pointing at it and every comment left on it
keep working; trashing destroys both, and a trash through this connector is a
one-way door — there is no untrash, and afterwards no session can even read the
file's metadata. Only lamontae can restore one, from the Drive browser, within
thirty days.

Recreating a document you trashed is not a repair. The restore is what brings
back the original id, and the id is the thing every pointer and every comment
was attached to; a new document with the same title fixes nothing and makes the
folder look tidy while the pointer is still broken. So a trash becomes one line
in lamontae's pooled list asking him to restore it, and the archive folder holds
only documents we still have.

This queue renders more often than anything else published to Drive, so it runs
this risk on every single refresh. The reasoning behind the rule, and the two
failures that produced it, are in `docs/DRIVE-PUBLISHING.md`, which arrives with the hardcoded-content
audit branch.

Render at a committed head. The stamp reads `(working tree modified)` otherwise,
which is the tool being honest but not something to publish.

Anything filed here and published there is treated as picked up for research.
That is the reason the validator refuses an incomplete record: a question that
reaches Drive is a question somebody is about to spend time on.

## What belongs here

The test is not "can we reach it". Every source is approved, so a thread can go
and read almost anything itself, and a question that only needs one page read
is ordinary work — go and read it.

The test is whether a researcher can **finish it and hand it back whole**. A
fifty-one row survey with a citation per row has a clear finish line and takes
real time; a thread doing it between other work would do it worse and slower,
and would leave it half done. That is what this queue is for. Something
genuinely out of reach — a person's decision, a private source, a document only
lamontae has — belongs here too, but it is the smaller case, not the rule.

## What a record must answer

Five things, because they are what somebody who hit the question actually
knows:

- `question` — what needs researching, as a question somebody could go and
  answer.
- `whyItMatters` — what goes wrong while it stays unanswered. Not a restatement
  of the question; this is how it gets ranked against everything else open.
- `lane` — who is asking, so the answer goes back to somebody.
- `usableAnswer` — what the researcher should come back holding, so they know
  when to stop. "The statute citation and the number it sets" is usable.
  "Information about Kentucky" is refused, because it cannot be finished.
- `sourcesChecked` — what was already looked at and, for each, **what it did
  not settle**. An empty array is a real answer and means the researcher starts
  from zero; leaving the field off is refused, because "nothing was checked"
  and "the asker forgot to say" are different facts.

Plus `impact` (`blocks-work`, `shapes-design` or `background`), `priority`
(`P0`–`P2`), `requestedBy` and `filedAt`.

`impact` and `priority` are not the same thing and come apart in both
directions: a question that only shapes a design can be the most urgent thing
in the project, and one that blocks a single afternoon can wait.

You are not expected to have searched anything before filing. If you checked
nothing, say so with an empty array.

## Answering one

Edit the question's own file and add an `answer` object: the finding, at least
one source, who answered it and when, and `stillOpen` if it does not cover
everything. An answered record stays in this directory as history — that is
what stops the same question being asked again in six weeks — and drops out of
`list` and `render`.

An answer with no sources is refused. This queue exists so nobody has to guess
twice.

## Example

See `example-county-treasurer-selection.json` in this directory.
