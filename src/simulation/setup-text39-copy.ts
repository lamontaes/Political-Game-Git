import type { QuestionnaireItem } from "./setup-questionnaire-bank";

/** TEXT39 editorial replacements. These are hypothetical setup scenes, never
 * biographical facts. Prior keys and evidence remain in the historical bank.
 * Option motivations and calibration weights are inherited unchanged; no new
 * political ratings, outcome predictions or validity claims are introduced. */
export const TEXT39_SETUP_COPY: Readonly<
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
      "It's eleven at night when you get home. Dana has the furnace estimate and the bills on the kitchen table. “It needs replacing,” she says. “I thought we could just get it repaired.”",
    options: {
      "sit-down": "Sit down and go through the bills with her",
      "ask-what-she-needs": "Ask what she needs from you",
      "say-youll-sort-it": "Offer to arrange the furnace replacement",
      "not-tonight": "Tell her you can't go through this tonight",
    },
  },
  marcus_and_the_trip_fund: {
    prompt:
      "Marcus tells you he took money from the group's trip fund. “I'll put it back before they count it,” he says. He asks you not to tell anyone.",
    options: {
      "keep-it": "Keep it to yourself",
      "make-him-tell": "Tell Marcus to tell the group this week",
      "lend-him": "Offer to replace the money yourself",
      "tell-someone": "Tell the person responsible for the fund",
    },
  },
  priya_reference: {
    prompt:
      "Priya asks you to sign a reference she drafted. It says she led last year's project, but you know she helped with it and someone else led it. The rest is accurate.",
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
      "Nell wants the two of you to move to a cheaper place forty minutes farther out. You don't know anyone there. She wants an answer by Friday.",
    options: {
      go: "Agree to move",
      stay: "Say you want to stay",
      "ask-for-a-year": "Ask Nell to wait another year",
    },
  },
  curtis_shift: {
    prompt:
      "Curtis asks you to cover his Saturday shift. You've covered for him twice already this month. You have plans for this Saturday.",
    options: {
      "take-it": "Agree to cover Saturday",
      "say-no": "Say no this time",
      swap: "Offer to cover a different day",
      "say-its-the-last": "Agree, but say you won't cover another",
    },
  },
  money_that_arrived: {
    prompt:
      "You've received $800 you hadn't budgeted for. Dana doesn't know yet. You could put it toward replacing the furnace or use it for a week away, your first in two years.",
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
      "At a meeting, Marcus calls the report you spent three weeks writing a team project. Others did contribute. Two people thank Marcus for writing it.",
    options: {
      "say-it-there": "Say you wrote the report",
      "say-it-after": "Talk to Marcus after the meeting",
      "leave-it": "Let it pass",
      "put-it-in-writing": "Send the group a note crediting each contribution",
    },
  },
  the_friend_who_was_wrong: {
    prompt:
      "At a meeting, Priya says the absent volunteer missed their shift without warning anyone. You know they told Priya they couldn't come: you passed on their message yourself.",
    options: {
      "correct-her": "Correct Priya during the meeting",
      after: "Talk to Priya afterward",
      "tell-the-person": "Tell the volunteer what Priya said",
      nothing: "Say nothing",
    },
  },
  the_job_ray_wants: {
    prompt:
      "There is an opening where you work and Ray would be adequate at it. Somebody else who applied would be better and you do not know them. You are asked, informally, what you think.",
    options: {
      "back-ray": "Recommend Ray",
      "say-the-truth": "Say the other applicant is stronger",
      "declare-it":
        "Explain that Ray is your brother and don't recommend either applicant",
    },
  },
  the_till_and_the_kid: {
    prompt:
      "The young cashier has undercharged you by nine dollars. They haven't noticed, and there's a line behind you. Last month this manager cut Curtis's hours over a smaller mistake. You could wait until the cashier's break to speak privately, but you don't know when it is.",
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
      "Dana's request for help with care hours asks whether anyone at home is “available during the day.” You work from home, but you can't leave your work to provide care. The form doesn't explain whether that counts as available.",
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
      sign: "Sign the petition",
      "sign-with-a-note": "Sign and write that you oppose removing the stop",
      refuse: "Decline and explain your objection",
      "take-it-away": "Ask to keep a copy and read it first",
    },
  },
  the_rule_and_curtis: {
    prompt:
      "The rule about the fire door is clear and Curtis has been propping it open every shift because the alternative is walking the long way round twelve times a night. You are the one who has been asked whether it happens.",
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
      "The transit authority is cutting the bus that Dana takes to work and that about forty other people on your street use. Comments close Monday, and the replacement route leaves a two-mile walk at either end.",
    options: {
      write: "Submit a comment about the route",
      "get-the-road-out": "Ask neighbors to submit comments",
      "sort-dana": "Help Dana find another way to work",
      "go-to-the-council-member": "Ask your council member to raise the issue",
    },
  },
  the_yard_at_the_end: {
    prompt:
      "The trucking yard at the end of the street has applied to run overnight. It employs about thirty people, four of whom live on your street. The trucks would pass Nell's window every eleven minutes.",
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
      "ask-for-more-places":
        "Ask whether extra seats are possible before the boundary changes",
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
      "The building has been without power for two days. The utility says Thursday. There is a man on the next floor who needs a refrigerator for what he takes, and a council member who has not returned three calls.",
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
      "The same man has spoken for eleven of the meeting's twenty minutes, on something the meeting is not about. Two people who came to say something specific have not spoken and are putting their coats on.",
    options: {
      "cut-him-off": "Ask him to stop so others can speak",
      "let-him-finish": "Let him finish",
      "ask-the-two": "Ask the two people leaving to speak next",
      "propose-a-limit": "Propose a speaking time limit",
    },
  },
  the_ward_budget: {
    prompt:
      "The district has about $400,000 left and three claims on it: the senior center Ray's neighbor uses, repaving the street the buses were pulled off, and the two youth workers whose positions end in April.",
    options: {
      "senior-center": "Fund the senior center",
      "the-road": "Fund the road repairs",
      "youth-workers": "Fund the youth worker positions",
      "split-it": "Propose smaller allocations to all three",
    },
  },
  the_licence: {
    prompt:
      "The shop on the corner has applied to sell alcohol until two. It is the only shop within half a mile that opens late. The three residents who objected all live above it.",
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
      "find-the-money":
        "Require correction and help them look for financial assistance",
    },
  },
  the_camera: {
    prompt:
      "There is money for a camera on the block, where two people were assaulted last year. It would also record every person going in and out of the legal aid office and the mosque next to it.",
    options: {
      "put-it-up": "Install the camera",
      no: "Reject the camera",
      "angle-it": "Ask for a view that leaves the two entrances out",
      "lighting-instead": "Propose lighting and a patrol instead",
    },
  },
  the_strike_at_the_depot: {
    prompt:
      "The sanitation yard has been out for nine days. The trash has not been collected on your street or the one behind it. Marcus is on the picket line, and Nell has started using the word disgrace about people you both know.",
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
        "Raise the findings at the budget meeting without naming your source",
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
      "You get up for water. Dee is at the kitchen table with a calculator and two piles of mail. “Go back to bed,” she says when she sees you. Then, more quietly, “Sorry. It's late.”",
    options: {
      "go-back": "Go back to bed",
      "ask-what-is-wrong": "Ask what's wrong",
      "sit-on-the-stairs": "Sit on the stairs and listen",
      "tell-bea": "Wake Bea and tell her",
    },
  },
  child_theo_took_it: {
    prompt:
      "Theo shows you a handheld game that belongs to Kenny, who has been telling everyone it went missing. Theo says he is giving it back on Monday and that it is not the same as stealing it. He says this to you and to nobody else.",
    options: {
      "keep-it-quiet": "Keep quiet",
      "make-him-do-it": "Tell Theo to return it Monday, then check",
      "tell-kenny": "Tell Kenny Theo has it",
      "tell-ms-ruiz": "Tell Ms. Ruiz",
    },
  },
  child_the_note: {
    prompt:
      "The school trip costs eleven dollars. You need to return a signed note by Friday. It's been in your bag since Monday. Dee has said there isn't money for extras this week.",
    options: {
      "hand-it-over": "Show Dee the note tonight",
      "lose-it": "Tell Dee you never got a note",
      "ask-bea-for-it": "Ask Bea for the money",
      "ask-about-the-fund": "Ask Ms. Ruiz whether the school can help pay",
    },
  },
  child_bea_took_the_blame: {
    prompt:
      "You swung on the bathroom door and now it won't shut properly. Before you speak, Bea says she did it. Dee believes her.",
    options: {
      "say-it-was-you": "Say you did it",
      "let-it-stand": "Let Dee believe Bea",
      "square-it-with-bea": "Keep quiet now and talk to Bea afterward",
    },
  },
  child_kenny_on_his_own: {
    prompt:
      "Kenny has eaten at the end of the far table on his own for two weeks. Theo says he is weird and that if Kenny sits with you, Theo will sit somewhere else. Kenny is standing there with his tray.",
    options: {
      "call-him-over": "Invite Kenny to sit with you",
      "stay-with-theo": "Stay with Theo and say nothing",
      "go-sit-with-kenny": "Go and sit with Kenny",
      "work-on-theo": "Stay with Theo now and talk to him later",
    },
  },
  child_the_answer_sheet: {
    prompt:
      "While Ms. Ruiz was out, you and three other children looked at the answers on her desk. She returns and asks whether anyone went near it.",
    options: {
      "own-up": "Say you looked",
      "say-nothing": "Say nothing",
      "name-them": "Say four of you looked",
      "after-class": "Wait and tell her privately after class",
    },
  },
  child_the_shortcut: {
    prompt:
      "There is a way home through the yard behind the shops that saves ten minutes, and Dee has said not to go that way. Theo goes that way every day. It is starting to get dark at four.",
    options: {
      "go-the-long-way": "Take the longer route",
      "go-with-theo": "Take the shortcut with Theo",
      "ask-again": "Take the longer route today and ask Dee about the shortcut",
    },
  },
  child_what_you_heard: {
    prompt:
      "You hear Dee on the phone through the wall. She says “moving” and names a month, but you can't hear the rest. She hasn't mentioned a move to you or Bea.",
    options: {
      "ask-outright": "Ask Dee what she meant",
      "tell-bea": "Tell Bea what you heard",
      wait: "Wait for Dee to bring it up",
      "tell-theo": "Tell Theo you might be moving",
    },
  },
  child_the_bus_stop: {
    prompt:
      "The bus that stopped at the end of your road does not stop there any more, so getting to school is a walk to the main road in the rain. Ms. Ruiz says the class can write to the transit people, and half the class thinks that is pointless.",
    options: {
      "write-it": "Write a letter",
      "get-the-class-to": "Ask classmates to write too",
      "say-it-is-pointless": "Say you don't think letters will change it",
      "tell-dee-instead": "Ask Dee to contact the transit office",
    },
  },
  child_the_field_gate: {
    prompt:
      "The field everyone plays on has a gate on it now and a sign about insurance. The man from the club says under-twelves can use it Tuesdays if an adult signs them in. Theo says everyone should just climb it like before.",
    options: {
      "climb-it": "Climb over the gate",
      tuesdays: "Go Tuesday with an adult to sign you in",
      "ask-for-more-days": "Ask about opening it on other days",
      "play-somewhere-else": "Play somewhere else",
    },
  },
  teen_the_shift_and_the_test: {
    prompt:
      "You have the Thursday shift and a test Friday you have not opened a book for. Marisol, who does the schedule, has already moved two shifts around for you this month and made a point of saying so.",
    options: {
      "work-it": "Work Thursday and study afterward",
      "ask-again": "Ask Marisol to move the shift again",
      "swap-with-someone": "Ask a coworker to swap shifts",
      "wing-it": "Work Thursday and take the test without studying",
    },
  },
  teen_theo_driving: {
    prompt:
      "Theo has had his license three weeks and has had two drinks. He is holding the keys and there are four of you and it is eleven miles home. He says he is completely fine and he is annoyed that you looked at him.",
    options: {
      "get-in": "Get in the car",
      "take-the-keys": "Take the keys from Theo",
      "get-a-lift": "Arrange another ride and invite the others",
      "call-home": "Call home and ask to be picked up",
    },
  },
  teen_the_essay: {
    prompt:
      "Bea left for college and left two years of her old coursework in the room. One paragraph of it would fit your assignment almost exactly. Nobody has read it since her teacher did, and Ms. Ruiz has stopped believing you about deadlines.",
    options: {
      "use-it": "Copy Bea's paragraph",
      "write-your-own": "Write your own and submit it late",
      "ask-for-time": "Ask Ms. Ruiz for two more days",
      "ask-bea": "Ask Bea before using her paragraph",
    },
  },
  teen_the_till_short: {
    prompt:
      "The register is forty dollars short at the end of your shift. You did not take it. Marisol says she will write it off as a miscount rather than send it up, and that she is doing you a favor by saying so.",
    options: {
      "let-her": "Accept the miscount explanation",
      "send-it-up": "Ask Marisol to report the shortage",
      "pay-it-in": "Put in forty dollars yourself",
      "find-out-first": "Ask to check the transactions first",
    },
  },
  teen_where_bea_went: {
    prompt:
      "Bea has not called in three weeks and Dee has stopped asking out loud whether she is going to. You have Bea's number and you know she reads messages and does not answer them.",
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
      "You have $900 saved from eleven months of shifts. A car costing $1,100 could replace your two-bus commute. A summer course costs $800, with payment due in the spring. Dee has also asked whether you can help with household expenses.",
    options: {
      "the-car": "Keep saving toward the car",
      "the-course": "Pay for the course",
      "keep-saving": "Keep the money without committing it",
      "give-it-to-dee": "Contribute some to the household",
    },
  },
  teen_the_room_at_the_back: {
    prompt:
      "The library room that stays open until eight is closing at five from January, because the person who staffed it went to four days. Some of the people who use it have somewhere else to be until eight and some have nowhere.",
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
      "A club closes trip registration at noon. You arrive with a member whose bus was late, just after the deadline. Places are still available, but the organizer says late registrations are not accepted.",
    options: {
      a: "Accept the decision and ask to change the rule for future trips",
      b: "Ask the organizer to accept the registration now",
      c: "Ask whether the member can take a cancellation place",
    },
  },
  family_or_opportunity: {
    prompt:
      "Dana's graduation celebration and an interview for a job you want are on the same evening. You cannot attend both in full. The employer has offered only this interview time. You could ask Dana about arriving late, but you would miss the speeches.",
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

export function text39QuestionnaireItem(
  item: QuestionnaireItem,
): QuestionnaireItem {
  const copy = TEXT39_SETUP_COPY[item.key];
  if (!copy) throw new Error(`Missing TEXT39 questionnaire copy: ${item.key}`);
  return {
    ...item,
    key: `${item.key}.text39-v1`,
    prompt: copy.prompt,
    source: {
      sourceDocument: "TEXT39 assignment board",
      reference: `2026-09-14; revised ${item.key}; inherited motivation mapping, not a validity claim`,
    },
    review: {
      verdict: "non-transparent",
      note: "TEXT39 situated alternatives; archived predecessor remains readable. Owner prose acceptance pending.",
    },
    options: item.options.map((option) => {
      const text = copy.options[option.key];
      if (!text)
        throw new Error(`Missing TEXT39 answer: ${item.key}/${option.key}`);
      return { ...option, text };
    }),
  };
}
