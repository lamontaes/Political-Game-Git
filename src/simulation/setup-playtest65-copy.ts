import type { QuestionnaireItem } from "./setup-questionnaire-bank";

/** PLAYTEST65 editorial replacements. These are hypothetical setup scenes, never
 * biographical facts. Prior keys and evidence remain in the historical bank.
 * Option motivations and calibration weights are inherited unchanged; no new
 * political ratings, outcome predictions or validity claims are introduced. */
export const PLAYTEST65_SETUP_COPY: Readonly<
  Record<
    string,
    {
      readonly prompt: string;
      readonly options: Readonly<Record<string, string>>;
    }
  >
> = {
  kitchen_late: {
    prompt:
      "Imagine getting home late to find your partner, Dana, looking over an estimate for a broken furnace. She had hoped a repair would be enough, but the estimate recommends replacing it. She wants to discuss the bill now; you are tired. What do you do first?",
    options: {
      "sit-down": "Sit down and go through the bills with her",
      "ask-what-she-needs": "Ask what she needs from you",
      "say-youll-sort-it": "Offer to arrange the furnace replacement",
      "not-tonight": "Tell her you can't go through this tonight",
    },
  },
  marcus_and_the_trip_fund: {
    prompt:
      "Your friend Marcus helps collect money for a group trip you are both taking. He tells you he borrowed from the shared fund without asking. “I’ll put it back before they count it,” he says, and asks you not to tell the group.",
    options: {
      "keep-it": "Keep it to yourself",
      "make-him-tell": "Tell Marcus to tell the group this week",
      "lend-him": "Offer to replace the money yourself",
      "tell-someone": "Tell the person responsible for the fund",
    },
  },
  priya_reference: {
    prompt:
      "Your coworker Priya asks you to sign a reference she drafted for a job application. It says she led last year’s project, but you know she helped with it and someone else led it. The rest is accurate.",
    options: {
      "sign-it": "Sign it as written",
      "fix-the-line": "Correct that line and sign it",
      "ask-her-first": "Ask Priya to revise it before you sign",
      decline: "Decline to provide the reference",
    },
  },
  ray_car: {
    prompt:
      "Your brother Ray has borrowed the car three times this month and brought it back on an empty tank each time. He is between jobs. You need it on Thursday.",
    options: {
      "say-thursday": "Tell Ray you'll need the car Thursday",
      "say-nothing": "Arrange Thursday without the car",
      "gas-rule": "Lend it only if Ray fills the tank",
      "ask-why": "Ask why he keeps returning it empty",
    },
  },
  nell_moving: {
    prompt:
      "Your partner Nell wants the two of you to move to a cheaper place forty minutes farther out. You would save on rent but do not know anyone there. She wants an answer by Friday.",
    options: {
      go: "Agree to move",
      stay: "Say you want to stay",
      "ask-for-a-year": "Ask Nell to wait another year",
    },
  },
  curtis_shift: {
    prompt:
      "Your coworker Curtis asks you to cover his Saturday shift. You have covered for him twice already this month and have your own plans for this Saturday.",
    options: {
      "take-it": "Agree to cover Saturday",
      "say-no": "Say no this time",
      swap: "Offer to cover a different day",
      "say-its-the-last": "Agree, but say you won't cover another",
    },
  },
  money_that_arrived: {
    prompt:
      "You have received $800 you had not budgeted for. Your partner Dana does not know yet. The furnace you both rely on needs replacing. You could put the money toward it or take a week away, your first in two years.",
    options: {
      furnace: "Put it toward the furnace",
      "the-week": "Book the week away",
      "put-it-by": "Save it without telling Dana",
      "let-her-decide": "Tell Dana and ask her to decide",
    },
  },
  whitfield_grant: {
    prompt:
      "Ms. Whitfield taught you and got you the placement you are in. You are checking the grant application she asked you to proofread, and the participation numbers in it are not the numbers you have been keeping.",
    options: {
      "tell-her": "Tell Ms. Whitfield the figures differ from your records",
      "fix-quietly": "Replace the figures with yours without asking",
      "leave-it": "Leave her figures unchanged",
      "ask-where-from": "Ask where her figures came from",
    },
  },
  who_gets_the_credit: {
    prompt:
      "At a work meeting, your colleague Marcus calls the report you spent three weeks writing a team project. Others did contribute. Two people thank Marcus for writing it.",
    options: {
      "say-it-there": "Say you wrote the report",
      "say-it-after": "Talk to Marcus after the meeting",
      "leave-it": "Let it pass",
      "put-it-in-writing": "Send the group a note crediting each contribution",
    },
  },
  the_friend_who_was_wrong: {
    prompt:
      "At a volunteer meeting, your friend Priya says an absent volunteer missed their shift without warning anyone. You know they sent Priya a message saying they could not come: you passed it on yourself.",
    options: {
      "correct-her": "Correct Priya during the meeting",
      after: "Talk to Priya afterward",
      "tell-the-person": "Tell the volunteer what Priya said",
      nothing: "Say nothing",
    },
  },
  the_job_ray_wants: {
    prompt:
      "Your brother Ray has applied for a job where you work. You think he could do it adequately, but another applicant you do not know appears stronger. The hiring manager asks informally what you think.",
    options: {
      "back-ray": "Recommend Ray",
      "say-the-truth": "Say the other applicant is stronger",
      "declare-it": "Say Ray is your brother and recommend neither applicant",
    },
  },
  the_till_and_the_kid: {
    prompt:
      "A young cashier has undercharged you by nine dollars. They have not noticed, and there is a line behind you. You know the manager cut another cashier’s hours over a smaller mistake last month. You could wait to speak privately during this cashier’s break, but you do not know when it is.",
    options: {
      "say-so": "Point out the mistake at the register",
      "leave-it": "Pay the amount asked and leave",
      "tell-the-kid-outside":
        "Wait for a chance to return the difference privately",
    },
  },
  the_thing_you_saw: {
    prompt:
      "You're getting off a bus when you see a van clip a parked car and drive away. You note its plate. You don't know the car's owner. The police non-emergency line says the wait is about forty minutes.",
    options: {
      report: "Call and wait to report it",
      "note-on-the-car": "Leave the plate number under the windshield wiper",
      nothing: "Leave without reporting it",
    },
  },
  the_form: {
    prompt:
      "Your partner Dana is applying for help with care hours. The form asks whether anyone at home is “available during the day.” You work from home but cannot leave your work to provide care. The form does not explain whether that counts as available.",
    options: {
      "the-useful-answer": "Answer no: you cannot provide care",
      "the-plain-answer": "Answer yes: you are home during the day",
      ask: "Ask the office what “available” means before submitting",
    },
  },
  the_petition_at_the_door: {
    prompt:
      "A neighbor asks you to sign a petition for repairs to the road. You support the repairs, but the petition also asks to remove the bus stop. The neighbor says that request is the part they plan to publicize.",
    options: {
      // Put to the player at any character age (Packet 77), so the answer is
      // the stance, not a signature on a document. Same meaning as before.
      sign: "Support it as written",
      "sign-with-a-note": "Support it, noting you oppose removing the stop",
      refuse: "Decline and explain your objection",
      "take-it-away": "Ask to keep a copy and read it first",
    },
  },
  the_rule_and_curtis: {
    prompt:
      "Your coworker Curtis props open a fire door despite a clear workplace rule. Keeping it closed means taking a longer route twelve times a night. A supervisor asks you whether Curtis has been leaving it open.",
    options: {
      "say-yes": "Say Curtis props it open",
      "say-no": "Say he doesn't",
      "answer-the-other-question":
        "Explain the long walk without answering about Curtis",
      "warn-him-first": "Ask to answer later, then warn Curtis",
    },
  },
  the_bus_route: {
    prompt:
      "The transit authority plans to cut the bus your partner Dana takes to work. About forty other people on your street use it too. Comments close Monday, and the replacement route leaves a two-mile walk at either end.",
    options: {
      write: "Submit a comment about the route",
      "get-the-road-out": "Ask neighbors to submit comments",
      "sort-dana": "Help Dana find another way to work",
      "go-to-the-council-member": "Ask your council member to raise the issue",
    },
  },
  the_yard_at_the_end: {
    prompt:
      "A trucking yard at the end of your street has applied to run overnight. It employs about thirty people, four of whom live on your street. Trucks would pass your neighbor Nell’s window every eleven minutes.",
    options: {
      object: "Object to overnight operation",
      support: "Support the application",
      conditions: "Ask for shorter overnight hours",
      "stay-out": "Take no position",
    },
  },
  the_school_place: {
    prompt:
      "The school attendance boundary is being redrawn. Under the new line the kids on your street go to the school two miles further out, and the kids on the street behind take those seats. Both streets have shown up to the board meeting.",
    options: {
      "argue-for-yours": "Ask the board to keep your street's current school",
      "argue-for-the-rule":
        "Ask for the same boundary criteria for both streets",
      "argue-for-the-worst-off":
        "Ask the board to prioritize children with the longest trips",
      "ask-for-more-places": "Ask about adding seats before the boundary moves",
    },
  },
  the_sold_field: {
    prompt:
      "A developer proposes ninety apartments on the field behind your building. Thirty would have rents people on your street could afford. The field is the only open ground within a mile. There is also an empty site by the depot, but you don't know whether it can be built on.",
    options: {
      "back-the-homes": "Support the apartments",
      oppose: "Oppose building on the field",
      "push-the-share":
        "Ask for more affordable apartments before supporting it",
      "the-other-site": "Ask the developer to investigate the depot site",
    },
  },
  the_night_the_power_went: {
    prompt:
      "Your building has been without power for two days. The utility says service should return Thursday. A neighbor needs refrigeration for his medicine, and your council member has not returned three calls.",
    options: {
      "go-to-the-press": "Contact a local reporter",
      "sort-the-fridge": "Look for somewhere to refrigerate his medicine",
      "log-everything": "Keep a record of the outage and calls",
      "get-the-floor-together":
        "Ask neighbors to visit the council office together",
    },
  },
  the_man_at_the_meeting: {
    prompt:
      "At a neighborhood meeting, one man has spoken for eleven of the first twenty minutes about an unrelated issue. Two people waiting to discuss the agenda are putting their coats on to leave.",
    options: {
      "cut-him-off": "Ask him to stop so others can speak",
      "let-him-finish": "Let him finish",
      "ask-the-two": "Ask the two people leaving to speak next",
      "propose-a-limit": "Propose a speaking time limit",
    },
  },
  the_ward_budget: {
    prompt:
      "Imagine serving on a local budget committee with $400,000 left to allocate. Three requests compete for it: a senior center your brother Ray’s neighbor uses, repairs to a street buses can no longer use, and two youth worker positions that end in April.",
    options: {
      "senior-center": "Fund the senior center",
      "the-road": "Fund the road repairs",
      "youth-workers": "Fund the youth worker positions",
      "split-it": "Propose smaller allocations to all three",
    },
  },
  the_licence: {
    prompt:
      "Imagine reviewing a corner shop’s application to sell alcohol until 2 a.m. It is the only shop within half a mile open late. Three residents object to the later hours; all live above it.",
    options: {
      grant: "Approve the requested hours",
      refuse: "Reject the application",
      midnight: "Approve closing at midnight, with a review in a year",
    },
  },
  the_inspection: {
    prompt:
      "You're inspecting a bakery. Its required cleaning records are incomplete, and a damaged floor needs repairs estimated at $9,000. The family who run it say they cannot pay that now. You can allow time for repairs, but the problems would remain during that time.",
    options: {
      enforce: "Record both violations and require correction",
      "time-to-fix": "Record both and allow six months for the floor",
      "paperwork-only": "Record only the missing cleaning records",
      "find-the-money": "Require the fix and help them find financial help",
    },
  },
  the_camera: {
    prompt:
      "Imagine deciding whether to install a publicly funded camera on a block where two people were assaulted last year. Its proposed view would also record everyone entering the legal aid office and the mosque next door.",
    options: {
      "put-it-up": "Install the camera",
      no: "Reject the camera",
      "angle-it": "Ask for a view that leaves the two entrances out",
      "lighting-instead": "Propose lighting and a patrol instead",
    },
  },
  the_strike_at_the_depot: {
    prompt:
      "Sanitation workers have been on strike for nine days, and trash is piling up on your street. Your friend Marcus is on the picket line. Your neighbor Nell calls the strikers a disgrace, including people you both know.",
    options: {
      "back-them": "Say you support the strikers",
      "back-the-service": "Call for trash collection to resume",
      "get-them-in-a-room": "Ask both sides to meet",
      "keep-out": "Stay out of the discussion",
    },
  },
  the_audit_on_your_desk: {
    prompt:
      "Someone gives you an internal audit of an after-school program. It reports that two-fifths of the budget went to a consultant and attendance stayed the same. The person wasn't authorized to share it. The department may be able to identify them if the audit becomes public.",
    options: {
      "the-paper": "Give the audit to a reporter",
      "ask-officially":
        "Return it and request a copy through the official process",
      "a-way-to-report-it":
        "Ask about a confidential way to report the findings",
      "use-it-quietly":
        "Raise the findings at the budget meeting, source unnamed",
    },
  },
  the_line_to_the_hospital: {
    prompt:
      "The transit board wants to borrow against twenty-five years of fares to run a line from the outer districts to the hospital and the university. It is the only way anybody out there reaches either without two buses. It is also a sixth of what the city can borrow for a generation.",
    options: {
      "build-it": "Support borrowing to build the line",
      "no-debt": "Oppose taking on the debt",
      "buses-first": "Ask the board to examine a direct bus service",
      "let-somebody-build-it":
        "Ask whether an outside operator would finance the line",
    },
  },
  child_kitchen_late: {
    prompt:
      "Imagine being a child getting up for water late at night. Dee, who looks after you, is at the kitchen table with a calculator and two piles of mail. “Go back to bed,” she says. Then, more quietly, “Sorry. It’s late.” Your sister Bea is asleep upstairs.",
    options: {
      "go-back": "Go back to bed",
      "ask-what-is-wrong": "Ask what's wrong",
      "sit-on-the-stairs": "Sit on the stairs and listen",
      "tell-bea": "Wake your sister Bea and tell her",
    },
  },
  child_theo_took_it: {
    prompt:
      "Imagine being at school with your friend Theo. He shows you a handheld game belonging to your classmate Kenny, who says it is missing. Theo says he is returning it Monday, so it is not stealing. Only you know he has it. Ms. Ruiz is your teacher.",
    options: {
      "keep-it-quiet": "Keep quiet",
      "make-him-do-it": "Tell Theo to return it Monday, then check",
      "tell-kenny": "Tell Kenny Theo has it",
      "tell-ms-ruiz": "Tell Ms. Ruiz",
    },
  },
  child_the_note: {
    prompt:
      "Imagine being a child whose school trip costs eleven dollars. The permission slip is due Friday and has been in your bag since Monday. Dee, who looks after you, says there is no money for extras this week. Your older sister Bea and your teacher Ms. Ruiz could also be asked for help.",
    options: {
      "hand-it-over": "Show Dee the note tonight",
      "lose-it": "Tell Dee you never got a note",
      "ask-bea-for-it": "Ask Bea for the money",
      "ask-about-the-fund": "Ask Ms. Ruiz whether the school can help pay",
    },
  },
  child_bea_took_the_blame: {
    prompt:
      "Imagine being a child who swung on the bathroom door until it would not close. Before you speak, your sister Bea says she did it. Dee, the adult looking after both of you, believes her.",
    options: {
      "say-it-was-you": "Say you did it",
      "let-it-stand": "Let Dee believe Bea",
      "square-it-with-bea": "Keep quiet now and talk to Bea afterward",
    },
  },
  child_kenny_on_his_own: {
    prompt:
      "Imagine being at school. Your classmate Kenny has eaten alone for two weeks. Your friend Theo says Kenny is weird and threatens to leave if you invite him to sit with you. Kenny is standing nearby with his tray.",
    options: {
      "call-him-over": "Invite Kenny to sit with you",
      "stay-with-theo": "Stay with Theo and say nothing",
      "go-sit-with-kenny": "Go and sit with Kenny",
      "work-on-theo": "Stay with Theo now and talk to him later",
    },
  },
  child_the_answer_sheet: {
    prompt:
      "Imagine being in class while your teacher, Ms. Ruiz, steps out. You and three classmates look at the answers on her desk. She returns and asks whether anyone went near it.",
    options: {
      "own-up": "Say you looked",
      "say-nothing": "Say nothing",
      "name-them": "Say four of you looked",
      "after-class": "Wait and tell her privately after class",
    },
  },
  child_the_shortcut: {
    prompt:
      "Imagine walking home from school. A shortcut behind the shops saves ten minutes, but Dee, who looks after you, has told you not to use it. Your friend Theo takes it every day. It is starting to get dark at four.",
    options: {
      "go-the-long-way": "Take the longer route",
      "go-with-theo": "Take the shortcut with Theo",
      "ask-again": "Take the longer route today and ask Dee about the shortcut",
    },
  },
  child_what_you_heard: {
    prompt:
      "Imagine being a child who overhears Dee, the adult looking after you, on the phone. She mentions moving and names a month, but you cannot hear the rest. She has said nothing about it to you or your sister Bea. Theo is a friend who lives nearby.",
    options: {
      "ask-outright": "Ask Dee what she meant",
      "tell-bea": "Tell Bea what you heard",
      wait: "Wait for Dee to bring it up",
      "tell-theo": "Tell Theo you might be moving",
    },
  },
  child_the_bus_stop: {
    prompt:
      "Imagine being at school after the bus stop near your home is removed. You now walk to the main road in the rain. Your teacher Ms. Ruiz suggests writing to the transit office; half the class thinks it is pointless. Dee is the adult who looks after you.",
    options: {
      "write-it": "Write a letter",
      "get-the-class-to": "Ask classmates to write too",
      "say-it-is-pointless": "Say you don't think letters will change it",
      "tell-dee-instead": "Ask Dee to contact the transit office",
    },
  },
  child_the_field_gate: {
    prompt:
      "Imagine being under twelve. A field you and your friend Theo play on now has a locked gate and an insurance notice. The club that manages it allows children your age in on Tuesdays if an adult signs them in. Theo says to climb the gate as before.",
    options: {
      "climb-it": "Climb over the gate",
      tuesdays: "Go Tuesday with an adult to sign you in",
      "ask-for-more-days": "Ask about opening it on other days",
      "play-somewhere-else": "Play somewhere else",
    },
  },
  teen_the_shift_and_the_test: {
    prompt:
      "Imagine being a student with a part-time job. You work Thursday and have a test Friday that you have not studied for. Marisol, your supervisor, has already moved two shifts for you this month and made a point of saying so.",
    options: {
      "work-it": "Work Thursday and study afterward",
      "ask-again": "Ask Marisol to move the shift again",
      "swap-with-someone": "Ask a coworker to swap shifts",
      "wing-it": "Work Thursday and take the test without studying",
    },
  },
  teen_theo_driving: {
    prompt:
      "Imagine needing a ride home with three friends. Theo has had his license three weeks and has had two drinks. It is eleven miles home. He holds the keys, insists he is fine to drive, and is annoyed when you hesitate.",
    options: {
      "get-in": "Get in the car",
      "take-the-keys": "Take the keys from Theo",
      "get-a-lift": "Arrange another ride and invite the others",
      "call-home": "Call home and ask to be picked up",
    },
  },
  teen_the_essay: {
    prompt:
      "Imagine being a student whose older sister Bea has left for college. Her old coursework contains a paragraph that fits your assignment almost exactly. Your teacher, Ms. Ruiz, has stopped accepting your explanations for missed deadlines.",
    options: {
      "use-it": "Copy Bea's paragraph",
      "write-your-own": "Write your own and submit it late",
      "ask-for-time": "Ask Ms. Ruiz for two more days",
      "ask-bea": "Ask Bea before using her paragraph",
    },
  },
  teen_the_till_short: {
    prompt:
      "Imagine working a part-time shift. The register is forty dollars short, and you did not take it. Your supervisor Marisol offers to report a miscount instead of referring the shortage to management. She says she is doing you a favor.",
    options: {
      "let-her": "Accept the miscount explanation",
      "send-it-up": "Ask Marisol to report the shortage",
      "pay-it-in": "Put in forty dollars yourself",
      "find-out-first": "Ask to check the transactions first",
    },
  },
  teen_where_bea_went: {
    prompt:
      "Imagine being a teenager whose older sister Bea has moved away. She has not called home in three weeks. Dee, who looks after you, has stopped asking whether she will call. You know Bea reads your messages without answering.",
    options: {
      "keep-messaging": "Keep sending messages",
      "tell-dee": "Tell Dee that Bea reads your messages",
      "leave-it": "Stop messaging for now",
      "go-there": "Take the bus to visit without arranging it",
    },
  },
  teen_the_petition_at_school: {
    prompt:
      "Somebody has started a letter about the coach, and about half of what is in it you saw happen and half you did not. Signing it means putting your name to all of it. Two of the people who did see the rest of it will not sign.",
    options: {
      sign: "Sign the whole letter",
      "sign-your-part": "Write and sign a separate account of what you saw",
      refuse: "Decline to sign",
      "get-the-others": "Ask the two witnesses why they will not sign",
    },
  },
  teen_the_money_for_the_car: {
    prompt:
      "Imagine being a student with $900 saved from eleven months of work. A $1,100 car could replace your two-bus commute. A summer course costs $800, due this spring. Dee, who looks after you, has also asked for help with household expenses.",
    options: {
      "the-car": "Keep saving toward the car",
      "the-course": "Pay for the course",
      "keep-saving": "Keep the money without committing it",
      "give-it-to-dee": "Contribute some to the household",
    },
  },
  teen_the_room_at_the_back: {
    prompt:
      "Imagine using a library room that stays open until 8 p.m. Starting in January it will close at 5 because staffing hours have been cut. Some regular users can go elsewhere until eight; others have nowhere to go. A public meeting about the change is scheduled.",
    options: {
      "go-to-the-meeting": "Attend the meeting about the hours",
      "get-names": "Ask room users to sign a request to keep it open",
      "ask-for-two-nights": "Ask for two late evenings a week",
      "find-somewhere-else": "Look for another place to spend the evenings",
    },
  },
  teen_what_marisol_said: {
    prompt:
      "Marisol says the new coworker skipped a shift without calling. You took that coworker's call yourself and passed it on. Other coworkers are repeating Marisol's account. Marisol makes the schedule and has been helpful to you since you started.",
    options: {
      "say-it-to-her": "Tell Marisol you took the call",
      "tell-the-girl": "Tell the new coworker what is being said",
      "say-nothing": "Stay out of it",
      "stop-repeating": "Correct coworkers when they repeat it",
    },
  },
  friend_in_trouble: {
    prompt:
      "You saw your friend damage a club's window while throwing a ball where play isn't allowed. The club organizer asks you what happened. Your friend asks you to leave their name out.",
    options: {
      a: "Tell the organizer what you saw",
      b: "Describe the accident without naming your friend",
      c: "Decline to answer",
    },
  },
  safe_or_risky: {
    prompt:
      "You have a permanent job. Another employer offers a six-month contract doing work you want to learn. They might renew it, but have made no promise. Your current employer wants to know whether you are leaving.",
    options: {
      a: "Stay in your current job",
      b: "Accept the six-month contract",
      c: "Ask for more details before deciding",
    },
  },
  unfair_rule: {
    prompt:
      "A club trip still has places available, but registration closed at noon. You arrive just afterward with a fellow member whose bus was late. The organizer refuses the late registration. Do you challenge this decision, seek another route onto the trip, or work to change the rule for next time?",
    options: {
      a: "Accept the decision and ask to change the rule for future trips",
      b: "Ask the organizer to accept the registration now",
      c: "Ask whether the member can take a cancellation place",
    },
  },
  family_or_opportunity: {
    prompt:
      "Your partner Dana’s graduation celebration and an interview for a job you want fall on the same evening. The employer offers no other interview time. You could ask Dana about joining the celebration late, but you would miss the speeches.",
    options: {
      a: "Attend the whole celebration and decline the interview",
      b: "Attend the interview and miss the celebration",
      c: "Ask Dana about joining the celebration after the interview",
    },
  },
  public_mistake: {
    prompt:
      "You sent customers a meeting notice with the wrong start time. A few have arrived early. Your coworker is being asked who sent it, and hasn't answered yet.",
    options: {
      a: "Say you sent the notice",
      b: "Contact the customers first, then explain the mistake",
      c: "Say nothing unless someone asks you",
    },
  },
  offered_leadership: {
    prompt:
      "The organizer of a volunteer group asks you to lead its next project. Other members haven't been asked what they think. You care about the project but could also help without leading it.",
    options: {
      a: "Accept the role",
      b: "Ask the group whether they want you to lead",
      c: "Offer to help with the work without leading",
    },
  },
  letter_of_the_rule: {
    prompt:
      "At a club game, your team can request repeated equipment checks under the rules. The checks would use up the remaining playing time while your team is ahead. The rules set no limit on requests.",
    options: {
      a: "Request the checks",
      b: "Keep playing without requesting checks",
      c: "Ask your team to defend its lead during play",
    },
  },
  respected_disagreement: {
    prompt:
      "A coworker you respect wants to cancel a project you think is worth finishing. You are discussing it before the team decides.",
    options: {
      a: "Explain why you disagree",
      b: "Ask why they want to cancel it",
      c: "Leave the disagreement until the team discusses it",
    },
  },
};

export function playtest65QuestionnaireItem(
  item: QuestionnaireItem,
): QuestionnaireItem {
  const baseKey = item.key.replace(/\.text39-v1$/, "");
  const copy = PLAYTEST65_SETUP_COPY[baseKey];
  if (!copy) throw new Error(`Missing TEXT39 questionnaire copy: ${item.key}`);
  return {
    ...item,
    key: `${baseKey}.playtest65-v2`,
    prompt: copy.prompt,
    source: {
      sourceDocument: "PLAYTEST65 assignment",
      // The original reference stays first: callers group authored copy by
      // it ("Moral —", "Opening …"). The revision is appended, not substituted.
      reference: `${item.source.reference} · PLAYTEST65 revision 2026-09-20 of ${baseKey}; inherited motivation mapping, not a validity claim`,
    },
    review: {
      verdict: "non-transparent",
      note: "PLAYTEST65 self-contained hypotheticals; TEXT39 predecessor remains readable. Owner prose acceptance pending.",
    },
    options: item.options.map((option) => {
      const text = copy.options[option.key];
      if (!text)
        throw new Error(`Missing TEXT39 answer: ${item.key}/${option.key}`);
      return { ...option, text };
    }),
  };
}
