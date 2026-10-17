"""Trace the NB monogram from the brand PNG into normalised polygons (src/logo-shapes.json).
Usage: python3 tools/trace_logo.py <logo.png>"""
import json, sys
import cv2, numpy as np
from PIL import Image

src = sys.argv[1]
im = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
g = np.array(bg.convert('L'))
H = g.shape[0]
mono = g[: int(H * 0.64)]                      # monogram only (above the wordmark)
mono = cv2.resize(mono, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
mono = cv2.GaussianBlur(mono, (0, 0), 1.2)
_, bw = cv2.threshold(mono, 128, 255, cv2.THRESH_BINARY_INV)
cs, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
hier = hier[0]
items = [(i, cv2.contourArea(c)) for i, c in enumerate(cs) if cv2.contourArea(c) > 400]
ys = np.concatenate([cs[i][:, 0, 1] for i, _ in items]); xs = np.concatenate([cs[i][:, 0, 0] for i, _ in items])
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
h = float(y1 - y0)
cx = (x0 + x1) / 2
def norm(c):
    c = cv2.approxPolyDP(c, 1.6, True)[:, 0, :].astype(float)
    return [[round((p[0] - cx) / h, 4), round((y1 - p[1]) / h, 4)] for p in c]
out = []
for i, a in items:
    if hier[i][3] != -1: continue                 # outer contours only
    holes = []
    ch = hier[i][2]
    while ch != -1:
        if cv2.contourArea(cs[ch]) > 150: holes.append(norm(cs[ch]))
        ch = hier[ch][0]
    out.append({'outline': norm(cs[i]), 'holes': holes})
json.dump({'aspect': round((x1 - x0) / h, 4), 'shapes': out}, open('src/logo-shapes.json', 'w'), separators=(',', ':'))
print('shapes', len(out), 'points', sum(len(s['outline']) + sum(len(h) for h in s['holes']) for s in out), 'aspect', (x1 - x0) / h)

# debug render
dbg = np.full((600, int(600 * (x1 - x0) / h) + 40, 3), 255, np.uint8)
for s in out:
    pts = lambda P: np.array([[20 + (p[0] + (x1 - x0) / h / 2) * 600, 600 - p[1] * 590 - 5] for p in P], np.int32)
    cv2.fillPoly(dbg, [pts(s['outline'])], (30, 30, 30))
    for hh in s['holes']: cv2.fillPoly(dbg, [pts(hh)], (255, 255, 255))
cv2.imwrite(sys.argv[2] if len(sys.argv) > 2 else '/tmp/logo_debug.png', dbg)
