"""Validate a week of candidates before it goes to the review page.  python3 tools/check_week.py content/weeks/2026-W44.json"""
import json, sys, re
LAYOUTS = {"split", "scene", "bignum", "mythfact", "steps", "askdoc", "checklist", "bodymap", "countdown"}
SIDE = {"tip", "stat", "qr", "fact", "hours"}
REGIONS = {"neck", "shoulder", "elbow", "midback", "lowback", "hip", "knee", "heel", "foot", "wrist", "jaw", "head"}
LIM = {"headline": 60, "body": 170, "card": 90, "line": 110, "myth": 110, "fact": 110, "answer": 220, "title": 32, "text": 120, "caption": 120, "eyebrow": 32}
BAN = [("—", "em dash"), ("!", "exclamation point"), (r"\bguarantee", "guarantee"), (r"\bcure[sd]?\b", "cure"), (r"\bpain-free\b", "pain-free"),
       (r"\bunlock", "unlock"), (r"\bjourney\b", "journey"), (r"\btransform", "transform"), (r"game-?changer", "game-changer"),
       (r"say goodbye", "say goodbye"), (r"\bshows up\b", "shows up"), (r"does the work", "does the work"), (r"Mayfield Advanced Medical|\bMAM\b", "wrong practice name"),
       (r"Dr\.? Mayfield (said|says|explains|recommends)", "Dr. Mayfield quoted as the on-screen doctor"), (r"Health 360", "Health 360 named on screen")]
def check(items):
    errs, ids = [], set()
    for it in items:
        i = it.get("id", "?")
        if i in ids: errs.append(f"{i}: duplicate id")
        ids.add(i)
        z = it.get("zone")
        if z == "main" and it.get("layout") not in LAYOUTS: errs.append(f"{i}: unknown layout {it.get('layout')}")
        if z == "side" and it.get("layout") not in SIDE: errs.append(f"{i}: unknown side layout {it.get('layout')}")
        if z == "crawler" and not (it.get("line") or it.get("text")): errs.append(f"{i}: crawler has no line")
        if z not in ("main", "side", "crawler"): errs.append(f"{i}: bad zone")
        if it.get("layout") == "bodymap" and it.get("region") not in REGIONS: errs.append(f"{i}: bodymap region {it.get('region')}")
        if it.get("layout") == "countdown" and not re.match(r"\d{4}-\d\d-\d\d$", str(it.get("date", ""))): errs.append(f"{i}: countdown needs date")
        if it.get("claim") == "sourced" and not (it.get("source") or {}).get("url"): errs.append(f"{i}: sourced claim without a source url")
        for k, n in LIM.items():
            if len(str(it.get(k) or "")) > n: errs.append(f"{i}: {k} is {len(str(it[k]))} chars (max {n})")
        if z == "crawler" and len(str(it.get("line") or it.get("text") or "")) > 110: errs.append(f"{i}: crawler line over 110")
        blob = " ".join(str(v) for k, v in it.items() if k not in ("source", "qr", "why", "id")) 
        for pat, name in BAN:
            if re.search(pat, blob, re.I): errs.append(f"{i}: {name}")
    return errs
if __name__ == "__main__":
    d = json.load(open(sys.argv[1])); items = d["items"] if isinstance(d, dict) else d
    e = check(items); print("\n".join(e) or f"OK: {len(items)} items"); sys.exit(1 if e else 0)
