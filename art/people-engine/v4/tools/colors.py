"""Perceptual color distance (CIE Lab, Delta E 1976): olive cloth and tan skin are
close in raw RGB numbers but far apart to the eye."""
import numpy as np


def to_lab(rgb):
    a = np.asarray(rgb, np.float32) / 255
    a = np.where(a > 0.04045, ((a + 0.055) / 1.055) ** 2.4, a / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], np.float32)
    xyz = a @ M.T / np.array([0.95047, 1.0, 1.08883], np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[..., 1] - 16
    return np.stack([L, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def de(a, b):
    """Delta E between an image (or color) and a color/image."""
    return np.sqrt(((to_lab(a) - to_lab(b)) ** 2).sum(-1))


def lab_to_rgb(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    def inv(f):
        return np.where(f ** 3 > 0.008856, f ** 3, (f - 16 / 116) / 7.787)
    xyz = np.stack([inv(fx) * 0.95047, inv(fy), inv(fz) * 1.08883], -1)
    M = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]], np.float32)
    lin = np.clip(xyz @ M.T, 0, 1)
    srgb = np.where(lin > 0.0031308, 1.055 * lin ** (1 / 2.4) - 0.055, 12.92 * lin)
    return (srgb * 255).clip(0, 255)


def recolor_lab(tone_L, alpha, target, ref_L):
    """Repaint a part to one target color, keeping the drawing's own light and shade
    as perceived lightness offsets (a small ripple in dark cloth stays small in light cloth)."""
    t = to_lab(np.array(target, np.float32))
    Lp = tone_L.astype(np.float32) / 2.55
    off = Lp - ref_L
    # darker colors carry quieter light and shade (blond highlights must not fleck dark hair)
    off = off * min(1.0, (t[0] + 10) / (ref_L + 10))
    # the soft rim of a part never gets lighter than its middle: no pale fringe or crude edge
    off = np.where(np.asarray(alpha) < 250, np.minimum(off, 0), off)
    out_L = np.clip(t[0] + off, 0, 100)
    # drawn lines (the darkest strokes) keep their own darkness and stay colorless, whatever
    # the new color is, so outlines between a hand and a sleeve never turn the sleeve's color
    th = min(14.0, 0.45 * ref_L)   # relative to the part's own darkness, so black hair can still go gray
    line_w = np.clip((Lp - th) / max(th, 1.0), 0, 1)
    out_L = line_w * out_L + (1 - line_w) * np.minimum(Lp, out_L)
    k = np.clip(out_L / max(t[0], 1), 0, 1.0) * line_w
    lab = np.stack([out_L, t[1] * k, t[2] * k], -1)
    return lab_to_rgb(lab)
