"""Focused regression checks for person-preserving geometry and rejection."""
import unittest
import numpy as np
from align import rigid_shift
from build_seats import assign_chair, rejection_reasons, translate


class GeometryTests(unittest.TestCase):
    def test_room_sampling_flow_has_inverse_placement_sign(self):
        person = np.zeros((64, 64), dtype=bool)
        person[20:40, 20:40] = True
        flow = (np.full(person.shape, 3.0), np.full(person.shape, -4.0))
        # Poison values beneath the person; the ring must exclude these.
        flow[0][person] = 99
        flow[1][person] = 99
        self.assertEqual(rigid_shift(person, person, flow), (4, -3))

    def test_translation_preserves_hair_and_body_pixels(self):
        source = np.zeros((30, 30, 4), dtype=np.uint8)
        source[10:20, 10:20] = [20, 30, 40, 255]
        source[9, 11] = [70, 80, 90, 255]
        result = translate(source, -3, 4)
        np.testing.assert_array_equal(source[9:20, 10:20], result[13:24, 7:17])
        self.assertEqual(int(source.sum()), int(result.sum()))

    def test_leaning_head_keeps_chair_identity(self):
        chairs = [dict(id='a', box=[0, 0, 40, 80], seat=[20, 60]),
                  dict(id='b', box=[40, 0, 40, 80], seat=[60, 60])]
        self.assertEqual(assign_chair([12, 10], chairs)['id'], 'a')
        self.assertEqual(assign_chair([30, 12], chairs)['id'], 'a')
        self.assertEqual(assign_chair([52, 10], chairs)['id'], 'b')
        self.assertIsNone(assign_chair([20, 75], chairs))

    def test_disconnected_foot_is_rejected_without_repair(self):
        mask = np.zeros((30, 20), dtype=bool)
        mask[1:15, 3:15] = True
        mask[23:25, 3:5] = True
        original = mask.copy()
        reasons = rejection_reasons(mask, [8, 1], dict(seat=[8, 20]), 12, 12, 0)
        self.assertIn('disconnected', reasons)
        np.testing.assert_array_equal(mask, original)

    def test_room_similarity_rejects_whole_mask_not_dark_pixels(self):
        mask = np.ones((20, 10), dtype=bool)
        reasons = rejection_reasons(mask, [5, 0], dict(seat=[5, 15]), 10, 10, 0.051)
        self.assertEqual(reasons, ['room_pixels'])
        self.assertTrue(mask.all())

    def test_width_limit(self):
        mask = np.ones((20, 17), dtype=bool)
        self.assertIn('too_wide', rejection_reasons(mask, [5, 0], dict(seat=[5, 15]), 17, 10, 0))


if __name__ == '__main__':
    unittest.main()
