import { describe, expect, it } from "vitest";

import { SERVICE_REQUEST_FORMS } from "./service-delivered-data";

const PRIVATE_SCHOOLING =
  "us-policy-positions:education.public-funds-for-private-schooling";

describe("LW-14 education service person landing rows", () => {
  it("gives the private-school funding law a child-specific request and attendance form", () => {
    const form = SERVICE_REQUEST_FORMS[PRIVATE_SCHOOLING];

    expect(form).toMatchObject({
      need: "child-in-household",
      activityKind: "confirmed",
      forChild: {
        minimumAge: 6,
        maximumAge: 17,
        programKind: "schooling:private-school-program",
        contextKind: "program:private-school-choice",
      },
      visit: { startMinuteOfDay: 480, minutes: 360 },
    });
    expect(form?.forChild?.notAlreadyEnrolled).toEqual(
      expect.arrayContaining([
        "schooling:elementary",
        "schooling:middle",
        "schooling:secondary",
        "schooling:private-school-program",
      ]),
    );
  });
});
