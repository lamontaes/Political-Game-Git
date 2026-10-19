// Very sparse crowds: a handful of people far apart, so every cutout is one whole person.
window.__XS = {"us-senate-floor":["sen","s",12],"us-house-floor":["ush","l",14],"state-house-chamber":["sth","l",12],"state-legislative-chamber-bicameral":["bic","l",10],"state-legislative-chamber-unicameral":["uni","l",12],"council-chamber":["cc","m",10],"council-chamber-large":["ccl","m",10],"council-chamber-small":["ccs","m",10],"county-commission":["cco","m",8],"county-commission-rural":["ccr","m",6],"public-meeting-room":["pmr","m",7],"school-board-room":["sbr","b",4]};
window.__XS_MIX = ["Men and women of many ages and races.", "Mostly older people: gray, white and thinning hair, some bald.", "Mostly women of many ages and races: buns, braids, bobs, curls, short gray hair.", "Younger people of many races, men and women, dark hair, ponytails, short cuts.", "Heavyset and slim people of many races, receding hair, white hair, black hair."];
window.__XS_WHERE = ["spread over the whole room", "mostly in the seats nearest the viewer", "mostly in the far seats toward the front of the room", "mostly on the left half of the room", "mostly on the right half of the room"];
window.__xsJob = (place, n, sha) => {
  const [code, kind, count] = window.__XS[place];
  const mix = window.__XS_MIX[n % 5], where = window.__XS_WHERE[(n + Math.floor(n / 5)) % 5];
  const apart = `far apart from each other, ${where}, with several empty seats between any two people so that no two people touch, overlap or sit next to each other.`;
  const who = kind === "b"
    ? `Seat only ${count} school board members at the long board table, with empty chairs between them, facing the room, looking at their papers or at each other; no one anywhere else. Suits, blazers and sweaters.`
    : kind === "m"
    ? `Seat only ${count} people in the whole room, ${apart} One or two of them are officials sitting behind the dais or table facing the room, looking at their papers; the rest are residents in the audience seats, seen from behind, facing the dais. Everyone really sits in a seat. Officials in suits and blazers, residents in everyday clothes.`
    : `Seat only ${count} ${kind === "s" ? "senators in the blue chairs" : "lawmakers in the seats at the desks"} on the chamber floor, ${apart} Each one really sits in the seat behind a desk, facing the rostrum at the front: seen from behind, or in profile on the far sides; nobody's face is turned toward the viewer. Business suits and blazers in navy, black, gray and burgundy.`;
  const key = `x-${code}-${String(n + 1).padStart(2, "0")}`;
  return { key, ref: `https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/${place}__midday.jpg`,
    prompt: `[${key}] Edit the reference picture. ${who} ${mix} Plain attentive poses, hands resting. Keep the room, the furniture, the light and everything else exactly the same. Same art style: clean dark ink outlines, flat soft cel shading. No text.` };
};
// Job list ordered place by place so each tab reuses its reference picture.
window.__xsBatch = (tab, ntabs, n0, n1, sha) => { const all = []; Object.keys(window.__XS).forEach(p => { for (let n = n0; n < n1; n++) all.push(window.__xsJob(p, n, sha)); }); const per = Math.ceil(all.length / ntabs); return all.slice(tab * per, (tab + 1) * per); };
"xs ok";
