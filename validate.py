#!/usr/bin/env python3
"""
Validation harness for the ideology test.

Runs four checks:
  0. Balance invariants  (keyed balance + weight balance, full set and short form)
  1. Pairwise anchor separation
  2. Monte Carlo self-routing under Gaussian noise
  3. Named test profiles

Usage:  python3 validate.py [path/to/module1-questions.json]

To extend to a Module 2 bucket: change AXES, set MAXD's dimension count, and replace
ANCHORS/PROFILES with the bucket's sub-ideology vectors.
"""

import json, math, random, itertools, sys, collections

QFILE = sys.argv[1] if len(sys.argv) > 1 else "module1-questions.json"
AXES = ["econ", "auth", "soli", "chng", "legi", "impe"]   # routing axes only
MAXD = math.sqrt(len(AXES) * 100 ** 2)

# Thresholds — see METHODOLOGY.md §4
MIN_PAIR_OK      = 35.0    # below this, pair is fragile
MIN_PAIR_FATAL   = 25.0    # below this, buckets are not distinguishable
MC_TARGETS       = {10: 0.95, 15: 0.85}
MC_BUCKET_FLOOR  = 0.60    # any single bucket below this at sigma=15 is being eaten

# ---------------------------------------------------------------- test profiles
# Hand-written vectors for real tendencies whose correct bucket you already know.
# These are the ONLY diagnostic that can detect a misplaced anchor. Add to them
# whenever you edit an anchor or suspect a boundary.
PROFILES = {
    "Orthodox Stalinist":   ((3, 80,  8,  5,  5, 10), "Marxism-Leninism / Communism"),
    "ML, Third-Worldist":   ((5, 70, 20, 10, 15,  5), "Marxism-Leninism / Communism"),
    "Dengist":              ((50, 80, 35, 45,  8, 30), "Marxism-Leninism / Communism"),
    "Bordigist":            ((2, 30,  5,  3,  5, 25), "Left-Communism / Communization"),
    "Council communist":    ((3, 10,  5,  5,  5, 20), "Left-Communism / Communization"),
    "Bookchinite":          ((15,  8, 25, 15, 10, 15), "Anarchism"),
    "Nordic social dem.":   ((30, 45, 25, 65, 15, 45), "Social Democracy / Dem. Socialism"),
    "US progressive":       ((45, 30, 50, 55, 10, 50), "Progressive / Social Liberalism"),
    "Khomeinist":           ((45, 85, 40, 60, 95, 40), "Theocracy / Religious Fundamentalism"),
}


def load(path):
    with open(path) as f:
        return json.load(f)


def dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def vec(anchor):
    return tuple(anchor[k] for k in AXES)


def route(v, anchors, n=3):
    """Return top-n (match%, name), nearest first."""
    r = sorted((dist(v, a), nm) for nm, a in anchors.items())
    return [(100 * (1 - d / MAXD), nm) for d, nm in r[:n]]


# ------------------------------------------------------------------- 0. balance
def check_balance(d):
    print("=" * 68)
    print("0. BALANCE INVARIANTS")
    print("=" * 68)
    by = collections.defaultdict(list)
    for q in d["questions"]:
        by[q["axis"]].append(q)

    ok = True
    ids = [q["id"] for q in d["questions"]]
    if len(set(ids)) != len(ids):
        print("  !! duplicate question ids")
        ok = False

    for ax in sorted(by):
        items = by[ax]
        for q in items:
            if len(q["effect"]) != 1 or ax not in q["effect"]:
                print(f"  !! {q['id']}: cross-loaded or mislabelled effect")
                ok = False
        pos = sum(q["effect"][ax] for q in items if q["effect"][ax] > 0)
        neg = -sum(q["effect"][ax] for q in items if q["effect"][ax] < 0)
        core = [q for q in items if q["core"]]
        cpos = sum(q["effect"][ax] for q in core if q["effect"][ax] > 0)
        cneg = -sum(q["effect"][ax] for q in core if q["effect"][ax] < 0)
        good = (pos == neg) and (cpos == cneg)
        ok &= good
        flag = "" if good else "   <-- UNBALANCED"
        print(f"  {ax}: n={len(items):2d} full {pos:3d}/{neg:<3d} | "
              f"core n={len(core):2d} {cpos:3d}/{cneg:<3d}{flag}")

    print(f"\n  total {len(d['questions'])} | short form "
          f"{sum(1 for q in d['questions'] if q['core'])}")
    print(f"  {'PASS' if ok else 'FAIL'}\n")
    return ok


# ------------------------------------------------------ 1. pairwise separation
def check_pairs(anchors):
    print("=" * 68)
    print("1. PAIRWISE ANCHOR SEPARATION")
    print("=" * 68)
    pairs = sorted((dist(a, b), x, y)
                   for (x, a), (y, b) in itertools.combinations(anchors.items(), 2))
    for d_, x, y in pairs[:8]:
        flag = ("  <-- FATAL" if d_ < MIN_PAIR_FATAL else
                "  <-- fragile" if d_ < MIN_PAIR_OK else "")
        print(f"  {d_:6.1f}  {x}  <->  {y}{flag}")
    mean = sum(p[0] for p in pairs) / len(pairs)
    print(f"\n  min {pairs[0][0]:.1f} | mean {mean:.1f} | max {pairs[-1][0]:.1f}")
    print(f"  {'PASS' if pairs[0][0] >= MIN_PAIR_OK else 'REVIEW'}\n")
    return pairs


# ------------------------------------------------------------- 2. monte carlo
def check_monte_carlo(anchors, sigmas=(10, 15, 20), n=4000, seed=0):
    print("=" * 68)
    print("2. MONTE CARLO SELF-ROUTING (Gaussian perturbation)")
    print("=" * 68)
    rng = random.Random(seed)
    names = list(anchors)
    for sigma in sigmas:
        acc, hits, tot = {}, 0, 0
        for nm in names:
            a = anchors[nm]
            h = 0
            for _ in range(n):
                v = tuple(max(0, min(100, a[i] + rng.gauss(0, sigma)))
                          for i in range(len(AXES)))
                if min(names, key=lambda m: dist(v, anchors[m])) == nm:
                    h += 1
            acc[nm] = h / n
            hits += h
            tot += n
        overall = hits / tot
        target = MC_TARGETS.get(sigma)
        verdict = "" if target is None else ("  PASS" if overall >= target
                                             else f"  BELOW TARGET {target:.0%}")
        print(f"  sigma={sigma:2d}: overall {overall:6.1%}{verdict}")
        for nm, p in sorted(acc.items(), key=lambda t: t[1])[:4]:
            f = "  <-- being eaten" if (sigma == 15 and p < MC_BUCKET_FLOOR) else ""
            print(f"            {p:6.1%}  {nm}{f}")
    print()


# ------------------------------------------------------------- 3. profiles
def check_profiles(anchors):
    print("=" * 68)
    print("3. NAMED TEST PROFILES")
    print("=" * 68)
    bad = 0
    for nm, (v, expected) in PROFILES.items():
        top = route(v, anchors)
        got = top[0][1]
        hit = got == expected
        bad += not hit
        print(f"  {'ok ' if hit else 'MISS'} {nm:22s} " +
              " | ".join(f"{b} {p:.1f}%" for p, b in top))
        if not hit:
            print(f"       expected: {expected}")
    print(f"\n  {len(PROFILES) - bad}/{len(PROFILES)} correct  "
          f"{'PASS' if bad == 0 else 'FAIL'}\n")
    return bad == 0


def main():
    d = load(QFILE)
    anchors = {b["name"]: vec(b["anchor"]) for b in d["buckets"]}
    print(f"\n{d['meta']['name']} v{d['meta']['version']} — {len(anchors)} buckets, "
          f"{len(d['questions'])} questions\n")
    check_balance(d)
    check_pairs(anchors)
    check_monte_carlo(anchors)
    check_profiles(anchors)


if __name__ == "__main__":
    main()
