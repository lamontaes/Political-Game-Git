/** Mockup-only A-card content. No radial, bust, clock or game command ownership. */
export function reviseACard(card, recorded) {
  const title = card.querySelector("h2");
  title.replaceChildren();
  const name = document.createElement("span");
  name.className = "s3-card-name";
  name.textContent = recorded.identity.name;
  const age = document.createElement("span");
  age.className = "s3-card-age";
  age.textContent = recorded.facts.age;
  title.append(name, age);
  const facts = card.querySelector(".facts");
  facts.replaceChildren();
  const rows = [
    ["Home", recorded.identity.home],
    ["Work", recorded.facts.work.replace(", since 2026.", "")],
    ["Roommate", recorded.names.housemate],
    ["Your mom", recorded.names.parents[0]],
    ["Your dad", recorded.names.parents[1]],
  ];
  for (const [relationship, value] of rows) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = relationship;
    dd.textContent = value;
    facts.append(dt, dd);
  }
  // Session 14 relocates these existing controls to its clock composition.
  const clockActions = card.querySelector(".time-actions");
  clockActions?.remove();
  return clockActions;
}
