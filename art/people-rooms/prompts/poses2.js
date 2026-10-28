window.__poses2 = () => {
 const RD = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/refs/heads/claude/people-rooms-art/art/';
 const BD = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/';
 const G = (who) => `Edit the reference picture. Keep the room EXACTLY the same: every wall, curtain, floor board, podium, lectern, microphone, chair, object, color, line and the camera angle stay identical, pixel for pixel; do not move, redraw, add or remove anything in the room. Only add people-shaped placeholders: smooth mannequins with no face, no hair, no clothes and no details, painted one flat pure bright green (#00FF00, like a green screen) with no shading and no outline. ${who} Each mannequin is a realistic adult size for its place, about seven and a half heads tall, standing with both feet on the floor behind the furniture, its hands touching the podium, lectern or microphone exactly where described, the way a real speaker's would. The body and head turn the way described; they do not simply face the viewer unless told. Nobody floats. The podium or lectern in front of a mannequin hides the parts of it behind it. No two mannequins touch. No other changes. Same art style. No text.`;
 const D = RD + 'backdrops-redraw/debate-stage__midday.jpg', I = RD + 'backdrops-variants/inaugural-lectern-close__midday.jpg', C = BD + 'council-chamber__midday.jpg';
 const two = (l, r) => `Two mannequins, one standing behind each podium. At the left podium: ${l} At the right podium: ${r}`;
 const one = (s) => `One mannequin standing behind the lectern: ${s}`;
 const back = (s) => `One mannequin standing at the public lectern in the middle aisle, facing the council's dais, so it is seen mostly from behind: ${s}`;
 const J = [
  ['lp-d1', D, two('both hands gripping the two sides of the podium top, leaning in toward the audience, body facing the audience.', 'body and head turned three-quarter toward the left podium, talking to the other speaker, one hand raised to shoulder height with the palm open, the other hand resting on the podium.')],
  ['lp-d2', D, two('one hand holding the microphone stem as if adjusting it, the other hand flat on the podium, head turned a little toward the audience on the left.', 'the right arm raised high in the air mid-sentence, the other hand on the podium, body turned slightly toward the audience on the right.')],
  ['lp-d3', D, two('body and head turned three-quarter toward the right podium, pointing at the other speaker with one arm, the other hand on the podium.', 'standing half a step back from the podium with arms folded, head turned toward the left podium, listening.')],
  ['lp-d4', D, two('head bowed toward the podium top, both hands flat on it, reading notes.', 'talking with both hands open in front of the chest, palms up, body facing the audience, head turned a little to the left.')],
  ['lp-d5', D, two('one fist raised at chest height for emphasis, the other hand on the podium edge, body turned slightly to the right.', 'one hand over the heart, the other hand resting on the podium, head turned toward the left podium.')],
  ['lp-i1', I, one('body turned a little toward the right side of the picture, addressing the crowd there, one hand raised in the air while speaking, the other hand on the lectern.')],
  ['lp-i2', I, one('head bowed, reading the speech on the lectern, both hands holding the two edges of the lectern top.')],
  ['lp-i3', I, one('body turned toward the left side of the picture, the right arm stretched out pointing over the crowd, the other hand on the lectern.')],
  ['lp-i4', I, one('both arms raised above the shoulders waving to the crowd, body turned slightly to the left, standing just behind the lectern.')],
  ['lp-c1', C, back('back to the viewer, one hand resting on the lectern, the other hand raised toward the dais, making a point.')],
  ['lp-c2', C, back('back to the viewer, both hands on the lectern, leaning toward the microphone.')],
  ['lp-c3', C, back('turned in profile, looking back over the shoulder toward the public seats, one hand on the microphone stem.')]];
 return J.map(([k, r, w]) => ({key: k, ref: r, prompt: '[' + k + '] ' + G(w)}));
};
