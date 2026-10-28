// Every part is painted by Firefly on the same six bodies (the pose's base: collared shirt, no jacket, slacks, dress shoes),
// so each part lines up with every other part by construction.
window.__parts = (sheet, baseUrl) => {
 const keep = (part) => `Edit the reference picture. Keep all six people exactly the same, pixel for pixel, except ${part}: the same heads, faces, hands, bodies, poses, positions and sizes stay identical. `;
 const tail = ' Draw it in the same clean dark-outline style, plain medium gray with soft shading, fitted to each body\'s own build. Nothing else changes. No text.';
 const P = [
  ['sh2', 'their shirt', 'Change only the shirt: everyone wears a short-sleeve polo shirt, untucked.'],
  ['sh3', 'their shirt', 'Change only the shirt: everyone wears a plain short-sleeve crew-neck tee, untucked.'],
  ['sh4', 'their shirt', 'Change only the shirt: everyone wears a plain crew-neck knit sweater.'],
  ['sh5', 'their shirt', 'Change only the shirt: everyone wears a short-sleeve collared button shirt, tucked in.'],
  ['jk1', 'that they now wear a jacket', 'Add only a buttoned suit jacket over each person\'s shirt; the shirt collar shows at the neck; the pants, shoes and everything else stay identical.'],
  ['jk2', 'that they now wear a jacket', 'Add only an open blazer, unbuttoned, over each person\'s shirt; the shirt shows down the front; the pants, shoes and everything else stay identical.'],
  ['jk3', 'that they now wear a cardigan', 'Add only an open knit cardigan over each person\'s shirt; the shirt shows down the front; everything else stays identical.'],
  ['jk4', 'that they now wear a vest', 'Add only a work vest with chest pockets over each person\'s shirt; the shirt sleeves still show; everything else stays identical.'],
  ['jk5', 'that they now wear a jacket', 'Add only a zip-up casual jacket, half open, over each person\'s shirt; everything else stays identical.'],
  ['ti1', 'that they now wear a tie', 'Add only a plain necktie at each person\'s shirt collar, hanging down the front of the shirt; everything else stays identical.'],
  ['pa2', 'their pants', 'Change only the pants: everyone wears straight-leg jeans.'],
  ['pa3', 'their pants', 'Change only the pants: everyone wears chino khakis.'],
  ['pa4', 'their pants', 'Change only the pants: everyone wears knee-length shorts.'],
  ['pa5', 'their pants', 'Change only the pants: everyone wears loose work pants with side pockets.'],
  ['ft2', 'their shoes', 'Change only the shoes: everyone wears canvas sneakers.'],
  ['ft3', 'their shoes', 'Change only the shoes: everyone wears leather work boots.'],
  ['ft4', 'their shoes', 'Change only the shoes: everyone wears casual loafers.'],
  ['ft5', 'their shoes', 'Change only the shoes: everyone wears running shoes.']];
 return P.map(([k, part, what]) => ({key: `wp-${sheet}-${k}`, ref: baseUrl, prompt: `[wp-${sheet}-${k}] ` + keep(part) + what + tail}));
};
window.__bases = () => {
 const M = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/people-engine/v2/sheets/clarify-';
 const B = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/refs/heads/claude/people-rooms-art/art/people-engine/v2/sheets-angles/';
 const S = [['37', M + '37.png'], ['01', M + '01.png'], ['70', M + '70.png'], ['06', M + '06.png'], ['prof', B + 'bald-profile.png'], ['tqb', B + 'bald-threeq-back.png']];
 return S.map(([k, ref]) => ({key: `wb-${k}`, ref, prompt: `[wb-${k}] Edit the reference picture. Keep all six people exactly the same, pixel for pixel, except their clothes: the same bald heads, faces, ears, hands, bodies, poses, positions, angles and sizes stay identical. Change only the clothes: everyone wears a plain collared long-sleeve button shirt with no jacket, tucked into dress slacks, and plain dress shoes. Draw the clothes in the same clean dark-outline style, plain medium gray with soft shading, fitted to each body's own build. Nothing else changes. No text.`}));
};
