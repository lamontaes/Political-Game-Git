window.__gestures = () => {
 const SH = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/people-engine/v2/sheets/clarify-';
 const keep = 'Edit the reference picture. Keep all six people exactly the same everywhere except their arms and hands: the same heads, faces, ears, necks, shoulders, bodies, clothes, legs, positions and sizes, pixel for pixel; the heads must not move at all. Change only the arms and hands: ';
 const tail = ' Draw the arms in the same clean dark-outline style with the same gray sleeves. Nobody holds anything. No text.';
 const W = 'Then give each person hair, drawn in the same clean dark-outline style, every person\'s hair the same plain medium gray. ';
 const J = [
  ['gs-37-talk', '37', 'each person raises the right hand to shoulder height with the palm open, talking, the left hand resting on the knee.'],
  ['gs-37-think', '37', 'each person rests the chin on the right hand with that elbow on the knee, thinking, the left hand on the other knee.'],
  ['gs-31-talk', '31', 'each person raises the right hand to shoulder height with the palm open, talking, the left hand resting at waist height in front.'],
  ['gs-31-point', '31', 'each person points with the right arm stretched out to the side, the left hand resting at waist height in front.'],
  ['gs-31-open', '31', 'each person holds both hands open in front of the chest, palms up, explaining.']];
 return J.map(([k, sh, g]) => ({key: k, ref: SH + sh + '.png', prompt: '[' + k + '] ' + keep + g + tail}));
};
window.__hair31 = () => {
 const SH = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/people-engine/v2/sheets/clarify-31.png';
 const W = ['shoulder-length wavy hair','long straight hair past the shoulders','a short rounded natural afro','a chin-length bob with straight bangs','long box braids','a neat high bun','a low ponytail','a short pixie cut','shoulder-length locs','long loose curls','short two-strand twists','medium layered hair swept to one side'];
 const M = ['a short cropped cut','a short side-parted cut','short tight curls','a close buzz cut','a low fade with a short textured top','slicked-back medium-length hair','short hair with a receding hairline','a classic crew cut','short locs','neat cornrows','medium-length wavy hair','short hair on the sides with a bald crown'];
 const nn = i => String(i + 1).padStart(2, '0');
 return W.map((w, i) => ({key: 'hr-31-' + nn(i), ref: SH, prompt: `[hr-31-${nn(i)}] Edit the reference picture. Keep all six people exactly the same: the same pose, position, size, face, body, clothes, outlines and shading, pixel for pixel. Only give each person hair, drawn in the same clean dark-outline style, every person's hair the same plain medium gray. The three women in the top row all have ${w}. The three men in the bottom row all have ${M[i]}. Everyone faces the viewer. The hair sits naturally on each head at the right size and does not cover the face. Nothing else changes. No text.`}));
};
