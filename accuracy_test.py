#!/usr/bin/env python3
"""Accuracy check for the full Conferadar Values pipeline.

Unlike validate.py (which routes hand-written VECTORS), this drives the actual
respondent path: it synthesizes a Likert answer sheet a person sitting at a given
anchor would plausibly produce, scores it with the real formula, and checks where
they land.

  1. Module 1  - each bucket anchor answers the questionnaire, must route to itself
  2. Module 1  - the 9 named real-world profiles from validate.py, via answer sheets
  3. Module 2  - every non-umbrella sub-ideology must recover itself (full form)
  4. Module 2  - same, but SHORT FORM (48 items) - previously unchecked
  5. Noise     - respondents who answer sloppily (+/-1 Likert step) still land right
  6. Sanity    - an all-neutral sheet scores exactly 50 everywhere

IMPORTANT CAVEAT: synthesizing answers from an anchor is self-referential. This
measures internal consistency and whether anchors are separable given the item
weights. It CANNOT measure construct validity - whether the questions actually
capture the beliefs they claim to. Only human respondents can establish that.
"""
import json, math, random, collections, glob, os

ROOT = os.path.dirname(os.path.abspath(__file__))
LEVELS = [-1.0, -0.5, 0.0, 0.5, 1.0]
M1_AXES = ["econ", "auth", "soli", "chng", "legi", "impe"]

MODULE2_FILES = {
    1: "module2-b01-ml-questions.json", 2: "module2-b02-leftcom-questions.json",
    3: "module2-b03-anarchism-questions.json", 4: "module2-b04-socdem-questions.json",
    5: "module2-b05-progressive-questions.json", 6: "module2-b06-classlib-questions.json",
    7: "module2-b07-conservatism-questions.json", 8: "module2-b08-fascism-questions.json",
    9: "module2-b09-monarchism-questions.json", 10: "module2-b10-theocracy-questions.json",
    11: "module2-b11-ancap-questions.json", 12: "module2-b12-thirdworldism-questions.json",
    13: "module2-b13-eurasianism-questions.json",
}

PROFILES = {
    "Orthodox Stalinist": (dict(zip(M1_AXES, (3, 80, 8, 5, 5, 10))), "Marxism-Leninism / Communism"),
    "ML, Third-Worldist": (dict(zip(M1_AXES, (5, 70, 20, 10, 15, 5))), "Marxism-Leninism / Communism"),
    "Dengist":            (dict(zip(M1_AXES, (50, 80, 35, 45, 8, 30))), "Marxism-Leninism / Communism"),
    "Bordigist":          (dict(zip(M1_AXES, (2, 30, 5, 3, 5, 25))), "Left-Communism / Communization"),
    "Council communist":  (dict(zip(M1_AXES, (3, 10, 5, 5, 5, 20))), "Left-Communism / Communization"),
    "Bookchinite":        (dict(zip(M1_AXES, (15, 8, 25, 15, 10, 15))), "Anarchism"),
    "Nordic social dem.": (dict(zip(M1_AXES, (30, 45, 25, 65, 15, 45))), "Social Democracy / Dem. Socialism"),
    "US progressive":     (dict(zip(M1_AXES, (45, 30, 50, 55, 10, 50))), "Progressive / Social Liberalism"),
    "Khomeinist":         (dict(zip(M1_AXES, (45, 85, 40, 60, 95, 40))), "Theocracy / Religious Fundamentalism"),
}


def load(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return json.load(f)


def synth_answers(questions, anchor, jitter=0, rng=None):
    """The Likert sheet a respondent sitting at `anchor` would produce.

    jitter = how many Likert steps of sloppiness to add per item.
    """
    out = {}
    for q in questions:
        ax = q["axis"]
        if ax not in anchor:
            continue
        want = (anchor[ax] - 50) / 50.0
        raw = want * (1 if q["effect"][ax] > 0 else -1)
        idx = min(range(len(LEVELS)), key=lambda i: abs(LEVELS[i] - raw))
        if jitter and rng:
            idx = max(0, min(len(LEVELS) - 1, idx + rng.randint(-jitter, jitter)))
        out[q["id"]] = LEVELS[idx]
    return out


def score(questions, answers):
    acc = collections.defaultdict(lambda: [0.0, 0.0])
    for q in questions:
        ax = q["axis"]
        if q["id"] not in answers:
            continue
        eff = q["effect"][ax]
        acc[ax][0] += answers[q["id"]] * eff
        acc[ax][1] += abs(eff)
    return {ax: 100 * (mx + raw) / (2 * mx) for ax, (raw, mx) in acc.items()}


def dist(a, b, keys):
    return math.sqrt(sum((a[k] - b[k]) ** 2 for k in keys))


def nearest(vec, candidates, keys):
    """candidates: list of (name, anchor). Returns sorted [(d, name), ...]."""
    return sorted((dist(vec, anc, keys), nm) for nm, anc in candidates)


def hr(title):
    print("=" * 70)
    print(title)
    print("=" * 70)


def main():
    m1 = load("module1-questions.json")
    m1q = m1["questions"]
    m1_core = [q for q in m1q if q["core"]]
    bucket_anchors = [(b["name"], b["anchor"]) for b in m1["buckets"]]
    results = {}

    # ---------------------------------------------------------------- 6. sanity
    hr("6. SANITY - all-neutral respondent")
    neutral = score(m1q, {q["id"]: 0.0 for q in m1q})
    off = {k: v for k, v in neutral.items() if abs(v - 50) > 1e-9}
    print(f"  Module 1 all axes == 50.0 : {'PASS' if not off else 'FAIL ' + str(off)}")
    m2_neutral_ok = True
    for bid, fn in MODULE2_FILES.items():
        d = load(fn)
        s = score(d["questions"], {q["id"]: 0.0 for q in d["questions"]})
        if any(abs(v - 50) > 1e-9 for v in s.values()):
            m2_neutral_ok = False
            print(f"  !! bucket {bid} not 50 at neutral")
    print(f"  All 13 Module 2 batteries == 50.0 : {'PASS' if m2_neutral_ok else 'FAIL'}")
    results["neutral"] = (not off) and m2_neutral_ok
    print()

    # ------------------------------------------------- 1. Module 1 self-routing
    hr("1. MODULE 1 - each bucket anchor answers the questionnaire")
    hits = 0
    for name, anchor in bucket_anchors:
        v = score(m1q, synth_answers(m1q, anchor))
        got = nearest(v, bucket_anchors, M1_AXES)[0][1]
        ok = got == name
        hits += ok
        if not ok:
            print(f"  MISS {name}  ->  {got}")
    print(f"  {hits}/13 buckets recovered themselves  "
          f"{'PASS' if hits == 13 else 'FAIL'}")
    results["m1_self"] = hits == 13
    print()

    # ------------------------------------------------ 2. Module 1 real profiles
    hr("2. MODULE 1 - named real-world profiles, via answer sheets")
    hits = 0
    for nm, (vec, expected) in PROFILES.items():
        v = score(m1q, synth_answers(m1q, vec))
        top = nearest(v, bucket_anchors, M1_AXES)
        got = top[0][1]
        ok = got == expected
        hits += ok
        maxd = math.sqrt(6 * 100 ** 2)
        pct = 100 * (1 - top[0][0] / maxd)
        print(f"  {'ok  ' if ok else 'MISS'} {nm:20s} -> {got}  ({pct:.1f}%)")
        if not ok:
            print(f"       expected {expected}")
    print(f"  {hits}/{len(PROFILES)} correct  {'PASS' if hits == len(PROFILES) else 'FAIL'}")
    results["m1_profiles"] = hits == len(PROFILES)
    print()

    # ------------------------------------------ 3/4. Module 2 full + short form
    for form, label in (("full", "3. MODULE 2 - full form (96 items)"),
                        ("core", "4. MODULE 2 - SHORT form (48 items)")):
        hr(label)
        tot = won = 0
        worst = []
        for bid, fn in MODULE2_FILES.items():
            d = load(fn)
            qs = d["questions"] if form == "full" else [q for q in d["questions"] if q.get("core")]
            keys = [a["key"] for a in d["axes"]]
            cands = [(s["name"], s["anchor"]) for s in d["subIdeologies"]]
            named = [s for s in d["subIdeologies"] if not s.get("umbrella")]
            hits = 0
            for s in named:
                v = score(qs, synth_answers(qs, s["anchor"]))
                got = nearest(v, cands, keys)[0][1]
                hits += got == s["name"]
            tot += len(named); won += hits
            pct = 100 * hits / len(named)
            if pct < 100:
                worst.append((pct, bid, d["meta"]["bucket"], hits, len(named)))
            print(f"  b{bid:02d} {d['meta']['bucket'][:44]:44s} {hits:2d}/{len(named):2d}  {pct:5.1f}%")
        print(f"\n  overall {won}/{tot} = {100*won/tot:.1f}%")
        results[f"m2_{form}"] = won == tot
        print()

    # ------------------------------------------------------------- 5. noise
    hr("5. NOISE - sloppy respondents (+/-1 Likert step per item)")
    rng = random.Random(0)
    TRIALS = 30
    m1_hits = m1_tot = 0
    for name, anchor in bucket_anchors:
        for _ in range(TRIALS):
            v = score(m1q, synth_answers(m1q, anchor, jitter=1, rng=rng))
            m1_hits += nearest(v, bucket_anchors, M1_AXES)[0][1] == name
            m1_tot += 1
    print(f"  Module 1 routing held: {100*m1_hits/m1_tot:.1f}%  ({m1_hits}/{m1_tot})")

    m2_hits = m2_tot = 0
    per_bucket = []
    for bid, fn in MODULE2_FILES.items():
        d = load(fn)
        qs = d["questions"]
        keys = [a["key"] for a in d["axes"]]
        cands = [(s["name"], s["anchor"]) for s in d["subIdeologies"]]
        named = [s for s in d["subIdeologies"] if not s.get("umbrella")]
        h = t = 0
        for s in named:
            for _ in range(TRIALS):
                v = score(qs, synth_answers(qs, s["anchor"], jitter=1, rng=rng))
                h += nearest(v, cands, keys)[0][1] == s["name"]
                t += 1
        per_bucket.append((100 * h / t, bid, d["meta"]["bucket"]))
        m2_hits += h; m2_tot += t
    print(f"  Module 2 label held:   {100*m2_hits/m2_tot:.1f}%  ({m2_hits}/{m2_tot})")
    print("\n  weakest buckets under noise:")
    for pct, bid, nm in sorted(per_bucket)[:4]:
        print(f"    {pct:5.1f}%  b{bid:02d} {nm}")
    results["noise"] = (100 * m1_hits / m1_tot >= 90) and (100 * m2_hits / m2_tot >= 75)
    print("  NOTE: item-level jitter averages out across 12 items per axis, so this")
    print("        is a weak stressor. Test 5b below is the meaningful one.\n")

    # ------------------------------------------- 5b. belief-level perturbation
    hr("5b. BELIEF DRIFT - respondent sits NEAR an anchor, not exactly on it")
    print("  (Gaussian perturbation of the anchor itself, then answer + score.")
    print("   This is the realistic case: nobody is a textbook anything.)\n")
    rng = random.Random(1)
    TRIALS = 40
    for sigma in (10, 15, 20):
        v_hits = v_tot = 0
        for name, anchor in bucket_anchors:
            for _ in range(TRIALS):
                drift = {k: max(0, min(100, anchor[k] + rng.gauss(0, sigma))) for k in M1_AXES}
                v = score(m1q, synth_answers(m1q, drift))
                v_hits += nearest(v, bucket_anchors, M1_AXES)[0][1] == name
                v_tot += 1
        m1_pct = 100 * v_hits / v_tot

        b_hits = b_tot = 0
        per = []
        for bid, fn in MODULE2_FILES.items():
            d = load(fn)
            qs = d["questions"]
            keys = [a["key"] for a in d["axes"]]
            cands = [(s["name"], s["anchor"]) for s in d["subIdeologies"]]
            named = [s for s in d["subIdeologies"] if not s.get("umbrella")]
            h = t = 0
            for s in named:
                for _ in range(TRIALS):
                    drift = {k: max(0, min(100, s["anchor"][k] + rng.gauss(0, sigma)))
                             for k in keys}
                    v = score(qs, synth_answers(qs, drift))
                    h += nearest(v, cands, keys)[0][1] == s["name"]
                    t += 1
            per.append((100 * h / t, bid, d["meta"]["bucket"]))
            b_hits += h; b_tot += t
        print(f"  sigma={sigma:2d}:  Module 1 bucket {m1_pct:5.1f}%   "
              f"Module 2 tendency {100*b_hits/b_tot:5.1f}%")
        if sigma == 15:
            print("           weakest Module 2 buckets at sigma=15:")
            for pct, bid, nm in sorted(per)[:4]:
                print(f"             {pct:5.1f}%  b{bid:02d} {nm}")
        if sigma == 10:
            results["drift10"] = m1_pct >= 90 and 100 * b_hits / b_tot >= 70
    print()

    hr("SUMMARY")
    for k, v in results.items():
        print(f"  {k:14s} {'PASS' if v else 'FAIL'}")
    print(f"\n  {'ALL PASS' if all(results.values()) else 'SOME CHECKS FAILED'}")


if __name__ == "__main__":
    main()
