# Register shapes, Nov 8, 2026

A line is shaped by the kind of scene it belongs to. Speeches run about 18 words and never ask a question. News and journal lines are short (6 words) and almost never use a contraction. Spoken scene lines run 8 to 10 words with contractions in about six in ten. The five kinds of spoken scene (floor, hallway, press, residents, election) are graded apart now, but they are not yet shaped apart: their lengths sit within two words of each other.

## What was measured

| Kind of line                                     | Lines | Words, mean | Words, middle | Three words or fewer | Ask a question | Use a contraction | Say I | Say you |
| ------------------------------------------------ | ----- | ----------- | ------------- | -------------------- | -------------- | ----------------- | ----- | ------- |
| Speeches (opening address, speech stages)        | 717   | 17.7        | 18            | 1%                   | 0%             | 36%               | 51%   | 26%     |
| News, headlines and newscasts                    | 992   | 6.5         | 6             | 13%                  | 1%             | 4%                | 1%    | 1%      |
| Journal, scene narration and labels              | 881   | 6.5         | 6             | 17%                  | 1%             | 9%                | 27%   | 26%     |
| Private talk (family, friends, work, school)     | 2499  | 8.2         | 7             | 15%                  | 13%            | 52%               | 52%   | 40%     |
| On the floor (votes, bills, hearings, vetoes)    | 1030  | 8.6         | 8             | 4%                   | 7%             | 64%               | 59%   | 41%     |
| In the hallway (donors, lobbyists, party, staff) | 856   | 9.1         | 8             | 6%                   | 12%            | 57%               | 61%   | 50%     |
| With the press (interviews, scandals, debates)   | 603   | 8.2         | 8             | 2%                   | 12%            | 61%               | 50%   | 40%     |
| With residents (town hall, protests, rallies)    | 795   | 8.6         | 8             | 4%                   | 9%             | 56%               | 54%   | 42%     |
| Around an election (filing, concessions, rivals) | 1096  | 9.5         | 8             | 3%                   | 10%            | 56%               | 48%   | 47%     |

## What it shows

The owner asked that the English work differently for different kinds of scenes. Three things now do. A grade reaches only lines of its own kind, so grading a floor line no longer moves a hallway word. Speeches, news and the journal differ sharply in length, questions and contractions. And the speech registers (the floor, press briefing, town hall, rally, eulogy and the rest) shape speeches.

## What is still open

A hallway word, a floor exchange, a press answer and a resident's question read alike in length and manner. A real hallway word is shorter and quieter than a floor exchange, which is more formal (Madam Chair, I yield, the gentleman from). The next step is to give each spoken kind its own devices from the register cards, and to grade by kind so the owner's grades shape them. The register cards' own measured corpora give targets. In ordinary talk about 45 percent of turns are three words or fewer (Santa Barbara Corpus). The hallway has 8 percent, up from 2 percent before tonight's 37 short hallway lines. The floor opens by thanking the chair in 82 percent of turns (Pennsylvania Legislative Journal), a form the banks do not yet have. A press briefing question runs 14 words in the middle and an answer 17. Public comment at a hearing now counts with residents, not the floor.

In the press kind, 12 of 603 lines use a set evasion of the briefing formulas (2.0%); the briefing card measures 24 percent of substantive answers.

In a hearing's public comment, 8 of 61 replies greet the body first (13%) and 7 end on an ask (11%); the council-comment card measures 80 percent greeting the body and 60 percent ending on an ask.

## How this was made

The numbers are counted from every bank piece in the English engine's banks, grouped by the kind of scene (the bank's register class, and for scene talk the class of the scene's purpose, sceneClasses; grades reach across them). A word is a run of letters; slots are counted as one word. The script is scripts/reports/register-shapes.py.
