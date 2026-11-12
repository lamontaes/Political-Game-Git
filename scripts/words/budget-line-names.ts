/**
 * Spoken names for a local government's budget lines as questions (owner,
 * Nov 12: town speeches; words builder, Nov 12). A town, township or county
 * runs on its own budget (src/core2/contest-positions.ts `budgetPositions`:
 * "budget-line:<line>", a stance for more or less spent on it), and a local
 * speaker's points come from the questions their body decides, so each line
 * gets the same spoken forms a policy question has in
 * data/english/question-names.json. `for` is more spent on the line; the
 * family and pole type the belief that argues it (speech-outline.ts). A line
 * with no entry (administration, other programs, aid to other places) is
 * not offered as a stand. Adds only; run again and it changes nothing.
 *
 *   node --import tsx scripts/words/budget-line-names.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/english/question-names.json";
type Side = { for: string; against: string };
interface Line {
  about: string;
  to: string;
  against: string;
  law: string;
  family: string;
  pole: "a" | "b";
  number: "one" | "many";
  today: Side;
  more: { for: [string, string]; against: [string, string] };
  reasons: Side;
  principles: { for: number[]; against: number[] };
}
const LINES: Record<string, Line> = {
  police: {
    about: "a bigger police budget",
    to: "give the police department more to work with",
    against: "keep the police budget where it is",
    law: "the bigger police budget",
    family: "justice",
    pole: "b",
    number: "one",
    today: {
      for: "Our officers are covering more calls than there are officers to answer them.",
      against:
        "Every dollar the police budget grows comes out of something else we need.",
    },
    more: {
      for: [
        "Calls for help wait longer than they should for an officer.",
        "The department has fewer officers on a shift than it needs.",
      ],
      against: [
        "The police already take the biggest share of what we spend.",
        "More money for patrols leaves less for what keeps trouble from starting.",
      ],
    },
    reasons: {
      for: "a call for help should be answered fast",
      against:
        "money spent before trouble starts goes further than money spent after",
    },
    principles: { for: [1], against: [] },
  },
  corrections: {
    about: "more jail spending",
    to: "staff the jail fully",
    against: "keep the jail budget from growing",
    law: "the bigger jail budget",
    family: "justice",
    pole: "b",
    number: "one",
    today: {
      for: "The jail is short of guards, and the people who work there feel it every shift.",
      against:
        "The jail takes more of the budget every year, and it keeps nobody out of trouble.",
    },
    more: {
      for: [
        "The jail runs short of guards on most shifts.",
        "The guards at the jail work doubles to cover the gaps.",
      ],
      against: [
        "We spend more holding people than keeping them from ending up there.",
        "The jail's share of the budget grows while the same people keep going back.",
      ],
    },
    reasons: {
      for: "a jail that's short of guards isn't safe for anybody inside it",
      against: "keeping people out of jail costs less than keeping them in",
    },
    principles: { for: [1, 2], against: [2] },
  },
  schools: {
    about: "more school funding",
    to: "spend more on our schools",
    against: "keep school spending in check",
    law: "the bigger school budget",
    family: "schools",
    pole: "a",
    number: "one",
    today: {
      for: "Our teachers are buying supplies out of their own pockets, and classes keep getting bigger.",
      against:
        "School spending keeps climbing, and the property tax bill climbs right along with it.",
    },
    more: {
      for: [
        "Classes are bigger than they were, and the buildings are older.",
        "Teachers buy their own supplies to get through the year.",
      ],
      against: [
        "The school budget grows every year, and so does the tax bill that pays for it.",
        "Taxpayers have given the schools more year after year.",
      ],
    },
    reasons: {
      for: "a child's school shouldn't depend on which side of the line they live on",
      against:
        "the families paying the tax bill deserve a say in how fast it grows",
    },
    principles: { for: [1, 2], against: [2] },
  },
  higherEducation: {
    about: "a bigger college budget",
    to: "fund more seats at the community college",
    against: "hold the college to what it gets now",
    law: "the bigger college budget",
    family: "schools",
    pole: "a",
    number: "one",
    today: {
      for: "The college turns away people who want to train for a better job.",
      against:
        "The college's budget grows faster than the number of people it trains.",
    },
    more: {
      for: [
        "More people want to learn a trade than there are seats to teach them.",
        "Folks who want to retrain wait a year to get into a class.",
      ],
      against: [
        "The college asks for more every year, and the taxpayer covers it.",
        "Spending on the college has grown faster than its classes.",
      ],
    },
    reasons: {
      for: "anybody willing to learn a trade should have a seat to learn it in",
      against:
        "the taxpayer shouldn't cover a budget that grows faster than the classes",
    },
    principles: { for: [2], against: [2] },
  },
  parks: {
    about: "more parks spending",
    to: "fix up our parks",
    against: "put the parks behind what we need first",
    law: "the bigger parks budget",
    family: "land",
    pole: "a",
    number: "one",
    today: {
      for: "Our parks are wearing out faster than we fix them.",
      against:
        "The parks get more every year, and the money has to come from somewhere.",
    },
    more: {
      for: [
        "The playgrounds and the ball fields are showing their age.",
        "The parks need repairs the budget hasn't covered.",
      ],
      against: [
        "The parks get more every year while the roads wait.",
        "Every dollar in the parks is a dollar the roads and the police don't get.",
      ],
    },
    reasons: {
      for: "every family deserves a safe place for their kids to play",
      against:
        "the things we need come before the things that are nice to have",
    },
    principles: { for: [], against: [] },
  },
  naturalResources: {
    about: "more spending on land and water",
    to: "do more to care for our creeks and woods",
    against: "leave the care of the land to the people who own it",
    law: "the bigger land and water budget",
    family: "land",
    pole: "a",
    number: "one",
    today: {
      for: "Our creeks and our woods need more care than we've been giving them.",
      against:
        "The land and water budget grows, and the landowners already do the work.",
    },
    more: {
      for: [
        "The creeks and the woods need more care than they get.",
        "Runoff and erosion are wearing away land we can't replace.",
      ],
      against: [
        "The folks who own the land already do the work of caring for it.",
        "Each new land program adds another line to the tax bill.",
      ],
    },
    reasons: {
      for: "clean water is cheaper to keep than to win back",
      against:
        "the people who own the land take better care of it than any program",
    },
    principles: { for: [1, 2], against: [1, 2] },
  },
  housing: {
    about: "more housing money",
    to: "build more homes people can afford",
    against: "stop growing the housing programs",
    law: "the bigger housing budget",
    family: "housing",
    pole: "a",
    number: "one",
    today: {
      for: "Working families here are paying more for rent than they can keep up with.",
      against:
        "Government money for housing grows, and the builders who could build more wait on permits.",
    },
    more: {
      for: [
        "People who work here can't afford to live here.",
        "Rent takes too much of a working family's paycheck.",
      ],
      against: [
        "The money spent on housing hasn't built much housing.",
        "Builders wait on permits while the housing budget grows.",
      ],
    },
    reasons: {
      for: "the people who work here should be able to live here",
      against: "the market builds more homes than any program can",
    },
    principles: { for: [1], against: [2] },
  },
  healthAndHospitals: {
    about: "a bigger health budget",
    to: "fund the clinic and the hospital",
    against: "keep health spending from outgrowing everything else",
    law: "the bigger health budget",
    family: "health",
    pole: "a",
    number: "one",
    today: {
      for: "The clinic is full, and folks without insurance wait the longest.",
      against: "Health spending takes a bigger share of the budget every year.",
    },
    more: {
      for: [
        "People drive a long way to see a doctor.",
        "The emergency room is the only care a lot of folks get.",
      ],
      against: [
        "The health budget grows faster than anything else we pay for.",
        "The hospital asks for more every year, and every year we find it.",
      ],
    },
    reasons: {
      for: "nobody should have to drive an hour to see a doctor",
      against: "a budget that grows faster than the town can't keep growing",
    },
    principles: { for: [1, 2], against: [] },
  },
  welfareAndMedicaid: {
    about: "more assistance spending",
    to: "get families in need what they qualify for sooner",
    against: "tie more of our aid to getting back to work",
    law: "the bigger assistance budget",
    family: "safety-net",
    pole: "b",
    number: "one",
    today: {
      for: "More families are coming to the office than it can see in a week.",
      against:
        "Spending on assistance keeps growing, and fewer of those dollars lead to a job.",
    },
    more: {
      for: [
        "Families wait weeks for the aid they qualify for.",
        "The office that serves families in trouble can't keep up.",
      ],
      against: [
        "The assistance budget grows whether or not anyone gets back to work.",
        "Too few of the dollars spent on assistance lead to a job.",
      ],
    },
    reasons: {
      for: "a family in trouble shouldn't wait weeks for aid it qualifies for",
      against: "aid should lead back to a paycheck",
    },
    principles: { for: [2], against: [1, 2] },
  },
  highways: {
    about: "more road spending",
    to: "fix our roads",
    against: "fix the roads we have before we pave more",
    law: "the bigger road budget",
    family: "transit",
    pole: "b",
    number: "one",
    today: {
      for: "Our roads are full of potholes, and folks are paying for it in tires and repairs.",
      against:
        "The road budget grows, and we keep paving instead of fixing what we have.",
    },
    more: {
      for: [
        "The roads are wearing out faster than we repave them.",
        "Potholes are costing drivers here in tires and repairs.",
      ],
      against: [
        "We pave new roads and let the old ones go.",
        "The road budget grows while what we have goes unfixed.",
      ],
    },
    reasons: {
      for: "the roads we all drive on come first",
      against: "we should fix what we have before we build more",
    },
    principles: { for: [1], against: [] },
  },
};

const json = JSON.parse(readFileSync(FILE, "utf8")) as {
  names: Record<string, unknown>;
};
let added = 0;
for (const [line, row] of Object.entries(LINES)) {
  const key = `budget-line:${line}`;
  // This script's own rows are rewritten from the lists above; no other is touched.
  const was = JSON.stringify(json.names[key] ?? null);
  json.names[key] = {
    // Fields another script writes (`again`) are kept.
    ...(json.names[key] as object | undefined),
    about: row.about,
    to: row.to,
    for: row.to,
    against: row.against,
    // A budget line is never a law in force: each year's budget answers it
    // again, so the stand is always an ask.
    today: {
      without: row.today,
      with: row.today,
    },
    repeal: row.against,
    keep: `keep ${row.law} in the budget`,
    family: row.family,
    pole: row.pole,
    number: row.number,
    figures: [],
    todayMore: {
      without: row.more,
      with: row.more,
    },
    law: row.law,
    principles: row.principles,
    reasons: row.reasons,
  };
  added += JSON.stringify(json.names[key]) === was ? 0 : 1;
}
writeFileSync(FILE, `${JSON.stringify(json, null, 2)}\n`);
console.log(`budget lines named: ${added} written`);
