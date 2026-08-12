#!/usr/bin/env python3
"""Measure the hero across viewports in headless Chromium.

Asserts the properties the layout is supposed to guarantee: no scrollbars, the
hero filling exactly one viewport edge to edge, the glow reaching the right
edge at every width, and the artboard's column split holding.

Copies src/ to a scratch dir, injects probe.js, serves it, renders at each
viewport and reads the measurements back out of --dump-dom. Standard library
only; the sole external requirement is a Chromium binary.

  python3 tools/verify-layout.py              measure and assert
  python3 tools/verify-layout.py --shots      also write screenshots
  python3 tools/verify-layout.py --sections   add a second section, prove
                                              stacking does not break the hero
"""
import http.server
import json
import os
import re
import shutil
import socketserver
import subprocess
import sys
import threading

import png

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "src")
SITE = os.path.join(HERE, ".probe-site")
SHOTS = os.path.join(HERE, ".shots")
PORT = 8137


def find_chrome():
    env = os.environ.get("CHROME")
    if env and os.path.exists(env):
        return env
    names = ["chromium", "chromium-browser", "google-chrome", "chrome"]
    for n in names:
        p = shutil.which(n)
        if p:
            return p
    # Playwright's managed download, as used in CI images.
    root = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
    if os.path.isdir(root):
        for d in sorted(os.listdir(root), reverse=True):
            p = os.path.join(root, d, "chrome-linux", "chrome")
            if os.path.exists(p):
                return p
    sys.exit("No Chromium found. Set CHROME=/path/to/chrome.")


CHROME = find_chrome()

VIEWPORTS = [
    (1280, 800), (1280, 1024), (1366, 768), (1440, 900), (1536, 864),
    (1600, 900), (1920, 1080), (2560, 1440), (3440, 1440),
]

EXTRA_SECTION = """
<section class="section" id="probe-next" style="min-height:40vh">
  <p style="padding:2rem">probe: second section</p>
</section>
"""


def build_site(with_sections=False):
    if os.path.isdir(SITE):
        shutil.rmtree(SITE)
    shutil.copytree(SRC, SITE)
    shutil.copy(os.path.join(HERE, "probe.js"), os.path.join(SITE, "probe.js"))
    p = os.path.join(SITE, "index.html")
    html = open(p).read()
    if with_sections:
        html = html.replace("</main>", EXTRA_SECTION + "</main>")
    html = html.replace("</body>", '<script src="probe.js"></script>\n</body>')
    open(p, "w").write(html)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SITE, **kw)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


# Headless reserves window frame out of --window-size, so the viewport comes
# out short. Pad the request so the measured viewport equals the target.
FRAME_H = 87


def measure(w, h, shot=False):
    args = [
        CHROME, "--headless", "--no-sandbox", "--disable-gpu",
        "--force-device-scale-factor=1",
        "--virtual-time-budget=6000",
        f"--window-size={w},{h + FRAME_H}",
    ]
    if shot:
        os.makedirs(SHOTS, exist_ok=True)
        args.append(f"--screenshot={os.path.join(SHOTS, f'{w}x{h}.png')}")
    args += ["--dump-dom", f"http://127.0.0.1:{PORT}/"]
    for _ in range(3):
        out = subprocess.run(args, capture_output=True, text=True, timeout=120).stdout
        m = re.search(r'<pre id="probe">(.*?)</pre>', out, re.S)
        if m:
            return json.loads(m.group(1)
                              .replace("&amp;", "&")
                              .replace("&lt;", "<")
                              .replace("&gt;", ">"))
    return None


def check(d, stacked=False):
    """Returns list of failure strings.

    Horizontal comparisons use clientWidth, not innerWidth: once the page is
    taller than one viewport a scrollbar exists, and innerWidth still counts
    the space it occupies. The layout viewport is what the CSS lays out into."""
    f = []
    vw, vh, cw = d["vw"], d["vh"], d["clientW"]

    if d["scrollW"] > cw:
        f.append(f"h-scroll ({d['scrollW']}>{cw})")

    # Each section still settles to exactly one viewport. The page is taller
    # than the sum of them now: the signal section is pinned inside a track that
    # provides a screen of scroll for the morph, so total scroll height is not
    # the assertion any more — the per-section heights below are.

    for name, key in (("hero", "hero"), ("signal", "signal")):
        b = d.get(key)
        if not b:
            continue
        if abs(b["l"]) > 0.5 or abs(b["r"] - cw) > 0.5:
            f.append(f"{name} not full-bleed (l={b['l']} r={b['r']} cw={cw})")
        if abs(b["h"] - vh) > 1.5:
            f.append(f"{name} height {b['h']} != vh {vh}")

    glow = d.get("glow")
    if glow and abs(glow["r"] - cw) > 0.5:
        f.append(f"DEAD BAND: glow right {glow['r']} != content edge {cw}")

    # The board holds the artboard's 328 / 407 / 407 column split. Measured as
    # laid-out widths: the morph transforms column one, so its painted rect is
    # not its layout width until the scrub completes.
    cl = d.get("colLayout")
    if cl and len(cl) == 3 and cl[1]:
        if abs(cl[0] / cl[1] - 328 / 407) > 0.01:
            f.append(f"board col1/col2 {cl[0] / cl[1]:.4f} != 0.8059")
        if abs(cl[2] / cl[1] - 1) > 0.01:
            f.append(f"board col3/col2 {cl[2] / cl[1]:.4f} != 1")

    return f


def check_pixels(w, h):
    """The glow must actually paint to the right edge, not merely measure to it.
    Sampled 30px in, clear of the overlaid scrollbar headless draws."""
    path = os.path.join(SHOTS, f"{w}x{h}.png")
    if not os.path.exists(path):
        return []
    img = png.read(path)
    y = h // 2
    right = png.pixel(img, w - 30, y)
    left = png.pixel(img, 40, y)
    if max(right) - max(left) < 30:
        return [f"glow not painting at right edge (r={right} vs bg={left})"]
    return []


def main():
    shots = "--shots" in sys.argv
    sections = "--sections" in sys.argv
    build_site(with_sections=sections)
    httpd = serve()
    try:
        rows, allfail = [], 0
        for w, h in VIEWPORTS:
            d = measure(w, h, shot=shots)
            if not d:
                print(f"{w}x{h}: PROBE FAILED")
                allfail += 1
                continue
            fails = check(d, stacked=sections)
            if shots and not sections:
                fails += check_pixels(w, h)
            allfail += len(fails)
            rows.append((w, h, d, fails))

        print(f"{'viewport':>11} | {'--u':>7} | {'grid w':>8} | {'panel%':>6} | "
              f"{'gap R':>6} | {'title px':>8} | status")
        print("-" * 82)
        for w, h, d, fails in rows:
            grid = d["grid"] or {}
            panel = d["panel"] or {}
            glow = d["glow"] or {}
            pct = (panel.get("w", 0) / grid.get("w", 1) * 100) if grid.get("w") else 0
            gap = w - glow.get("r", w)
            status = "ok" if not fails else "; ".join(fails)
            print(f"{w:>5}x{h:<5} | {d['u'] or 0:7.4f} | {grid.get('w', 0):8.1f} | "
                  f"{pct:5.2f}% | {gap:6.1f} | {d['fsTitle'] or '-':>8} | {status}")
            if d["errs"]:
                print(f"    console errors: {d['errs']}")
        print()
        if sections:
            print("(--sections: page scrolls; asserted no h-overflow, glow at "
                  "content edge, hero still one viewport tall)")
        print("FAILURES:", allfail)
        return 1 if allfail else 0
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    sys.exit(main())
