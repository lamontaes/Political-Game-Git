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

then replace the body of this one Drive document with the file it wrote:

<https://docs.google.com/document/d/188eBtB0N61zZ_2xTjZ3bvfZKtFKfwo8jdrttK66f7Pc/edit>

("OUR CIVIC DUTY — OPEN RESEARCH QUESTIONS (live queue)", in the
`CLAUDE_MEGA_WAVE_STAGING` folder beside the Staging Index.) Update that
document in place rather than adding a new one, so there is never a second copy
to choose between. The document names the commit and the moment it was rendered in
its own first lines, so a reader can tell whether they are looking at something
current.

Anything filed here and published there is treated as picked up for research.
That is the reason the validator refuses an incomplete record: a question that
reaches Drive is a question somebody is about to spend time on.

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
