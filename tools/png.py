"""Minimal PNG reader (truecolour, 8-bit, non-interlaced) — enough to sample
pixels out of Chromium screenshots without a third-party dependency."""
import struct
import zlib


def read(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"
    pos, idat, meta = 8, b"", None
    while pos < len(data):
        ln, typ = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, depth, colour = struct.unpack(">IIBB", body[:10])
            meta = (w, h, depth, colour)
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
        pos += 12 + ln

    w, h, depth, colour = meta
    assert depth == 8 and colour in (2, 6), f"unsupported png {depth}/{colour}"
    nch = 3 if colour == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * nch
    out, prev = [], bytearray(stride)
    p = 0
    for _ in range(h):
        f = raw[p]
        line = bytearray(raw[p + 1:p + 1 + stride])
        p += 1 + stride
        for i in range(stride):
            a = line[i - nch] if i >= nch else 0
            b = prev[i]
            c = prev[i - nch] if i >= nch else 0
            x = line[i]
            if f == 1:
                x += a
            elif f == 2:
                x += b
            elif f == 3:
                x += (a + b) // 2
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                x += a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
            line[i] = x & 0xFF
        out.append(line)
        prev = line
    return w, h, nch, out


def pixel(img, x, y):
    w, h, nch, rows = img
    i = x * nch
    return tuple(rows[y][i:i + 3])
