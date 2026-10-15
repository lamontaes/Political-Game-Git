// Plain dais officials: hands resting and empty, nobody in the audience.
window.__ZS = {"council-chamber":["cc","the raised dais"],"council-chamber-large":["ccl","the raised dais"],"council-chamber-small":["ccs","the raised dais"],"county-commission":["cco","the commission table"],"county-commission-rural":["ccr","the commission table on the platform"],"school-board-room":["sbr","the long board table"],"public-meeting-room":["pmr","the front table"]};
window.__zsJob = (place, n) => {
  const [code, where] = window.__ZS[place];
  const mix = window.__XS_MIX[(n + 1) % 5];
  const pick = ["the first, third and fifth chairs from the left", "the second, fourth and sixth chairs from the left", "the two end chairs and the middle chair", "every other chair, starting from the right", "three chairs spread along it", "the chairs nearest the middle, leaving one empty chair between them"][n % 6];
  const key = `z-${code}-${String(n + 1).padStart(2, "0")}`;
  return { key, ref: `https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/${place}__midday.jpg`,
    prompt: `[${key}] Edit the reference picture. Seat officials only at ${where}, in ${pick}, with an empty chair between any two of them so they don't touch. Each one really sits in the chair behind ${where}, facing the room, upright and attentive, forearms resting on it, hands folded or resting flat, empty hands: nothing in their hands, no papers held up, no phone, no pen. Nobody sits in the audience and nobody stands. Suits, blazers and sweaters. ${mix} Keep the room, the furniture, the light and everything else exactly the same. Same art style: clean dark ink outlines, flat soft cel shading. No text.` };
};
window.__zsBatch = (tab, ntabs) => { const all = []; Object.keys(window.__ZS).forEach(p => { for (let n = 0; n < 6; n++) all.push(window.__zsJob(p, n)); }); const per = Math.ceil(all.length / ntabs); return all.slice(tab * per, (tab + 1) * per); };
"zs ok";
