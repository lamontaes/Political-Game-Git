---
name: crew-messages
description: >
  How Our Civic Duty's sessions message each other: the one tool that reaches
  another session, who gets which message (builder to checker, checker to
  merger, a red to red main, a question for the owner to the CTO, a seam to the
  session that owns it), what every message carries, what must also go into the
  record, and the rule that a process is written as a skill, never explained in
  a message. Use before sending any message to another session and whenever you
  are about to explain how to do something. Not for the shared files themselves
  (.agents/rules/how-we-talk.md) or for reports to the owner (civic-reports).
---

# Crew messages

The owner's rules: sessions message the CTO and the CTO messages them, sessions whose work meets message each other directly, and the CTO's word is the owner's word (owner, Oct 29; `.agents/rules/how-we-talk.md`). A message never replaces the record. **A process is a skill, not a message** (owner, Nov 1: "i saw one messaging about communicating a process. just make it a skill").

## The tool

- Send with the claude-code-remote `send_message` tool and the session id from `docs/coordination/CREW.md`. `SendMessage` is a different transport and reaches no other session (Oct 30: a checker's hand-offs to the mergers went through it for hours and arrived nowhere).
- Start with who is talking to whom: `Checker 2 → Merger 1.` Then the point in the first sentence.
- `send_message` delivers the moment it is called, and nothing takes it back. Never call it with a draft, a placeholder or a body still to fill in: write the whole body first, then send (Nov 1: a governing message that said only "placeholder" reached the laws lead and needed a second message to withdraw it).
- Arm no timers: no `send_later`, `create_trigger` or wake-up chain (owner, Nov 1: "Anthropic has removed 5-hour limits, so no need for any timers or anything"). After a long stop, the CTO restarts each session by message.

## Who gets what

| You have                                          | Send it to                                                       | And put it in                                       |
| ------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| A PR ready (builder)                              | the checker whose number is the PR number mod 5                  | the PR body                                         |
| A passed gate (checker)                           | the merger by the PR's parity (Merger 0 even, Merger 1 odd)      | a PR comment with the head SHA                      |
| A send-back (checker or merger)                   | the builder named in CREW                                        | a PR comment saying what fails, with place and seed |
| A red on main                                     | red main, or the session that owns the engine (`red-main` skill) | a pool item if none matches                         |
| A skills PR                                       | the CTO, who reads it and merges it at once                      | the PR body                                         |
| A question for the owner                          | the CTO, ending with the reading line (`look-first`)             | the PR body under OWNER DECISIONS NEEDED            |
| A seam (you will build in another session's area) | that session, before you build                                   | your channel block                                  |
| Your queue is empty or too long (checker)         | the CTO, who moves PRs between checkers                          | nothing else                                        |
| A stray push, a deleted file, a mistake           | the CTO at once, with what and where                             | nothing else                                        |

When the CTO moves a PR between two checkers, it tells both. A checker already mid-gate keeps the PR and tells the other.

## What a message carries

- The PR number and the head SHA it is about, the place and seed of any failure, and the exact ask.
- What you did and what is left, in one or two sentences. Not the whole log: that goes in the PR comment.
- A builder's hand-off to its checker names the branch and head, what changed in one sentence, the heavy test with the seed variables that replay its proof place (for example `LENDERS_PLACE` and `LENDERS_WORLD_SEED`) and how long one run takes, what the builder did not run, and that the checker is now the branch's one writer.
- Quote a PR number only from the result of the call that created it, and send the message after that call. A number written before it is a guess (Nov 1: a message sent with the create call named #7076 for what became #7078).
- A ruling you relay names where it is recorded (`OWNER-DECISIONS.md`, with its date and time).
- A reviewer whose environment refuses a GitHub write sends the review by message. The PR's author then posts it on the PR word for word, marked as relayed, with the sender and time, so the checker reads it in the record (Nov 1, the lane's review of #6981).

## A process is a skill

- If you are about to explain in a message how to do something (a command, an order of steps, a trap to avoid), write it into the skill that covers it, or a new skill, and send the skill's name and line instead. Ship it as a `skills:` PR the CTO merges at once (AGENTS.md, "Skills").
- If you receive a process in a message, check that a skill holds it. If none does, add it.
- A message that settles something for the future (a route, a ruling, a recurring fix) is also a skill line or an `OWNER-DECISIONS.md` entry, never only a message.
- A skills PR is merged within minutes of your message. Before you push more to its branch, check the PR is still open, by reading the PR itself (its state and whether it merged); a status or checks read shows only the head's checks and says nothing about a merge (Nov 1: a line pushed after that kind of check was stranded); once it has merged, anything you push is stranded on the branch, so open a new skills PR for it (Nov 1: three sessions' later lines were stranded this way).

## When messages cross

- Two messages about the same thing can cross. The newest from the CTO wins. Reply with what changed and the head you are on.
- If a message tells you something that is already done or already wrong, say so in one line and carry on. Do not redo the work.

## Stop condition

Done when each message reached its session by `send_message`, carried the PR, head, place and seed it was about, matched a record entry, and any process it explained is now a skill line.
