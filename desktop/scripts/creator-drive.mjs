// Drives the game's character creator from the desktop proofs.
//
// The creator asks for a full birthday through the game's own select
// (GameSelect: a combobox trigger and a portalled listbox), not a native
// age field. Every desktop proof that starts a life goes through here so the
// creator's shape is reconciled in one place.

/** Picks `value` on one GameSelect (or a native select where one remains). */
export async function chooseGameSelectValue(control, value) {
  const native =
    (await control.evaluate((element) => element.tagName)) === "SELECT";
  if (native) {
    await control.selectOption(value);
    return;
  }
  if ((await control.getAttribute("aria-expanded")) !== "true") {
    await control.click();
  }
  const listId = await control.getAttribute("aria-controls");
  const list = control.page().locator(`[id=${JSON.stringify(listId ?? "")}]`);
  await list.waitFor();
  await list
    .locator(`[role="option"][data-value=${JSON.stringify(value)}]`)
    .click();
  await list.waitFor({ state: "detached" });
}

/**
 * The rest of the character step a new life requires: a gender, a drawn first
 * and last name, and a birth month and day. Answers already given are kept.
 */
export async function answerCharacterBasics(page) {
  const gender = page.getByTestId("gender-female");
  if ((await gender.getAttribute("aria-pressed")) !== "true") {
    await gender.click();
  }
  const given = page.getByLabel("First name", { exact: true });
  if (!(await given.inputValue())) {
    await page.getByTestId("creator-randomize-name").click();
  }
  const month = page.getByTestId("start-birth-month");
  if (!(await month.getAttribute("data-value"))) {
    await chooseGameSelectValue(month, "1");
    await chooseGameSelectValue(page.getByTestId("start-birth-day"), "1");
  }
}

/**
 * Chooses the birth year that starts play at `age`. Play begins on
 * January 5, 2026: a birthday later in the year than that has not come round
 * yet, so it needs one year earlier. Month and day, when already chosen, are
 * kept.
 */
export async function chooseStartAge(page, age) {
  /*
   * A build older than the full-birthday creator asks for an age and nothing
   * else — fed321f7 has start-age, and none of start-birth-year, the gender
   * buttons or the name draw. A continuity proof exists precisely to open a
   * save made on such a build, so the driver has to be able to start a life
   * on one. Newer builds are untouched: the birthday path below still runs
   * whenever start-birth-year is there.
   */
  if ((await page.getByTestId("start-birth-year").count()) === 0) {
    const legacyAge = page.getByTestId("start-age");
    if ((await legacyAge.count()) === 0) {
      throw new Error(
        "This build's creator has neither start-birth-year nor start-age.",
      );
    }
    // It is a plain number input there, not a GameSelect and not a native
    // select, so it is filled rather than chosen from a list.
    await legacyAge.fill(String(age));
    await legacyAge.blur();
    return;
  }
  await answerCharacterBasics(page);
  const month = Number(
    (await page.getByTestId("start-birth-month").getAttribute("data-value")) ||
      0,
  );
  const day = Number(
    (await page.getByTestId("start-birth-day").getAttribute("data-value")) || 0,
  );
  const notYet = month > 0 && day > 0 && (month > 1 || day > 5);
  await chooseGameSelectValue(
    page.getByTestId("start-birth-year"),
    String(2026 - age - (notYet ? 1 : 0)),
  );
  await page
    .getByTestId("creator-derived-age")
    .filter({ hasText: `age ${age},` })
    .waitFor();
}
