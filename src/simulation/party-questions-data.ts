/**
 * Authored organizational questions a governing body actually decides. They
 * are strategy and procedure, never a real party's ideology. Each option
 * carries the name a group founded around it takes: a label is a position
 * ("Follow the wider party line"), not something a group can be called.
 */
export const PARTY_QUESTIONS = [
  {
    key: "strategy:cross-party-cooperation",
    label: "Working with other parties",
    options: [
      {
        key: "cooperate",
        label: "Cooperate on shared measures",
        foundingName: "Common Ground League",
      },
      {
        key: "keep-distance",
        label: "Keep a clear distance",
        foundingName: "Independent League",
      },
    ],
  },
  {
    key: "procedure:candidate-selection",
    label: "Choosing candidates",
    options: [
      {
        key: "open-contests",
        label: "Open contests",
        foundingName: "Open Primary League",
      },
      {
        key: "committee-slate",
        label: "Committee slate",
        foundingName: "Party Slate League",
      },
    ],
  },
  {
    key: "platform:first-priority",
    label: "First priority",
    options: [
      {
        key: "institutional-reform",
        label: "Institutional reform first",
        foundingName: "Reform League",
      },
      {
        key: "household-costs",
        label: "Household costs first",
        foundingName: "Kitchen Table League",
      },
      {
        key: "local-services",
        label: "Local services first",
        foundingName: "Neighborhood Services League",
      },
    ],
  },
  {
    key: "procedure:local-autonomy",
    label: "Local positions",
    options: [
      {
        key: "chapters-decide",
        label: "Chapters set their own line",
        foundingName: "Home Rule League",
      },
      {
        key: "follow-party-line",
        label: "Follow the wider party line",
        foundingName: "United Party League",
      },
    ],
  },
] as const;

export type PartyQuestionKey = (typeof PARTY_QUESTIONS)[number]["key"];
