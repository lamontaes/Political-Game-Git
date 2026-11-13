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

- **The pull request is the item's thread (owner, Nov 10; `docs/pool/START-A-BUILDER.md`).** Progress, questions ("Question:"), send-backs and the "Handoff:" note go on the item's own pull request, so a new agent on any tool carries on from the record. A tool that cannot message other sessions (Codex, Muse or another) uses the pull request comment as its message; the session that must act reads the pull request, and a message from a session that can send one only points to the comment. Issue 8928 is for crew-wide lines only.
- In Claude, send with the claude-code-remote `send_message` tool and the session id from `docs/coordination/CREW.md`. `SendMessage` (the sub-agent tool) is a different transport and reaches no other session (Oct 30: a checker's hand-offs to the mergers went through it for hours and arrived nowhere).
- Start with who is talking to whom: `Checker 2 → Merger 1.` Then the point in the first sentence.
- `send_message` delivers the moment it is called, and nothing takes it back. Never call it with a draft, a placeholder or a body still to fill in: write the whole body first, then send (Nov 1: a governing message that said only "placeholder" reached the laws lead and needed a second message to withdraw it).
- A message to a session in a long turn waits in its queue until the turn ends, unless it is sent with `priority: "next"`, which joins the running turn (`"now"` interrupts it). Send rulings and corrections with `"next"`. A session that keeps doing what you told it to stop has probably not received your messages, so ask it for a one-line reply naming what it is on (Nov 8: Jobs and economy got 24 messages, from 9:55 a.m. on, only at 11:40, after building two things they had redirected).
- Arm no timers: no `send_later`, `create_trigger` or wake-up chain (owner, Nov 1: "Anthropic has removed 5-hour limits, so no need for any timers or anything"). After a long stop, the CTO restarts each session by message.

## Starting a session with a goal

- A session started with `create_session` whose first message begins `/goal ` runs it as a real goal (a stop hook the session can't end before it holds). The goal is limited to 4,000 characters; a longer one is refused and the session does nothing (Nov 8: the five night briefs, 8,000 to 12,000 characters each, and Dev Mode's were all refused). Write the role, the done-when lines and the rules in short under 4,000, and point to the full brief by branch and path.
- A `/goal` sent later with `send_message` arrives as an ordinary message, not a command. The session works on it but holds no stop hook, so it can end its turn early (Nov 8: none of the five night sessions given their goal by message showed one). Check `get_session` for `external_metadata.goal`; a session without one is restarted by message on each pass.
- **A created session is not a running session.** `create_session` returns an id even when the goal was refused, and a refused session looks the same in a list. Count the brief first (`wc -c`, under about 3,800 to leave room). Before telling anyone a session runs, read `get_session`: `external_metadata.goal.condition` holds your text, and the session has done something you can see (a post, a branch, a pull request). Report the id with that first action, never before it (Nov 11: four helpers were created with briefs of 4,100 to 4,500 characters and none ran; the CTO had already told the owner the GitHub manager was started, an hour before it was).
- **A goal that cannot be met makes a loop.** A session's stop hook keeps it going until its goal holds. A builder that decides to stop for a reason the goal does not allow (it thinks its usage is out) is pushed back each time, so it does the cheapest thing that looks like work: it claims an item, writes "not started" and leaves the claim. Watch the pull request list for drafts titled "not started" or "not built" from one session; stop that session, release its claims in one pool pull request and start a fresh one (Nov 11: Builder S4 locked eight items in 100 minutes).
- **`pool next` offers a released item again at once.** Never tell a builder to release what `next` gives it for a reason that will not change (an area, a kind): it takes and releases the same item forever (Nov 11: play-stop-11 was taken, released and taken again within minutes). Tell it to build the item under the rule that applies, or use `next --for <kind>`.
- When a session's priorities change, its held goal does not: the stop hook keeps judging it against the goal from its first message and pulls it back to that work, whatever later messages say. Start a fresh session with the new `/goal` (under 4,000 characters, the old session's open PRs named in it) and archive the old one (Nov 8: Money kept probing the economy cycle for two hours after the owner's 11:05 order to fix payroll first, and Lives called itself done against its first brief while the CTO's audit row waited).
- The model passed to `create_session` is the one that runs; after the first turn `external_metadata.last_served_model` confirms it.
- Post a new session's branch prefix where the merge desk's owner reads, in the same comment that announces the session ("new session: X, branches `x/`"). The merge desk merges only prefixes it has been told about (Nov 8: `jobs/`, `lives/`, `memory/` and `elections/` PRs waited two to four hours for that line).
- Before every push to a PR's branch, read the PR's own state. A merged PR strands whatever is pushed after it, so open a new PR from fresh main instead (Nov 8: five stranded pushes in one night, from four sessions).

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

- **A crew-wide question goes on the coordination thread (owner, Nov 8); a question about an item goes on the item's pull request (Nov 10).** When a crew runs from a coordination thread (Nov 8: #7365, where the CTO and a Coordinator on another account talk), every question from every session (design, ruling, scope or blocker) is a comment on that PR. It starts `Question (<session>):`, puts the question in its first sentence, then gives the PR, head, place and seed, what is being built meanwhile, and the reading line when it is the owner's call. Send the Coordinator a one-line message that it is posted. A session whose environment refuses the GitHub write sends the question by message, and the Coordinator posts it word for word, marked as relayed. Watch it so the CTO's answers arrive at once. If it is an issue, not a pull request (Nov 8: #7365 is an issue), a PR subscription never delivers its comments; poll its comment count once a minute with `gh api -X GET search/issues -f q='repo:<owner>/<repo> is:issue is:open <words in its title>' --jq '.items[] | select(.number==N) | .comments'` and read the new comments when it changes (Nov 8: five CTO comments waited 30 minutes unread). If #8928 is the thread, post there only what concerns the whole crew. #7365 was the line until Nov 12, 2026; it is near GitHub's comment cap. Asking never stops the build: take the realistic choice and say so in the comment.

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
- A hold on a PR goes on the PR as a comment as well as in a message. The comment is what a merger reads before merging: on Nov 1 a checker passed #7036 after the laws lead's hold message, which crossed its pass.
- A PR can merge on an earlier head and drop a later commit (the merge desk merges the head it checked): put every follow-up on a new branch from main, and check main holds your last commit after each merge (Nov 8, #7440).
- **A session that finished its job will not take new work from a message (Nov 11).** Five cause finders whose brief said "one item, then stop" each answered a message asking for more with "the person running this session has to confirm". That is by design: a message from another session cannot widen a session's job. Start a fresh session with a standing brief (its list, then "take the next ones in these areas yourself") instead of messaging an old one. Three fresh ones posted twenty cause pull requests in the next hour.
- **Before you assign a list, say which items you keep for yourself (Nov 11).** A fresh cause finder wrote the same cause I was writing, ten minutes later, because its brief's areas covered my item. Name your own items in the brief, and tell helpers to check for an open pull request that already touches an item before they start it.
- **To see what a session last said, read its last few `assistant` events, never its `result` events in bulk (Nov 11).** One `result` event carries the whole turn's accounting and is thousands of words long.

## Stop condition

Done when each message reached its session by `send_message`, carried the PR, head, place and seed it was about, matched a record entry, and any process it explained is now a skill line.

## Lessons of Nov 11 (the night merging moved)

- **A relayed order cannot give a session a power it does not have.** The CTO relayed the owner's word to start merge desks on a second account. That account's permission check refused to start them, and the lead's own standing order there was "You do not merge." The right move is the one taken: do not work around the refusal, start the part that is allowed (gate-only desks), say on the crew's issue exactly what the owner must do to allow the rest (type it in that session, or add the permission rule), and keep the old holder of the step in place until he does.
- **A new power for a desk goes in a new desk's brief.** When the owner widens what the crew may do (Nov 11: "Fable B's desks may merge"), the lead does not message the running desks to take it up. It starts a session whose own brief holds the power and its limits, and says so on the crew's issue. The desks that refused the message were right.
- **A session in a long turn reads a message when the turn ends.** An order that cannot wait (a build hold, a red) is sent to join the running turn (`priority: "next"`), and to stop the turn only when a wrong action is already under way (`priority: "now"`).
- **A sha in a ready line is read from git, never typed.** A ready line went out with a sha typed from memory and had to be edited. Run `git rev-parse HEAD` and paste it.
- **A number is named only after the thing exists.** Do not name a pull request, a comment or a session before the tool has returned it.

## Lesson of Nov 11 (two builders wrote the same step in the same hour)

Two Words builders each had an item that said "the engine joins a sentence from pieces", one for conversations and one for scenes. Each wrote the joining step, with two different ways to mark a piece's part. Both work; now there are two.

- **When two items need the same new step, the lead names one owner in both briefs:** "W5 writes the joining step and pushes it by itself first; W1 uses it." The other builder starts from that push.
- **A builder whose item adds a step other items say they will use posts it the minute its tests pass,** with the function's name and how to call it, as W5 did at 07:21 UTC. A builder about to write such a step searches the crew's issue for it first.
- **A direction posted on the crew's issue reaches a builder only when it next reads the issue.** A rule that must hold in a builder's next pull request also goes to that builder by message, naming the skill or the pull request comment that holds it.

## Lessons of Nov 11 (the afternoon: messages that waited)

- **Read your queued messages every pass.** A message from another session waits in the notification queue while your turn runs and is not shown until you read the queue. On Nov 11 eleven messages sat for up to 49 minutes, four of them builders holding for a call. Read the queue at the start of each pass and after every long command, before you start anything of your own.
- **A builder who stopped still owns an open pull request, and nobody is gating it.** A pull request whose builder hit the usage limit sat ready and ungated for nine hours. When a session stops, the lead lists its open pull requests and hands each to a gate desk by name, with who finishes the mechanical part.
