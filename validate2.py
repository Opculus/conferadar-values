#!/usr/bin/env python3
"""
Module 2 validation harness.

Same three diagnostics as validate.py, run per bucket over that bucket's
8 axes and its named sub-ideology anchors:
  1. Pairwise anchor separation  (the axis-design test: a collision means the
     axis set is missing a dimension, not that the anchors are close)
  2. Monte Carlo self-routing under Gaussian noise
  3. Named test profiles

Usage:  python3 validate2.py [bucket_id ...]
"""

import json, math, os, random, itertools, sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def _load_buckets():
    """Reshape module2-axes.json's {buckets: {"1": {...}, ...}} into the
    per-bucket dict shape (axes/subs/umbrella/profiles) this harness expects.

    Originally this loaded from m2_data_a/b/c.py + q_b01.py, source modules
    that were never checked into this project (see MODULE2-NOTES.md §7).
    module2-axes.json carries the same axes + anchors, so it's the source of
    truth now. It has no named test-profile answer sheets, so check_profiles
    below is a no-op (0/0) rather than a removed diagnostic.
    """
    with open(os.path.join(ROOT, "module2-axes.json"), encoding="utf-8") as f:
        raw = json.load(f)["buckets"]
    buckets = []
    for b in sorted(raw, key=lambda b: b["id"]):
        axes = [(a["key"], a["name"]) for a in b["axes"]]
        axis_keys = [k for k, _ in axes]
        subs = {
            s["name"]: tuple(s["anchor"][k] for k in axis_keys)
            for s in b["subIdeologies"]
        }
        umbrella = [s["name"] for s in b["subIdeologies"] if s.get("umbrella")]
        buckets.append({
            "id": b["id"],
            "name": b["name"],
            "axes": axes,
            "subs": subs,
            "umbrella": umbrella,
            "profiles": {},
        })
    return buckets


BUCKETS = _load_buckets()

NDIM = 8
MAXD = math.sqrt(NDIM * 100 ** 2)          # 282.84
MIN_PAIR_OK = 35.0
MIN_PAIR_FATAL = 25.0
MC_TARGETS = {10: 0.95, 15: 0.85}
MC_BUCKET_FLOOR = 0.60


def dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def route(v, anchors, n=3):
    r = sorted((dist(v, a), nm) for nm, a in anchors.items())
    return [(100 * (1 - d / MAXD), nm) for d, nm in r[:n]]


def check_shape(b):
    ok = True
    if len(b["axes"]) != NDIM:
        print(f"  !! {len(b['axes'])} axes, expected {NDIM}")
        ok = False
    keys = [a[0] for a in b["axes"]]
    if len(set(keys)) != len(keys):
        print("  !! duplicate axis keys")
        ok = False
    for nm, v in b["subs"].items():
        if len(v) != NDIM:
            print(f"  !! {nm}: vector length {len(v)}")
            ok = False
        if any(not (0 <= x <= 100) for x in v):
            print(f"  !! {nm}: value out of range")
            ok = False
    for nm in b.get("umbrella", []):
        if nm not in b["subs"]:
            print(f"  !! umbrella '{nm}' not in subs")
            ok = False
    for nm, (v, exp) in b.get("profiles", {}).items():
        if len(v) != NDIM:
            print(f"  !! profile {nm}: vector length {len(v)}")
            ok = False
        if exp not in b["subs"]:
            print(f"  !! profile {nm}: expected '{exp}' not a sub-ideology")
            ok = False
    return ok


def check_pairs(b, verbose=True):
    scored = {k: v for k, v in b["subs"].items() if k not in b.get("umbrella", [])}
    pairs = sorted((dist(a, c), x, y)
                   for (x, a), (y, c) in itertools.combinations(scored.items(), 2))
    if verbose:
        for d_, x, y in pairs[:5]:
            flag = ("  <-- FATAL" if d_ < MIN_PAIR_FATAL else
                    "  <-- fragile" if d_ < MIN_PAIR_OK else "")
            print(f"    {d_:6.1f}  {x}  <->  {y}{flag}")
    mean = sum(p[0] for p in pairs) / len(pairs)
    print(f"    min {pairs[0][0]:.1f} | mean {mean:.1f} | n_pairs {len(pairs)}"
          f"   {'PASS' if pairs[0][0] >= MIN_PAIR_OK else 'REVIEW'}")
    return pairs


def check_mc(b, sigmas=(10, 15, 20), n=3000, seed=0):
    anchors = b["subs"]
    rng = random.Random(seed)
    names = list(anchors)
    out = {}
    for sigma in sigmas:
        acc, hits, tot = {}, 0, 0
        for nm in names:
            a = anchors[nm]
            h = 0
            for _ in range(n):
                v = tuple(max(0, min(100, a[i] + rng.gauss(0, sigma)))
                          for i in range(NDIM))
                if min(names, key=lambda m: dist(v, anchors[m])) == nm:
                    h += 1
            acc[nm] = h / n
            hits += h
            tot += n
        overall = hits / tot
        out[sigma] = (overall, acc)
        target = MC_TARGETS.get(sigma)
        verdict = "" if target is None else ("  PASS" if overall >= target
                                             else f"  BELOW {target:.0%}")
        print(f"    sigma={sigma:2d}: {overall:6.1%}{verdict}")
        if sigma == 15:
            for nm, p in sorted(acc.items(), key=lambda t: t[1])[:3]:
                f = "  <-- being eaten" if p < MC_BUCKET_FLOOR else ""
                print(f"              {p:6.1%}  {nm}{f}")
    return out


def check_profiles(b):
    bad = 0
    profs = b.get("profiles", {})
    for nm, (v, expected) in profs.items():
        top = route(v, b["subs"])
        hit = top[0][1] == expected
        bad += not hit
        if not hit:
            print(f"    MISS {nm:26s} " + " | ".join(f"{x} {p:.1f}%" for p, x in top))
            print(f"         expected: {expected}")
    print(f"    {len(profs) - bad}/{len(profs)} correct  {'PASS' if bad == 0 else 'FAIL'}")
    return bad == 0


def main():
    want = set(int(x) for x in sys.argv[1:]) if len(sys.argv) > 1 else None
    for b in BUCKETS:
        if want and b["id"] not in want:
            continue
        print("=" * 72)
        print(f"BUCKET {b['id']}: {b['name']}  "
              f"({len(b['subs'])} sub-ideologies, {len(b['axes'])} axes)")
        print("=" * 72)
        check_shape(b)
        print("  pairwise:")
        check_pairs(b)
        print("  monte carlo:")
        check_mc(b)
        print("  profiles:")
        check_profiles(b)
        print()


if __name__ == "__main__":
    main()
