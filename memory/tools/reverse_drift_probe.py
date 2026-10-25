#!/usr/bin/env python3
"""READ-ONLY demo (Path B): read the Sheet's All Items tab and diff the reverse-accepted
columns (Status, Registered, Closed) + Assignee against index.yml. Writes nothing.
NOT the formal SHEET DRIFT role; a one-off proof that Sheet->registry reading works."""
import sys, yaml, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from registry_sync import access_token, api, a1, INDEX_PATH

# All Items column order (contract v1.2 HEADERS), 0-based
COL = {"ID": 1, "Status": 4, "Registered": 13, "Closed": 15, "Assignee": 12}

def norm(v):
    return (str(v).strip() if v is not None else "")

def main():
    token, sheet_id = access_token()
    resp = api("GET", token, f"{sheet_id}/values/{a1('All Items')}")
    rows = resp.get("values", [])
    header, data = rows[0], rows[1:]
    sheet = {}
    for r in data:
        def cell(name):
            i = COL[name]
            return norm(r[i]) if i < len(r) else ""
        rid = cell("ID")
        if rid:
            sheet[rid] = {k: cell(k) for k in ("Status", "Registered", "Closed", "Assignee")}

    idx = {x["id"]: x for x in yaml.safe_load(open(INDEX_PATH))}

    print(f"Sheet All Items rows: {len(sheet)} | index.yml items: {len(idx)}\n")

    # 1) Reverse-accepted field diffs (Status / Registered / Closed) for ids in both
    print("=== EDITS on Sheet vs index.yml (reverse-accepted: Status/Registered/Closed) ===")
    found = 0
    for rid in sorted(sheet):
        if rid not in idx:
            continue
        s = sheet[rid]
        reg = idx[rid]
        for field, ikey in (("Status", "status"), ("Registered", "registered"), ("Closed", "closed")):
            sv = s[field]
            iv = norm(reg.get(ikey))
            if iv in ("None", "null"):
                iv = ""
            if sv != iv:
                found += 1
                print(f"  {rid}  {field}: sheet='{sv}'  !=  index='{iv}'")
    if not found:
        print("  (none)")

    # 2) Assignee (dashboard-owned, informational only)
    print("\n=== Assignee set on Sheet (dashboard-owned, informational) ===")
    anyass = False
    for rid in sorted(sheet):
        if sheet[rid]["Assignee"]:
            anyass = True
            print(f"  {rid}  Assignee='{sheet[rid]['Assignee']}'")
    if not anyass:
        print("  (none)")

    # 3) Membership drift
    only_sheet = sorted(set(sheet) - set(idx))
    only_index = sorted(set(idx) - set(sheet))
    print(f"\n=== Membership ===\n  only on Sheet: {len(only_sheet)} {only_sheet[:10]}")
    print(f"  only in index.yml: {len(only_index)} {only_index[:10]}")
    print("\n(READ-ONLY — nothing written to Sheet or index.yml)")

if __name__ == "__main__":
    main()
