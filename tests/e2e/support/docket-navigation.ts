import { expect, type Page } from "../fixtures";

const topicKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const DRAFT_OPTION_LOCATIONS: Readonly<
  Record<
    string,
    { readonly subject: string; readonly topics: readonly string[] }
  >
> = {
  "transit-access/enrollment-fare-relief": {
    subject: "infrastructure",
    topics: ["Transportation", "Public Transit", "Fare Relief"],
  },
  "broadband-access/unserved-buildout": {
    subject: "infrastructure",
    topics: ["Digital Infrastructure", "Broadband Access"],
  },
  "broadband-access/adoption-support": {
    subject: "infrastructure",
    topics: ["Digital Infrastructure", "Broadband Access"],
  },
  "bridge-maintenance/worst-first-condition": {
    subject: "infrastructure",
    topics: ["Transportation", "Roads & Bridges", "Repair Priorities"],
  },
  "water-service-lines/inventory-and-plan": {
    subject: "infrastructure",
    topics: ["Water and Wastewater", "Service Lines", "Inventory and Planning"],
  },
  "education-facilities/school-repair-authorization": {
    subject: "education",
    topics: ["School Facilities", "Repair"],
  },
  "appropriations/single-programme": {
    subject: "taxes-public-finance",
    topics: ["Budgets and Appropriations", "Program Appropriations"],
  },
  "procurement-disclosure/award-reasons-publication": {
    subject: "government-democracy",
    topics: ["Procurement", "Contract Awards"],
  },
};

export async function selectDraftOption(
  page: Page,
  familyKey: string,
  variantKey: string,
) {
  const key = `${familyKey}/${variantKey}`;
  const location = DRAFT_OPTION_LOCATIONS[key];
  expect(
    location,
    `A supported UI route should exist for ${key}`,
  ).toBeDefined();
  if (!location) return;

  await page.getByTestId("drafting-browse-subjects").click();
  await page.getByTestId(`drafting-subject-${location.subject}`).click();
  const path: string[] = [];
  for (const topic of location.topics) {
    path.push(topicKey(topic));
    await page
      .getByTestId(`drafting-topic-${location.subject}-${path.join("-")}`)
      .click();
  }
  await page.getByTestId(`drafting-option-${familyKey}-${variantKey}`).click();
}
