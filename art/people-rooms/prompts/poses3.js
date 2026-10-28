window.__poses3 = () => {
 const P = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/refs/heads/claude/people-rooms-art/art/people-rooms/pose-plates/';
 const A = (who, extra) => `Edit the reference picture. Keep everything in the picture EXACTLY the same, pixel for pixel, except the flat green mannequin. Turn the green mannequin into a real person in exactly the same pose, position, size and outline: ${who}, completely bald with no hair at all, natural skin, wearing a plain gray suit jacket, a light gray shirt, gray trousers and gray shoes, no tie, no jewelry, nothing in the hands. ${extra} The lectern and furniture in front still hide the same parts of the body. Same art style: clean dark outlines and flat soft shading. No text.`;
 const front = 'A calm, natural face that looks where the mannequin\'s head points, not at the viewer.';
 const back = 'Seen from behind, exactly as the mannequin is, so the face does not show.';
 return [['pa-i1', 'lp-i1', 'a man of medium build in his fifties', front], ['pa-i2', 'lp-i2', 'a woman of medium build in her fifties', front], ['pa-i3', 'lp-i3', 'a heavyset man in his sixties', front],
  ['pa-c1', 'lp-c1', 'a slim woman in her forties', back], ['pa-c2', 'lp-c2', 'a slim man in his thirties', back]]
  .map(([k, src, who, ex]) => ({key: k, ref: P + src + '.png', prompt: '[' + k + '] ' + A(who, ex)}));
};
