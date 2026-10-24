// The filing counter's rule rows read as the controls data's words, never as a
// rule's id. Used by filing.browser.mjs; throws naming what is wrong.
export function checkRuleLabels(labels, controls) {
  const rules = controls?.filing?.rules;
  if (!rules || !Object.keys(rules).length)
    throw new Error("the controls data has no filing rule names");
  if (!labels.length) throw new Error("the counter shows no rule rows");
  const words = Object.values(rules).map((w) => String(w).toLowerCase());
  for (const label of labels) {
    const text = label.trim();
    if (/^[a-z]+(-[a-z]+)+$/i.test(text))
      throw new Error(`a rule reads as its id: ${label}`);
    if (!words.includes(text.toLowerCase()))
      throw new Error(`${label} is not a rule name from the controls data`);
  }
}
