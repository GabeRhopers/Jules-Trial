"""Continuity check for a series: compares every episode script with the series bible and the ledger.

Usage: python3 modules/series/scripts/continuity_check.py modules/series/cold-feet

Checks:
  1. Every character in a shot or line exists in the bible, and every outfit is one of its defined outfits.
  2. Each episode's ledger 'start' equals the previous episode's 'end' (no silent changes between episodes).
  3. The first time a character appears in an episode, the outfit matches the ledger 'start';
     the last time, it matches the ledger 'end'.
  Shots marked "flashback": true (recaps) are skipped for checks 3 and 4.
  4. Visible conditions: Frank's singed hair must show in every shot once the ledger says he is singed
     (and never before the zap in the episode where it happens).
  5. Open threads from the previous episode must be resolved or carried over.
Exit code 1 if anything fails.
"""
import json
import os
import sys


def main():
    series_dir = sys.argv[1] if len(sys.argv) > 1 else "modules/series/cold-feet"
    bible = json.load(open(os.path.join(series_dir, "series.json")))
    ledger = json.load(open(os.path.join(series_dir, "ledger.json")))
    chars = {c["id"]: c for c in bible["characters"]}
    ep_dir = os.path.join(series_dir, "episodes")
    episodes = {json.load(open(os.path.join(ep_dir, f)))["number"]: json.load(open(os.path.join(ep_dir, f))) for f in sorted(os.listdir(ep_dir)) if f.endswith(".json")}
    entries = {e["episode"]: e for e in ledger["episodes"]}
    errors, notes = [], []

    prev = None
    for num in sorted(episodes):
        ep = episodes[num]
        entry = entries.get(num)
        if not entry:
            errors.append(f"Episode {num}: no ledger entry")
            continue
        if prev and prev["end"] != entry["start"]:
            for key in entry["start"]:
                if prev["end"].get(key) != entry["start"].get(key):
                    errors.append(f"Episode {num}: ledger start '{key}' differs from episode {prev['episode']} end")
        if prev:
            carried = set(prev.get("openThreads", []))
            handled = set(entry.get("resolvedThreads", [])) | set(entry.get("openThreads", []))
            for thread in carried - handled:
                errors.append(f"Episode {num}: open thread from episode {prev['episode']} not resolved or carried: {thread}")

        first, last = {}, {}
        zapped = False
        for shot in ep["shots"]:
            if any(b.get("name") == "zap" for b in shot["beats"]) and num == 1:
                zapped_after_shot = True
            else:
                zapped_after_shot = False
            for c in shot.get("cast", []):
                if c["id"] not in chars:
                    errors.append(f"Episode {num} {shot['id']}: unknown character {c['id']}")
                    continue
                outfits = chars[c["id"]].get("look", {}).get("outfits", {})
                if c["outfit"] not in outfits:
                    errors.append(f"Episode {num} {shot['id']}: {c['id']} outfit '{c['outfit']}' not in bible ({', '.join(outfits)})")
                if shot.get("flashback"):
                    continue  # recap shots show an earlier state on purpose
                first.setdefault(c["id"], c["outfit"])
                last[c["id"]] = c["outfit"]
                if c["id"] == "frank":
                    should_be_singed = "singed hair from the zap" in entry["start"]["conditions"]["frank"] or zapped
                    if should_be_singed and not c.get("singed"):
                        errors.append(f"Episode {num} {shot['id']}: Frank should show singed hair")
                    if not should_be_singed and c.get("singed"):
                        errors.append(f"Episode {num} {shot['id']}: Frank is singed before the zap")
            for b in shot["beats"]:
                if b["type"] == "line" and b["who"] not in chars:
                    errors.append(f"Episode {num} {shot['id']}: line by unknown character {b['who']}")
            if zapped_after_shot:
                zapped = True
        for cid, outfit in first.items():
            want = entry["start"]["outfits"].get(cid)
            if want and outfit != want:
                errors.append(f"Episode {num}: {cid} first appears in '{outfit}', ledger start says '{want}'")
        for cid, outfit in last.items():
            want = entry["end"]["outfits"].get(cid)
            if want and outfit != want:
                errors.append(f"Episode {num}: {cid} last appears in '{outfit}', ledger end says '{want}'")
        notes.append(f"Episode {num} '{ep['title']}': {len(ep['shots'])} shots, open threads after: {entry.get('openThreads', [])}")
        prev = entry

    for n in notes:
        print("OK  " + n)
    for e in errors:
        print("ERR " + e)
    print(f"\n{'PASS' if not errors else 'FAIL'}: {len(errors)} continuity error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
