"""Generate assets/skyline.svg: a grainy flat footer skyline of UMass Amherst.

Usage (from the repo root): python3 scripts/skyline.py assets/skyline.svg

Tweak positions, sizes or the palette (STYLE) here and re-run; the seed keeps
trees, stars and dark windows stable between runs.

Everything is colored by CSS classes whose values are CSS variables, so the
same markup renders as a day scene (light theme) or a night scene (dark theme).

Buildings, left to right, each simplified from photos on Wikimedia Commons:
  Southwest residential towers  tan concrete piers, center window strip, brown brick edges
  Stockbridge Hall              red brick, white cornice and string course, columned portico
  Old Chapel                    granite gables + bell tower, sandstone trim, clock gables,
                                tall diagonal steeple
  Campus Center                 Breuer concrete slab, punched windows, cantilevered top floors
  W. E. B. Du Bois Library      slim brick tower, 7 deep bays per face, notched crown
  Lederle Graduate Research Tower  cream block of punched windows between solid shafts
  LGRC lowrise + Computer Science building  low, ribbon windows, angled ends

Each building is a <g class="sk-bldg" data-name="..."> so the page can show its
name on hover/tap (see the skyline script in index.html).
"""
import random
import sys

BASE = 240          # viewBox height; buildings run to the bottom edge
VIEW_X, VIEW_W = 60, 1290      # visible frame: just wide enough for the buildings
WING_L, WING_R = -700, 2140   # hills and trees continue past the 0..1440 viewBox

rng = random.Random(11)
defs = []


# ---------------------------------------------------------------- svg helpers
def f(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def pts(ps):
    return " ".join(f"{f(x)},{f(y)}" for x, y in ps)


def rect(cls, x, y, w, h):
    return f'<rect class="{cls}" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}"/>'


def prect(pid, x, y, w, h):
    return f'<rect fill="url(#{pid})" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}"/>'


def poly(cls, ps):
    return f'<polygon class="{cls}" points="{pts(ps)}"/>'


def circle(cls, cx, cy, r):
    return f'<circle class="{cls}" cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}"/>'


def path(cls, d):
    return f'<path class="{cls}" d="{d}"/>'


def skew(x0, d, e, inner):
    """Group whose local coords (u, y) map onto a right-hand side face of depth d, rise e."""
    return f'<g transform="matrix(1 {-e / d:.4f} 0 1 {f(x0)} 0)">{"".join(inner)}</g>'


def arch(cls, x, top, w, bottom):
    r = w / 2
    return path(cls, f"M{f(x)},{f(bottom)}V{f(top + r)}a{f(r)},{f(r)} 0 0 1 {f(w)},0V{f(bottom)}Z")


def framed_arch(x, top, w, bottom, win="sk-win", frame="sk-sand", t=1.1):
    """Round-arched window with a sandstone surround."""
    return arch(frame, x - t, top - t, w + 2 * t, bottom) + arch(win, x, top, w, bottom)


def pattern(pid, x0, y0, tw, th, inner):
    defs.append(f'<pattern id="{pid}" patternUnits="userSpaceOnUse" x="{f(x0)}" y="{f(y0)}" '
                f'width="{f(tw)}" height="{f(th)}">{"".join(inner)}</pattern>')


def off_cells(pid, x0, y0, tw, th, win, cols, rows, n, cls="sk-win-off"):
    """Overlay tile of cols x rows windows where n of them stay dark at night."""
    cells = rng.sample([(c, r) for c in range(cols) for r in range(rows)], n)
    wx, wy, ww, wh = win
    pattern(pid, x0, y0, tw * cols, th * rows,
            [rect(cls, c * tw + wx, r * th + wy, ww, wh) for c, r in sorted(cells)])


def windows(pid, x, y, w, h, tw, th, win, off=None, cls="sk-win"):
    """Grid of windows over (x, y, w, h); off=(cols, rows, n) adds dark-at-night ones."""
    pattern(pid, x, y, tw, th, [rect(cls, *win)])
    out = [prect(pid, x, y, w, h)]
    if off:
        off_cells(pid + "o", x, y, tw, th, win, *off)
        out.append(prect(pid + "o", x, y, w, h))
    return out


def box(front, side, top, x, y, w, d, e, base=BASE):
    return [
        rect(front, x, y, w, base - y),
        poly(side, [(x + w, y), (x + w + d, y - e), (x + w + d, base), (x + w, base)]),
        poly(top, [(x, y), (x + d, y - e), (x + w + d, y - e), (x + w, y)]),
    ]


def smooth(points, base, cls):
    """Catmull-Rom through points, closed down to the base line."""
    d = f"M{f(points[0][0])},{f(base)}L{f(points[0][0])},{f(points[0][1])}"
    for i in range(len(points) - 1):
        p0 = points[i - 1] if i > 0 else points[i]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < len(points) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}"
    d += f"L{f(points[-1][0])},{f(base)}Z"
    return path(cls, d)


# ---------------------------------------------------------------- sky + hills
MOON = (735, 44)


def night_sky():
    out = []
    for _ in range(46):
        x = rng.uniform(WING_L + 60, WING_R - 60)
        y = rng.uniform(8, 118)
        if abs(x - MOON[0]) < 30 and y < 75:
            continue
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rng.uniform(0.6, 1.4))}"/>')
    mx, my = MOON
    moon = path("sk-moon", f"M{mx},{my - 14}a14,14 0 1,0 0,28a16,16 0 0,1 0,-28Z")
    return f'<g class="sk-night"><g class="sk-star">{"".join(out)}</g>{moon}</g>'


def hills():
    """Holyoke Range on the horizon."""
    far = [(x, rng.uniform(136, 162)) for x in range(WING_L, WING_R + 1, 150)]
    near = [(x, rng.uniform(174, 194)) for x in range(WING_L, WING_R + 1, 110)]
    return smooth(far, BASE, "sk-hill-far") + smooth(near, BASE, "sk-hill")


# ---------------------------------------------------------------- buildings
def southwest_tower(x, y, pid, w=46, d=14, e=5):
    """22-storey Southwest tower: brick edges | tan pier | window strip | tan pier | brick edges."""
    a, p = w * 0.15, w * 0.22
    c = w - 2 * a - 2 * p
    s = box("sk-swbrick", "sk-swbrick-s", "sk-top", x, y, w, d, e)
    s += [rect("sk-tan", x + a, y, p, BASE - y), rect("sk-tan", x + a + p + c, y, p, BASE - y)]
    s += windows(pid + "c", x + a + p, y + 6, c, BASE - y - 6, c, 6.4, (1, 1.6, c - 2, 3.2),
                 off=(1, 7, 2))
    s += windows(pid + "e", x, y + 6, w, BASE - y - 6, w - a, 6.4, (2, 1.8, a - 4, 3),
                 off=(2, 5, 3))
    s.append(rect("sk-tan", x, y, w, 3))
    s.append(skew(x + w, d, e, windows(pid + "s", 0, y + 6, d, BASE - y, d / 2, 6.4,
                                       (2, 1.8, 3, 3), cls="sk-win-s")))
    # rooftop machine room, railing and antenna
    s += box("sk-tan", "sk-tan-s", "sk-top", x + w / 2 - 8, y - 8, 16, 5, 2, base=y - e / 2)
    s.append(rect("sk-tan-s", x + w / 2 + 5, y - 24, 0.9, 16))
    return s


def stockbridge(x=252, y=180, w=132, d=16, e=6):
    """Stockbridge Hall: red brick, white cornice + string course, columned portico, hip roof."""
    s = []
    rl = (x + d / 2 + 10, y - e / 2 - 9)
    rr = (x + w + d / 2 - 10, y - e / 2 - 9)
    s.append(poly("sk-roof", [(x - 2, y + 0.5), (x + d - 1, y - e), rl]))
    s.append(poly("sk-roof-s", [(x + w + 2, y + 0.5), (x + w + d + 1, y - e), rr]))
    s.append(poly("sk-roof", [(x - 2, y + 0.5), (x + w + 2, y + 0.5), rr, rl]))
    s.append(rect("sk-redbrick", x, y, w, BASE - y))
    s.append(skew(x + w, d, e, [rect("sk-redbrick-s", 0, y, d, BASE - y + e),
                                rect("sk-trim-s", 0, y, d, 3),
                                *windows("sk-p-stbs", 0, y + 7, d, 60, d / 2, 13,
                                         (2.5, 2, 3.2, 7.5), cls="sk-win-s")]))
    pattern("sk-p-stbf", x + 2, y + 6, 11, 13, [rect("sk-trim", 3, 2, 5, 8.6)])
    s.append(prect("sk-p-stbf", x + 2, y + 6, w - 4, 60))
    s += windows("sk-p-stb", x + 2, y + 6, w - 4, 60, 11, 13, (3.8, 2.8, 3.4, 7), off=(4, 3, 4))
    s.append(rect("sk-trim", x - 1.5, y, w + 3, 3.2))
    s.append(rect("sk-trim", x, y + 20, w, 1.6))
    # portico: attic block over six columns
    px = x + w / 2 - 15
    s.append(rect("sk-redbrick-s", px, y + 8, 30, BASE - y - 8))
    s.append(rect("sk-trim", px - 2, y - 8, 34, 16))
    s.append(rect("sk-trim-s", px - 2, y + 6.5, 34, 1.5))
    for i in range(6):
        cx = px + 1.2 + i * 5.5
        s += [rect("sk-trim", cx, y + 8, 2.6, BASE - y - 8), rect("sk-trim-s", cx + 1.7, y + 8, 0.9, BASE - y - 8)]
    return s


def rake(cls, a, b, t=1.6):
    """Thin sandstone strip along a gable edge from a to b."""
    (x1, y1), (x2, y2) = a, b
    return poly(cls, [(x1, y1), (x2, y2), (x2, y2 + t), (x1, y1 + t)])


def chapel():
    """Old Chapel: two front gables with the bell tower between them."""
    s = []
    # left wing: gable with oculus, four arched windows, chimney at the peak
    lx, lw, ly, lpk = 418, 50, 178, (443, 146)
    s.append(poly("sk-roof-s", [lpk, (lx + lw, ly), (lx + lw + 22, ly - 9), (lpk[0] + 22, lpk[1] - 9)]))
    s.append(rect("sk-stone-s", lpk[0] - 2, 135, 5, 11))
    s.append(rect("sk-sand", lpk[0] - 2.6, 134, 6.2, 2))
    s.append(poly("sk-stone", [(lx, BASE), (lx, ly), lpk, (lx + lw, ly), (lx + lw, BASE)]))
    s += [rake("sk-sand", (lx - 1, ly + 0.5), lpk), rake("sk-sand", lpk, (lx + lw + 1, ly + 0.5))]
    s += [circle("sk-sand", lpk[0], 160, 4.6), circle("sk-win", lpk[0], 160, 3)]
    s += [rect("sk-sand", lx, ly - 0.5, lw, 1.8), rect("sk-sand", lx, 198, lw, 1.6)]
    for i in range(4):
        s.append(framed_arch(lx + 6 + i * 10.5, 183, 4.6, 195))
    # right wing: gable with a stepped triplet of arched windows, finial
    rx, rw, ry, rpk = 496, 50, 182, (521, 150)
    s.append(poly("sk-roof-s", [rpk, (rx + rw, ry), (rx + rw + 26, ry - 10), (rpk[0] + 26, rpk[1] - 10)]))
    s.append(skew(rx + rw, 26, 10, [rect("sk-stone-s", 0, ry, 26, BASE - ry + 10),
                                    rect("sk-sand", 0, ry - 0.5, 26, 1.8),
                                    arch("sk-win-s", 6, ry + 8, 5, ry + 30),
                                    arch("sk-win-s", 15, ry + 8, 5, ry + 30)]))
    s.append(poly("sk-stone", [(rx, BASE), (rx, ry), rpk, (rx + rw, ry), (rx + rw, BASE)]))
    s += [rake("sk-sand", (rx - 1, ry + 0.5), rpk), rake("sk-sand", rpk, (rx + rw + 1, ry + 0.5))]
    s += [rect("sk-sand", rpk[0] - 0.9, rpk[1] - 6, 1.8, 6), circle("sk-sand", rpk[0], rpk[1] - 6.5, 1.4)]
    s += [rect("sk-sand", rx, ry - 0.5, rw, 1.8), rect("sk-sand", rx, 200, rw, 1.6)]
    s += [framed_arch(rpk[0] - 3, 160, 6, 197), framed_arch(rpk[0] - 13, 168, 5, 197),
          framed_arch(rpk[0] + 8, 168, 5, 197)]
    # steeple: square spire set diagonally, so one corner faces us; sandstone ribs
    tx, tw, ttop, td, te = 468, 28, 112, 8, 3
    apex, lc, fc, rc = (486, 48), (470, 104), (486, 108), (502, 104)
    s += [poly("sk-stone", [lc, fc, apex]), poly("sk-stone-s", [fc, rc, apex])]
    s += [path("sk-rib", f"M{lc[0]},{lc[1]}L{apex[0]},{apex[1]}L{rc[0]},{rc[1]}M{fc[0]},{fc[1]}L{apex[0]},{apex[1]}")]
    s += [rect("sk-roof-s", apex[0] - 0.6, apex[1] - 11, 1.2, 11), rect("sk-roof-s", apex[0] - 2.5, apex[1] - 8, 5, 1)]
    # bell tower shaft: sandstone bands, corbel table, small window, belfry, clock gables
    s.append(skew(tx + tw, td, te, [
        rect("sk-stone-s", 0, ttop, td, BASE - ttop + te),
        rect("sk-sand", 0, 118, td, 2), rect("sk-sand", 0, 148, td, 2.5), rect("sk-sand", 0, 170, td, 2),
        arch("sk-win-off", 1.6, 124, 4.8, 146),
        poly("sk-sand", [(-0.5, ttop + 1), (td + 0.5, ttop + 1), (td / 2, ttop - 12)]),
        poly("sk-stone-s", [(1, ttop), (td - 1, ttop), (td / 2, ttop - 9)]),
    ]))
    s.append(rect("sk-stone", tx, ttop, tw, BASE - ttop))
    s += [rect("sk-sand", tx, 118, tw, 2), rect("sk-sand", tx, 148, tw, 2.5), rect("sk-sand", tx, 170, tw, 2),
          rect("sk-sand", tx, 200, tw, 2)]
    s += [rect("sk-sand", tx + 1.5 + i * 3, 172, 1.5, 2.2) for i in range(9)]
    s.append(framed_arch(tx + 11.5, 177, 5, 191))
    s += [framed_arch(tx + 3.5, 124, 7, 146, win="sk-win-off", t=1.3),
          framed_arch(tx + 17.5, 124, 7, 146, win="sk-win-off", t=1.3)]
    cx, cy = tx + tw / 2, 106
    s += [poly("sk-sand", [(tx - 1.5, ttop + 1), (tx + tw + 1.5, ttop + 1), (cx, 93)]),
          poly("sk-stone", [(tx + 1.5, ttop), (tx + tw - 1.5, ttop), (cx, 96.5)])]
    s += [circle("sk-sand", cx, cy, 5.6), circle("sk-clock", cx, cy, 4.4),
          path("sk-hands", f"M{f(cx)},{cy}v-3M{f(cx)},{cy}h2.4")]
    return s


def campus_center(x=610, y=146, w=102, d=18, e=7):
    """Campus Center: concrete slab of deep punched windows, two cantilevered top floors."""
    s = [rect("sk-cc", x, y, w, BASE - y)]
    pattern("sk-p-ccf", x + 5, y + 6, 7, 8.5, [rect("sk-cc-s", 1.2, 1.6, 4.6, 5.6)])
    s.append(prect("sk-p-ccf", x + 5, y + 6, w - 8, BASE - y - 6))
    s += windows("sk-p-cc", x + 5, y + 6, w - 8, BASE - y - 6, 7, 8.5, (1.8, 2.4, 3.4, 4), off=(5, 4, 9))
    s.append(skew(x + w, d, e, [rect("sk-cc-s", 0, y, d, BASE - y + e),
                                *windows("sk-p-ccs", 1, y + 6, d - 2, BASE - y, 4, 8.5,
                                         (1, 2.4, 2, 4), cls="sk-win-s")]))
    # cantilevered top floors with dark ribbon windows; shadow line underneath
    tx, ty, tw = x - 4, y - 18, w + 8
    s.append(rect("sk-cc-s", x, y, w, 3))
    s += box("sk-cc", "sk-cc-s", "sk-top", tx, ty, tw, d, e, base=y)
    s += [rect("sk-ribbon", tx + 2, ty + 4, tw - 4, 4.5), rect("sk-ribbon", tx + 2, ty + 11.5, tw - 4, 4.5)]
    s.append(skew(tx + tw, d, e, [rect("sk-ribbon", 1, ty + 4, d - 2, 4.5), rect("sk-ribbon", 1, ty + 11.5, d - 2, 4.5)]))
    # solid stair core at the end, a little taller, with a vertical slot
    cw, ct = 14, ty - 6
    s += [poly("sk-cc-s", [(x - 12 + cw, ct), (x - 12 + cw + d, ct - e), (x - 12 + cw + d, ty - e), (x - 12 + cw, ty)]),
          rect("sk-cc", x - 12, ct, cw, BASE - ct),
          poly("sk-top", [(x - 12, ct), (x - 12 + d, ct - e), (x - 12 + cw + d, ct - e), (x - 12 + cw, ct)]),
          rect("sk-cc-s", x - 6, ty + 10, 1.6, BASE - ty - 14)]
    return s


def du_bois(x=806, y=22, w=66, d=20, e=7):
    """W. E. B. Du Bois Library: 7 deep bays per face, crown with notched bay tops."""
    s = box("sk-brick", "sk-brick-s", "sk-top", x, y, w, d, e)
    pier, bay = 5, (w - 40) / 7
    pitch = pier + bay
    for i in range(7):
        bx = x + pier + i * pitch
        s.append(poly("sk-recess", [(bx, BASE), (bx, 52), (bx + bay / 2, 44), (bx + bay, 52), (bx + bay, BASE)]))
        s += [rect("sk-win", bx + 0.9, 53.5, bay - 1.8, 8), rect("sk-cream", bx, 62.5, bay, 3)]
    win = (0, 0, bay - 1.8, 5.3)
    s += windows("sk-p-db", x + pier + 0.9, 67, 7 * pitch - pier, BASE - 67, pitch, 7.3, win, off=(3, 5, 7))
    # side face: the same bays, foreshortened
    sp = d / 7
    pattern("sk-p-dbs", 0, 52, sp, 7.3, [rect("sk-recess-s", sp * 0.3, 0, sp * 0.45, 7.3),
                                        rect("sk-win-s", sp * 0.4, 1, sp * 0.25, 5.3)])
    s.append(skew(x + w, d, e, [prect("sk-p-dbs", 0, 52, d, BASE - 52 + e)]))
    s += [rect("sk-trim", x, y, w, 1.4), rect("sk-brick-s", x, y, 1.4, BASE - y)]
    # antenna with an aircraft warning light
    s += [rect("sk-roof-s", x + 52, y - 18, 1, 15), circle("sk-beacon", x + 52.5, y - 18, 1.5)]
    return s


def lederle(x=982):
    """Lederle Graduate Research Tower: punched-window block between solid service shafts."""
    s = []
    bx, by, bw, d, e = x + 13, 80, 44, 14, 5
    s += box("sk-lgrt", "sk-lgrt-s", "sk-top", bx, by, bw, d, e)
    s += windows("sk-p-lg", bx + 2, by + 6, bw - 4, BASE - by - 6, 4.4, 7, (1.3, 2.2, 1.8, 3.4), off=(5, 4, 8))
    s += [rect("sk-lgrt-s", bx + 12, by - 8, 12, 6), rect("sk-lgrt-s", bx + 27, by - 5, 6, 3)]
    # two stepped shafts on the left, one on the right that carries the side face
    s += [rect("sk-lgrt", x + 6, 73, 7, BASE - 73),
          poly("sk-top", [(x + 6, 73), (x + 10, 71.5), (x + 17, 71.5), (x + 13, 73)]),
          rect("sk-lgrt", x, 67, 7, BASE - 67), rect("sk-lgrt-s", x + 6.2, 73, 0.8, BASE - 73),
          poly("sk-top", [(x, 67), (x + 4, 65.5), (x + 11, 65.5), (x + 7, 67)]),
          poly("sk-lgrt-s", [(x + 7, 67), (x + 11, 65.5), (x + 11, 71.5), (x + 7, 73)])]
    s += box("sk-lgrt", "sk-lgrt-s", "sk-top", bx + bw, 76, 9, d, e)
    return s


def lgrc_lowrise(x=1070, y=176, w=56, d=14, e=5):
    s = box("sk-lgrt", "sk-lgrt-s", "sk-top", x, y, w, d, e)
    for i in range(4):
        yy = y + 7 + i * 12
        s.append(rect("sk-win", x + 3, yy, w - 6, 3.5))
        for _ in range(2):
            s.append(rect("sk-win-off", x + 3 + rng.uniform(0, w - 20), yy, rng.uniform(6, 12), 3.5))
    s.append(skew(x + w, d, e, [rect("sk-win-s", 2, y + 7 + i * 12, d - 4, 3.5) for i in range(4)]))
    return s


def cs_building(x=1158, y=186, w=132):
    """Computer Science building: silver panels, ribbon windows, angled ends, blue center bay."""
    s = []
    le, re = (x - 20, y + 4), (x + w + 22, y + 4)
    s.append(poly("sk-panel", [(le[0], BASE), le, (x, y), (x, BASE)]))
    s.append(poly("sk-panel-s", [(x + w, BASE), (x + w, y), re, (re[0], BASE)]))
    s.append(rect("sk-panel", x, y, w, BASE - y))
    pattern("sk-p-csj", x, y, 11, 10, [rect("sk-panel-line", 0, 0, 0.7, 10)])
    s.append(prect("sk-p-csj", x, y, w, BASE - y))
    for i in range(3):
        yy = y + 6 + i * 13.5
        s += [rect("sk-ribbon", x, yy, w, 4),
              poly("sk-ribbon", [(le[0], yy + 4), (x, yy), (x, yy + 4), (le[0], yy + 8)]),
              poly("sk-ribbon-s", [(x + w, yy), (re[0], yy + 4), (re[0], yy + 8), (x + w, yy + 4)])]
    off = [rect("sk-ribbon-off", rng.uniform(0, 34), r * 13.5, rng.uniform(7, 12), 4) for r in range(3)]
    pattern("sk-p-cso", x, y + 6, 44, 40.5, off)
    s.append(prect("sk-p-cso", x, y + 6, w, 40.5))
    # slightly projecting blue center bay with square windows
    s.append(rect("sk-panel-blue", x + 54, y - 3, 26, BASE - y + 3))
    s += windows("sk-p-csb", x + 56, y + 3, 22, 45, 6.5, 13.5, (1.5, 3, 3.5, 4.5), off=(3, 3, 3))
    s += [poly("sk-trim", [le, (x, y), (x, y + 1.5), (le[0], le[1] + 1.5)]), rect("sk-trim", x, y - 0.5, w, 1.5),
          poly("sk-trim-s", [(x + w, y), re, (re[0], re[1] + 1.5), (x + w, y + 1.5)])]
    return s


# ---------------------------------------------------------------- trees
LOW_BUILDINGS = [(240, 400), (1060, 1330)]


def tree_scale(x):
    return 0.72 if any(a - 20 < x < b + 20 for a, b in LOW_BUILDINGS) else 1.0


def tree_row(x0, x1, step, rmin, rmax, ground, cls, tall_p=0.0):
    shade, lit = [], []
    x = x0
    while x < x1:
        r = rng.uniform(rmin, rmax) * tree_scale(x)
        if rng.random() < tall_p:
            rx, ry = r * 0.78, r * 1.18
        else:
            rx, ry = r, r * 0.92
        cy = ground - ry * 0.4
        shade.append(f'<ellipse cx="{f(x)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}"/>')
        lit.append(f'<ellipse cx="{f(x - rx * 0.17)}" cy="{f(cy - ry * 0.18)}" '
                   f'rx="{f(rx * 0.8)}" ry="{f(ry * 0.8)}"/>')
        x += rng.uniform(*step)
    return (f'<g class="{cls}-s">{"".join(shade)}</g>'
            f'<g class="{cls}">{"".join(lit)}</g>')


# ---------------------------------------------------------------- palette
STYLE = """
.skyline{
  --sk-hill-far:#efebe3;--sk-hill:#e7e2d7;
  --sk-brick:#c68f78;--sk-brick-s:#a87563;--sk-recess:#9c6a58;--sk-recess-s:#845847;--sk-cream:#eadfc8;
  --sk-redbrick:#b5735f;--sk-redbrick-s:#96604f;--sk-swbrick:#8f6a5c;--sk-swbrick-s:#77584c;
  --sk-tan:#ddd2bc;--sk-tan-s:#c2b59c;--sk-stone:#d3cfc8;--sk-stone-s:#b0aba2;--sk-sand:#a8654f;
  --sk-roof:#6c7181;--sk-roof-s:#555968;--sk-cc:#cac7c0;--sk-cc-s:#aba79f;--sk-lgrt:#ece5d4;--sk-lgrt-s:#d1c8b4;
  --sk-panel:#e5e8eb;--sk-panel-s:#c4c9ce;--sk-panel-blue:#a9bccb;--sk-panel-line:#d5d9dd;--sk-top:#ebe5da;
  --sk-win:#8398ab;--sk-win-s:#708497;--sk-win-off:#788d9f;--sk-ribbon:#62778a;--sk-ribbon-s:#566a7c;--sk-ribbon-off:#62778a;
  --sk-trim:#f4efe7;--sk-trim-s:#d9d1c4;--sk-clock:#f8f5ef;--sk-hands:#3b3f4a;--sk-beacon:#c0503f;
  --sk-tree-b:#8ba385;--sk-tree-b-s:#718b6b;--sk-tree-f:#6b8765;--sk-tree-f-s:#546e4f;
  --sk-speck:#2a221d;--sk-speck-o:.42;--sk-night:0;--sk-star:#e6f1ff;--sk-moon:#f3e7c4;
}
html.dark-theme .skyline,html[data-theme="dark"] .skyline{
  --sk-hill-far:#152139;--sk-hill:#19273f;
  --sk-brick:#4d3a42;--sk-brick-s:#3b2d36;--sk-recess:#33262f;--sk-recess-s:#2a2029;--sk-cream:#4e566b;
  --sk-redbrick:#4a3540;--sk-redbrick-s:#392a34;--sk-swbrick:#3d3139;--sk-swbrick-s:#30272f;
  --sk-tan:#3e4659;--sk-tan-s:#30374a;--sk-stone:#3c4458;--sk-stone-s:#2d3446;--sk-sand:#5a3d45;
  --sk-roof:#232c41;--sk-roof-s:#1a2235;--sk-cc:#353e52;--sk-cc-s:#2a3244;--sk-lgrt:#39445a;--sk-lgrt-s:#2c3549;
  --sk-panel:#36425a;--sk-panel-s:#2a3449;--sk-panel-blue:#2c3d58;--sk-panel-line:#2f3a50;--sk-top:#2c364a;
  --sk-win:#f2c46b;--sk-win-s:#d6a656;--sk-win-off:#1c2538;--sk-ribbon:#e9bb66;--sk-ribbon-s:#c99a50;--sk-ribbon-off:#1c2538;
  --sk-trim:#4b5772;--sk-trim-s:#3a4560;--sk-clock:#f6e7b8;--sk-hands:#3a2f2a;--sk-beacon:#ff5a4a;
  --sk-tree-b:#26443f;--sk-tree-b-s:#1e3733;--sk-tree-f:#203b36;--sk-tree-f-s:#182e2a;
  --sk-speck:#000;--sk-speck-o:.5;--sk-night:1;
}
.sk-hill-far{fill:var(--sk-hill-far)}.sk-hill{fill:var(--sk-hill)}
.sk-brick{fill:var(--sk-brick)}.sk-brick-s{fill:var(--sk-brick-s)}
.sk-recess{fill:var(--sk-recess)}.sk-recess-s{fill:var(--sk-recess-s)}.sk-cream{fill:var(--sk-cream)}
.sk-redbrick{fill:var(--sk-redbrick)}.sk-redbrick-s{fill:var(--sk-redbrick-s)}
.sk-swbrick{fill:var(--sk-swbrick)}.sk-swbrick-s{fill:var(--sk-swbrick-s)}
.sk-tan{fill:var(--sk-tan)}.sk-tan-s{fill:var(--sk-tan-s)}
.sk-stone{fill:var(--sk-stone)}.sk-stone-s{fill:var(--sk-stone-s)}.sk-sand{fill:var(--sk-sand)}
.sk-roof{fill:var(--sk-roof)}.sk-roof-s{fill:var(--sk-roof-s)}
.sk-cc{fill:var(--sk-cc)}.sk-cc-s{fill:var(--sk-cc-s)}.sk-lgrt{fill:var(--sk-lgrt)}.sk-lgrt-s{fill:var(--sk-lgrt-s)}
.sk-panel{fill:var(--sk-panel)}.sk-panel-s{fill:var(--sk-panel-s)}.sk-panel-blue{fill:var(--sk-panel-blue)}
.sk-panel-line{fill:var(--sk-panel-line)}.sk-top{fill:var(--sk-top)}
.sk-win{fill:var(--sk-win)}.sk-win-s{fill:var(--sk-win-s)}.sk-win-off{fill:var(--sk-win-off)}
.sk-ribbon{fill:var(--sk-ribbon)}.sk-ribbon-s{fill:var(--sk-ribbon-s)}.sk-ribbon-off{fill:var(--sk-ribbon-off)}
.sk-trim{fill:var(--sk-trim)}.sk-trim-s{fill:var(--sk-trim-s)}.sk-clock{fill:var(--sk-clock)}
.sk-hands{fill:none;stroke:var(--sk-hands);stroke-width:1;stroke-linecap:round}
.sk-rib{fill:none;stroke:var(--sk-sand);stroke-width:1.3;stroke-linejoin:round}
.sk-beacon{fill:var(--sk-beacon)}
.sk-tree-b{fill:var(--sk-tree-b)}.sk-tree-b-s{fill:var(--sk-tree-b-s)}
.sk-tree-f{fill:var(--sk-tree-f)}.sk-tree-f-s{fill:var(--sk-tree-f-s)}
.sk-speck{flood-color:var(--sk-speck);flood-opacity:var(--sk-speck-o)}
.sk-night{opacity:var(--sk-night)}.sk-star{fill:var(--sk-star)}.sk-moon{fill:var(--sk-moon)}
.skyline *{transition:fill .3s ease,stroke .3s ease,opacity .3s ease}
.skyline.sk-focus .sk-bldg:not(.sk-on){opacity:.45}
""".strip()


def grain(fid, k, t, freq):
    """Speckle grain: thresholded noise, tinted by --sk-speck, clipped to the shapes."""
    return (f'<filter id="{fid}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">'
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="2" seed="4"/>'
            f'<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 {k} 0 0 0 {-k * t:.3f}" result="a"/>'
            f'<feFlood class="sk-speck"/>'
            f'<feComposite in2="a" operator="in"/>'
            f'<feComposite in2="SourceGraphic" operator="in" result="s"/>'
            f'<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s"/></feMerge></filter>')


def named(name, shapes):
    return f'<g class="sk-bldg" data-name="{name}">{"".join(shapes)}</g>'


def main(out_path):
    sky = night_sky()
    hl = hills()
    sw = "Southwest Residential Area"
    back_bldg = named(sw, southwest_tower(96, 84, "sk-p-sw2", w=40, d=12))
    bldg = "".join([
        named(sw, southwest_tower(150, 64, "sk-p-sw1")),
        named("Stockbridge Hall", stockbridge()),
        named("Old Chapel", chapel()),
        named("Murray D. Lincoln Campus Center", campus_center()),
        named("W. E. B. Du Bois Library", du_bois()),
        named("Lederle Graduate Research Tower", lederle()),
        named("Lederle Graduate Research Center", lgrc_lowrise()),
        named("Computer Science Building", cs_building()),
    ])
    back = tree_row(WING_L, WING_R, (24, 36), 14, 23, 228, "sk-tree-b", tall_p=0.18)
    front = tree_row(WING_L + 10, WING_R, (22, 34), 16, 27, 250, "sk-tree-f")

    defs.insert(0, grain("sk-grain", 2.6, 0.56, 0.9))
    defs.insert(1, grain("sk-grain-strong", 3.2, 0.5, 0.9))

    svg = (
        f'<svg class="skyline" xmlns="http://www.w3.org/2000/svg" viewBox="{VIEW_X} 0 {VIEW_W} {BASE}" '
        'preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">\n'
        "<!-- Generated by scripts/skyline.py; edit that and re-run. Colors are CSS variables "
        "(top of <style>): light theme = day, dark theme = night. -->\n"
        f"<style>{STYLE}</style>\n"
        f"<defs>{''.join(defs)}</defs>\n"
        f"<!-- night sky (dark theme only) -->\n<g pointer-events=\"none\">{sky}</g>\n"
        f"<!-- Holyoke Range -->\n<g filter=\"url(#sk-grain)\" pointer-events=\"none\">{hl}</g>\n"
        f"<!-- campus: one labelled group per building -->\n<g filter=\"url(#sk-grain)\">"
        f"<g opacity=\".8\">{back_bldg}</g>{bldg}</g>\n"
        f"<!-- trees (ignore the pointer so buildings behind them still get their label) -->\n"
        f"<g filter=\"url(#sk-grain-strong)\" pointer-events=\"none\">{back}"
        f"{rect('sk-tree-f-s', WING_L, 234, WING_R - WING_L, BASE - 234 + 2)}{front}</g>\n"
        "</svg>\n"
    )
    with open(out_path, "w") as fh:
        fh.write(svg)
    print(f"wrote {out_path}: {len(svg) / 1024:.1f} KB")


if __name__ == "__main__":
    main(sys.argv[1])
