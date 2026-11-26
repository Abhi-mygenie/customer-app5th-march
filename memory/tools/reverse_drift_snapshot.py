#!/usr/bin/env python3
"""READ-ONLY: diff the LIVE Sheet against the last-pushed snapshot (.registry_csv) across all
gate/All-Items tabs. Surfaces ANY cell the owner edited since the push, on any tab/column.
Writes nothing."""
import sys, csv, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from registry_sync import access_token, api, a1, HEADERS

CSV_DIR = pathlib.Path(__file__).parent / ".registry_csv"
TABS = ["All Items", "Intake", "Planning", "Implemented", "QA", "Smoke", "Closed", "Blockers", "Summary", "Change Log"]
ACCEPTED = {"Status", "Registered", "Closed"}      # reverse-sync whitelist (contract)
INFO = {"Assignee"}                                  # dashboard-owned / informational

def classify(col):
    if col in ACCEPTED: return "ACCEPTED (would flow back)"
    if col in INFO: return "INFO (dashboard-owned)"
    if col.startswith("col"): return "OUT-OF-SCHEMA (new column)"
    return "IGNORED (registry-owned, not reverse-accepted)"

def norm(v): return (str(v).strip() if v is not None else "")

def main():
    token, sheet_id = access_token()
    total = 0
    for tab in TABS:
        snap_path = CSV_DIR / f"{tab.replace(' ','_')}.csv"
        if not snap_path.exists():
            snap_path = CSV_DIR / f"{tab}.csv"
        if not snap_path.exists():
            print(f"[{tab}] no snapshot CSV — skip"); continue
        snap = [[norm(c) for c in row] for row in csv.reader(open(snap_path))]
        live_raw = api("GET", token, f"{sheet_id}/values/{a1(tab)}").get("values", [])
        live = [[norm(c) for c in row] for row in live_raw]
        diffs = []
        for r in range(max(len(snap), len(live))):
            srow = snap[r] if r < len(snap) else []
            lrow = live[r] if r < len(live) else []
            for c in range(max(len(srow), len(lrow))):
                sv = srow[c] if c < len(srow) else ""
                lv = lrow[c] if c < len(lrow) else ""
                if sv != lv:
                    col = HEADERS[c] if c < len(HEADERS) else f"col{c}"
                    rid = (lrow[1] if len(lrow) > 1 else (srow[1] if len(srow) > 1 else f"row{r}"))
                    diffs.append((rid, col, sv, lv))
        if diffs:
            print(f"\n[{tab}] {len(diffs)} changed cell(s):")
            for rid, col, sv, lv in diffs[:200]:
                print(f"    {rid} | {col}: pushed='{sv}'  ->  live='{lv}'   [{classify(col)}]")
            total += len(diffs)
    print(f"\nTOTAL changed cells across tabs: {total}")
    print("(READ-ONLY — nothing written)")

if __name__ == "__main__":
    main()
