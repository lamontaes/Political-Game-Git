// Sparse crowds for seat slots: about half the seats filled, nobody touching, nobody facing the viewer.
window.__CROWD_PLACES = {
  "us-house-floor": "legislature", "state-house-chamber": "legislature", "state-legislative-chamber-bicameral": "legislature",
  "state-legislative-chamber-unicameral": "legislature", "council-chamber": "meeting", "council-chamber-large": "meeting",
  "council-chamber-small": "meeting", "county-commission": "meeting", "county-commission-rural": "meeting",
  "public-meeting-room": "meeting", "school-board-room": "meeting",
};
window.__CROWD_MIX = [
  "Men and women of many ages and races.",
  "Mostly older people: gray, white and thinning hair, some bald.",
  "Mostly women of many ages and races: buns, braids, bobs, curls, short gray hair.",
  "Younger people of many races, men and women, dark hair, ponytails, short cuts.",
  "Heavyset and slim people of many races, receding hair, white hair, black hair.",
];
window.__crowdJob = (place, i) => {
  const kind = window.__CROWD_PLACES[place];
  const mix = window.__CROWD_MIX[i % window.__CROWD_MIX.length];
  const who = kind === "legislature"
    ? `Seat lawmakers in about half of the seats at the desks on the chamber floor, spread across every row, with an empty seat between every two people so that no two people touch or overlap. Each one really sits in a seat behind a desk, seen from behind and slightly from the side, facing the rostrum at the front; the seat back in front of them and the desk in front of their lap. Business suits and blazers in navy, black, gray and burgundy. ${mix}`
    : `Seat people in about half of the seats: officials sitting behind the dais or the board table, and residents in about half of the audience chairs, spread across every row, with an empty chair between every two people so that no two people touch or overlap. The audience is seen from behind, facing the dais; the officials sit facing the room, looking at their papers or at each other. Everyone really sits in a chair. Officials in suits and blazers, residents in everyday clothes. ${mix}`;
  return { key: `${place}-crowd-v${i + 1}`, ref: `https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/${place}__midday.jpg`,
    prompt: `[${place}-crowd-v${i + 1}] Edit the reference picture. ${who} Plain attentive poses, hands resting, nobody looks at the viewer. Keep the room, the furniture, the light and everything else exactly the same. Same art style: clean dark ink outlines, flat soft cel shading. No text.` };
};
window.__crowdBatch = (tab, ntabs, versions) => { const jobs = []; Object.keys(window.__CROWD_PLACES).forEach((p, pi) => { for (let i = 0; i < versions; i++) if ((pi * versions + i) % ntabs === tab) jobs.push(window.__crowdJob(p, i)); }); return jobs; };
"crowd ok";
