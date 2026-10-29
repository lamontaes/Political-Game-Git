// Natural poses and key-color parts (Oct 28 overnight).
// Owner: "Make people look natural. Make people look alive." and "taking the shirt from one generation and literally
// replacing it". Each part is painted on the pose's base in one flat key green, so its whole region is known exactly
// and swaps in as one piece; the game recolors it by brightness.
window.__keyParts = (sheet, baseUrl) => {
 const keep = (part) => `Edit the reference picture. Keep all six people exactly the same, pixel for pixel, except ${part}: the same heads, faces, hands, skin, bodies, poses, positions and sizes stay identical. `;
 const tail = ' Draw it in the same clean dark-outline style, fitted to each body\'s own build, but color it one flat bright green (#22C55E) with soft darker-green shading, so it stands apart from everything else. Nothing else changes. No text.';
 const P = [
  ['sh2', 'their shirt', 'Change only the shirt: everyone wears a short-sleeve polo shirt, untucked, the hem hanging over the belt.'],
  ['sh3', 'their shirt', 'Change only the shirt: everyone wears a plain short-sleeve crew-neck tee, untucked, the hem hanging over the belt.'],
  ['sh4', 'their shirt', 'Change only the shirt: everyone wears a plain crew-neck knit sweater.'],
  ['sh5', 'their shirt', 'Change only the shirt: everyone wears a short-sleeve collared button shirt, tucked in.'],
  ['jk1', 'that they now wear a jacket', 'Add only a buttoned suit jacket over each person\'s shirt; the gray shirt collar shows at the neck; the pants, shoes and everything else stay identical.'],
  ['jk2', 'that they now wear a jacket', 'Add only an open blazer, unbuttoned, over each person\'s shirt; the gray shirt shows down the front; the pants, shoes and everything else stay identical.'],
  ['jk3', 'that they now wear a cardigan', 'Add only an open knit cardigan over each person\'s shirt; the gray shirt shows down the front; everything else stays identical.'],
  ['jk4', 'that they now wear a vest', 'Add only a work vest with chest pockets over each person\'s shirt; the gray shirt sleeves still show; everything else stays identical.'],
  ['jk5', 'that they now wear a jacket', 'Add only a zip-up casual jacket, half open, over each person\'s shirt; everything else stays identical.'],
  ['ti1', 'that they now wear a tie', 'Add only a plain necktie at each person\'s shirt collar, hanging down the front of the gray shirt; everything else stays identical.'],
  ['pa1', 'their pants', 'Change only the pants: everyone wears plain dress slacks with a belt. The shirt stays tucked in tightly, so the whole waistband of the pants shows.'],
  ['pa2', 'their pants', 'Change only the pants: everyone wears straight-leg jeans. The shirt stays tucked in tightly, so the whole waistband of the pants shows.'],
  ['pa3', 'their pants', 'Change only the pants: everyone wears chino khakis. The shirt stays tucked in tightly, so the whole waistband of the pants shows.'],
  ['pa4', 'their pants', 'Change only the pants: everyone wears knee-length shorts, showing their bare lower legs. The shirt stays tucked in tightly, so the whole waistband of the pants shows.'],
  ['pa5', 'their pants', 'Change only the pants: everyone wears loose work pants with side pockets. The shirt stays tucked in tightly, so the whole waistband of the pants shows.'],
  ['ft2', 'their shoes', 'Change only the shoes: everyone wears canvas sneakers.'],
  ['ft3', 'their shoes', 'Change only the shoes: everyone wears leather work boots.'],
  ['ft4', 'their shoes', 'Change only the shoes: everyone wears casual loafers.'],
  ['ft5', 'their shoes', 'Change only the shoes: everyone wears running shoes.']];
 return P.map(([k, part, what]) => ({key: `wk-${sheet}-${k}`, ref: baseUrl, prompt: `[wk-${sheet}-${k}] ` + keep(part) + what + tail}));
};
window.__marker = (sheet, baseUrl) => ({key: `wm-${sheet}`, ref: baseUrl, prompt: `[wm-${sheet}] Edit the reference picture. Keep all six people exactly the same shape, pixel for pixel, but change only the colors of their clothes to flat, pure marker colors with no shading and no outlines inside them: every shirt pure yellow (#FFFF00), every pair of pants pure blue (#0000FF), every pair of shoes pure green (#00FF00). Heads, faces, hands, skin and the background stay exactly as they are. No text.`});
window.__hair12 = (sheet, baseUrl) => {
 const W = ['shoulder-length wavy hair','long straight hair past the shoulders','a short rounded natural afro','a chin-length bob with straight bangs','long box braids','a neat high bun','a low ponytail','a short pixie cut','shoulder-length locs','long loose curls','short two-strand twists','medium layered hair swept to one side'];
 const M = ['a short cropped cut','a short side-parted cut','short tight curls','a close buzz cut','a low fade with a short textured top','slicked-back medium-length hair','short hair with a receding hairline','a classic crew cut','short locs','neat cornrows','medium-length wavy hair','short hair on the sides with a bald crown'];
 const nn = i => String(i + 1).padStart(2, '0');
 return W.map((w, i) => { const key = `hk-${sheet}-${nn(i)}`; return {key, ref: baseUrl, prompt: `[${key}] Edit the reference picture. Keep all six people exactly the same: the same pose, position, size, face, ears, body, clothes, outlines and shading, pixel for pixel. Only give each person hair, drawn in the same clean dark-outline style, the hair one plain medium gray. The women in the top row have ${w}. The men in the bottom row have ${M[i]}. Draw the hair as seen from the angle each head is turned, sitting naturally on that head at the right size, following the shape of the skull, and not covering the face. Nothing else changes. No text.`}; });
};
// Natural pose bases, painted from the standing base (bald, collared shirt, slacks, dress shoes, white background).
window.__NAT = [
 ['s1', 'Everyone stands relaxed and natural, facing the viewer: weight resting on one leg with the other knee slightly bent, shoulders loose, arms hanging easily at their sides with the hands relaxed, a small easy smile, the way people really stand while chatting.'],
 ['s2', 'Everyone turns three-quarters toward the left side of the picture, looking toward the left, standing relaxed with their weight on the back leg. The women hold one forearm loosely across the waist; the men rest one hand in a front pants pocket with the other arm hanging loose.'],
 ['s3', 'Everyone turns three-quarters toward the left side of the picture, in the middle of a friendly conversation with someone off to the left. The women gesture with one open hand at chest height, the other arm relaxed; the men explain with one low, firm hand at waist height, the other hand in a pocket.'],
 ['s4', 'Everyone turns three-quarters toward the left side of the picture, listening to someone off to the left with their arms folded loosely, weight shifted onto one hip, head tilted a little.'],
 ['s5', 'Everyone turns three-quarters toward the left side of the picture, looking down at a phone held in both hands at chest height, weight on one leg.'],
 ['s6', 'Everyone turns three-quarters toward the left side of the picture, walking toward the left mid-stride at an easy pace, arms swinging naturally.'],
 ['c1', 'Everyone sits back comfortably on a seat that is not drawn (draw no chair or furniture, they sit on nothing, like a pose reference), turned three-quarters toward the left side of the picture. The women sit with one knee crossed over the other and their hands resting in the lap; the men sit with one ankle resting on the other knee and one arm resting where an armrest would be.'],
 ['c2', 'Everyone sits on a seat that is not drawn (draw no chair, table or furniture, like a pose reference), turned three-quarters toward the left side of the picture, leaning forward with both forearms resting at waist height where a table would be, hands loosely together, engaged in a conversation.'],
 ['c3', 'Everyone sits on a seat that is not drawn (draw no chair or furniture, like a pose reference), turned three-quarters toward the left side of the picture, leaning back a little while talking, one hand gesturing, the other resting on the thigh, feet planted naturally.'],
 ['b1', 'Everyone is seen from behind, standing relaxed with their weight on one leg, arms loose, as if watching something in front of them; we see the backs of their heads, shirts and slacks.'],
 ['b2', 'Everyone is seen from behind, sitting on a seat that is not drawn (draw no chair or furniture), relaxed, as if in an audience watching a speaker in front of them; we see the backs of their heads, shirts and slacks.'],
 ['s7', 'Everyone faces the viewer in the middle of talking to them: weight on one leg, one hand raised in an open, natural gesture at chest height, the other hand relaxed at the side, a lively expression.']];
window.__natBases = (baseUrl, tag = 'nb') => window.__NAT.map(([k, pose]) => ({key: `${tag}-${k}`, ref: baseUrl, prompt: `[${tag}-${k}] Edit the reference picture. Exactly six people, three in each row, each standing apart in their own place, no one else. The top row is three women and the bottom row three men, left to right slim, medium and heavy; every woman keeps a clearly feminine build, with narrower shoulders, a defined waist and fuller hips, and every woman moves like a woman. Keep the same six people: the same bald heads, faces, skin, ears, builds and body sizes, the same clothes (a plain gray collared long-sleeve shirt tucked into dress slacks, plain dress shoes), the same clean dark-outline style and the same plain white background, each person staying in their own place in the picture at the same size. Change only their pose: ${pose} Natural, alive and at ease, never stiff. No text.`}));
// Women's pieces: only the three women in the top row change; the men stay exactly as they are (their parts come out empty).
window.__womenParts = (sheet, baseUrl) => {
 const keep = 'Edit the reference picture. Keep all six people exactly the same, pixel for pixel, except what the three women in the top row wear: the same heads, faces, hands, skin, bodies, poses, positions and sizes; the three men in the bottom row stay completely unchanged. ';
 const tail = ' Draw it in the same clean dark-outline style, fitted to each woman\'s own build, but color it one flat bright green (#22C55E) with soft darker-green shading, so it stands apart from everything else. Nothing else changes. No text.';
 const P = [
  ['sh6', 'Change only the women\'s shirts: each woman wears a soft, plain blouse with a round neckline and long sleeves, tucked in.'],
  ['pa6', 'Change only the women\'s pants: each woman wears a plain knee-length pencil skirt, showing her bare lower legs. The blouse or shirt stays tucked in, so the whole waistband shows.'],
  ['dr1', 'Change only the women\'s clothes from the shoulders to the knees: each woman wears a plain knee-length sheath dress with short sleeves and a round neckline, showing her bare forearms and lower legs.'],
  ['ft6', 'Change only the women\'s shoes: each woman wears plain low-heeled pumps.']];
 return P.map(([k, what]) => ({key: `wk-${sheet}-${k}`, ref: baseUrl, prompt: `[wk-${sheet}-${k}] ` + keep + what + tail}));
};
