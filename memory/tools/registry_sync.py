#!/usr/bin/env python3
"""Registry mirror generator — CR-2026-10-04-006.

One-way: index.yml -> Google Sheet (D-G1). Nothing is ever read back from the
Sheet, and change_requests/README.md is never machine-written (O-G3).

    python registry_sync.py bootstrap        # P1: skeleton index.yml, derivable fields only
    python registry_sync.py audit            # P2: read-only drift / divergence report
    python registry_sync.py propose          # surface README prose for owner adjudication
    python registry_sync.py sync --dry-run   # P4: build views, dump CSVs, write nothing remote
    python registry_sync.py sync             # P5+P6: push to Sheets, append CHANGELOG

Status is never guessed or defaulted (O-G4). Fields that cannot be derived are
left blank rather than fabricated (O-G1).
"""
import csv
import json
import os
import pathlib
import re
import sys
from datetime import datetime, timezone

import requests
import yaml
from dotenv import load_dotenv

ROOT = pathlib.Path("/app")
ITEMS_DIR = ROOT / "memory/change_requests"
INDEX_PATH = ITEMS_DIR / "index.yml"
README_PATH = ITEMS_DIR / "README.md"
CHANGELOG_PATH = ITEMS_DIR / "CHANGELOG.md"
STATE_PATH = ROOT / "memory/tools/.registry_state.json"
CSV_DIR = ROOT / "memory/tools/.registry_csv"
TOKEN_PATH = "/app/secrets/sheets_token.json"
ENV_PATH = "/app/backend/.env"

TOKEN_URL = "https://oauth2.googleapis.com/token"
SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

ID_RE = re.compile(r"^(CR|BUG|INV|PROD-INCIDENT)-(\d{4})-([\dX]{2})-([\dX]{2})-(\d{3})$")
ID_IN_TEXT = re.compile(r"(?:CR|BUG|INV|PROD-INCIDENT)-\d{4}-[\dX]{2}-[\dX]{2}-\d{3}")

TYPES = ["CR", "BUG", "INV", "PROD-INCIDENT"]
STATUSES = [
    "REGISTERED", "PLANNED", "IMPLEMENTED", "QA_PASSED", "AWAITING_OWNER_SMOKE",
    "CLOSED", "PARKED", "BLOCKED", "DEFERRED", "HELD", "REVERTED", "TOMBSTONE",
    "REPORT_WRITTEN",
]
SEVERITIES = ["P0", "P1", "P2", "P3"]
RISKS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
GATES = ["Intake", "Planning", "Approval", "Implementation", "QA", "Smoke", "Closure"]
PARTIES = ["POS", "CRM", "OWNER", "OPS", "INTERNAL"]
TERMINAL = ["CLOSED", "PARKED", "DEFERRED", "REVERTED", "TOMBSTONE"]

FIELDS = [
    "id", "type", "title", "status", "status_note", "severity", "risk",
    "owner_action", "blocked_on", "next_gate", "wave_track", "files",
    "artefacts", "registered", "last_updated", "related", "code_markers",
    "money_path",
]

# §6 routing: tab = the gate immediately preceding next_gate
GATE_TO_TAB = {
    "Planning": "Intake",
    "Approval": "Planning",
    "Implementation": "Planning",
    "QA": "Implemented",
    "Smoke": "QA",
    "Closure": "Smoke",
}
STATUS_TO_TAB = {
    "QA_PASSED": "QA",            # O-G7
    "AWAITING_OWNER_SMOKE": "Smoke",  # O-G7
    **{s: "Closed" for s in TERMINAL},
}
GATE_TABS = ["Intake", "Planning", "Implemented", "QA", "Smoke", "Closed"]
TABS = ["Summary", "All Items", *GATE_TABS, "Blockers"]

ARTEFACT_FILES = {
    "CR.md": "CR",
    "INTAKE_DOC.md": "INTAKE",
    "IMPACT_ANALYSIS.md": "IMPACT_ANALYSIS",
    "IMPLEMENTATION_PLAN.md": "IMPLEMENTATION_PLAN",
    "QA_HANDOVER.md": "QA_HANDOVER",
    "QA_REPORT.md": "QA_REPORT",
}


# ---------------------------------------------------------------- derivation

def item_folders():
    """Folders whose name starts with a well-formed item ID."""
    found, unnamed = {}, []
    for path in sorted(p for p in ITEMS_DIR.iterdir() if p.is_dir()):
        parts = path.name.split("-")
        candidate = "-".join(parts[:5]) if parts[0] != "PROD" else "-".join(parts[:6])
        if ID_RE.match(candidate):
            found[candidate] = path
        else:
            unnamed.append(path.name)
    return found, unnamed


def readme_rows():
    """id -> list of cell-lists, for every README table row naming that id."""
    rows = {}
    for line in README_PATH.read_text().splitlines():
        if not line.startswith("|"):
            continue
        ids = ID_IN_TEXT.findall(line)
        if not ids:
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        rows.setdefault(ids[0], []).append(cells)
    return rows


def slug_title(folder):
    parts = folder.name.split("-")
    offset = 6 if folder.name.startswith("PROD-INCIDENT") else 5
    slug = "-".join(parts[offset:]) or folder.name
    return slug.replace("-", " ").strip()


def derive_title(item_id, folder, rows):
    """README title cell where present, else the folder slug.

    The H1 of every artefact is just 'INTAKE DOC — <ID>', so headings carry no
    title. README cell 1 is the human-authored title; the slug is the fallback.
    """
    for cells in rows.get(item_id, []):
        if len(cells) < 2:
            continue
        text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", cells[1]).strip()
        text = text.replace("*", "").strip(" —-–:·")
        if text and not ID_IN_TEXT.fullmatch(text) and len(text) > 3:
            return text
    return slug_title(folder)


def derive_registered(item_id):
    m = ID_RE.match(item_id)
    y, mo, d = m.group(2), m.group(3), m.group(4)
    return None if "X" in mo + d else f"{y}-{mo}-{d}"


def source_blob():
    globs = ["backend/**/*.py", "frontend/src/**/*.js", "frontend/src/**/*.jsx",
             "frontend/src/**/*.ts", "frontend/src/**/*.tsx"]
    chunks = []
    for pattern in globs:
        for path in ROOT.glob(pattern):
            if "node_modules" in path.parts:
                continue
            chunks.append(path.read_text(errors="ignore"))
    return "\n".join(chunks)


def blank_record(item_id, folder, blob, rows):
    artefacts = [label for name, label in ARTEFACT_FILES.items() if (folder / name).exists()]
    return {
        "id": item_id,
        "type": item_id.rsplit("-", 4)[0] if item_id.startswith("PROD") else item_id.split("-")[0],
        "title": derive_title(item_id, folder, rows),
        "status": None,
        "status_note": None,
        "severity": None,
        "risk": None,
        "owner_action": None,
        "blocked_on": [],
        "next_gate": None,
        "wave_track": None,
        "files": None,
        "artefacts": ", ".join(artefacts),
        "registered": derive_registered(item_id),
        "last_updated": None,
        "related": [],
        "code_markers": item_id in blob,
        "money_path": None,
    }


def bootstrap():
    if INDEX_PATH.exists():
        sys.exit(f"{INDEX_PATH} already exists — bootstrap never overwrites an index.")
    folders, unnamed = item_folders()
    blob = source_blob()
    rows = readme_rows()
    records = [blank_record(i, f, blob, rows) for i, f in sorted(folders.items())]
    INDEX_PATH.write_text(
        "# Generated skeleton — CR-2026-10-04-006 bootstrap.\n"
        "# Derivable fields only. Blank fields are NOT guessed (O-G1, O-G4);\n"
        "# they await the owner hand-authoring pass.\n"
        + yaml.safe_dump(records, sort_keys=False, allow_unicode=True, width=100)
    )
    marked = sum(1 for r in records if r["code_markers"])
    print(f"Wrote {INDEX_PATH} — {len(records)} records.")
    print(f"  code_markers true : {marked}")
    print(f"  registered derived: {sum(1 for r in records if r['registered'])}")
    print(f"  folders without a well-formed ID (not indexed): {len(unnamed)} {unnamed}")


# ---------------------------------------------------------------- validation

def load_index():
    if not INDEX_PATH.exists():
        sys.exit(f"{INDEX_PATH} missing — run bootstrap first.")
    records = yaml.safe_load(INDEX_PATH.read_text())
    errors, seen = [], set()
    for rec in records:
        rid = rec.get("id")
        if not rid or not ID_RE.match(rid):
            errors.append(f"malformed id: {rid!r}")
            continue
        if rid in seen:
            errors.append(f"duplicate id: {rid}")
        seen.add(rid)
        for field in FIELDS:
            if field not in rec:
                errors.append(f"{rid}: missing field {field!r}")
        for field, allowed in (("type", TYPES), ("status", STATUSES),
                               ("severity", SEVERITIES), ("risk", RISKS),
                               ("next_gate", GATES)):
            value = rec.get(field)
            if value not in (None, "") and value not in allowed:
                errors.append(f"{rid}: {field}={value!r} not in {allowed}")
        for blocker in rec.get("blocked_on") or []:
            if blocker.get("party") not in PARTIES:
                errors.append(f"{rid}: blocked_on.party={blocker.get('party')!r} invalid")
    if errors:
        print("INDEX VALIDATION FAILED:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)
    return records


def readme_ids():
    return set(ID_IN_TEXT.findall(README_PATH.read_text()))


def audit():
    records = load_index()
    folders, unnamed = item_folders()
    indexed = {r["id"] for r in records}

    report = {
        "folders not in index": sorted(set(folders) - indexed),
        "index entries with no folder": sorted(indexed - set(folders)),
        "folders without a well-formed ID": unnamed,
        "in README but not in index": sorted(readme_ids() - indexed),
        "in index but not in README": sorted(indexed - readme_ids()),
        "code markers live but status REGISTERED (F1 tripwire)": sorted(
            r["id"] for r in records
            if r["code_markers"] and r.get("status") == "REGISTERED"
        ),
        "status not yet adjudicated by owner": sorted(
            r["id"] for r in records if not r.get("status")
        ),
        "unroutable to a gate tab": sorted(
            r["id"] for r in records if route(r) is None
        ),
    }
    print(f"AUDIT — {len(records)} indexed, {len(folders)} item folders\n")
    for label, ids in report.items():
        print(f"{label}: {len(ids)}")
        for item in ids[:8]:
            print(f"    {item}")
        if len(ids) > 8:
            print(f"    … and {len(ids) - 8} more")
    return report


def propose():
    """Surface each item's README prose beside its folder artefacts.

    Records, never adjudicates: no status value is assigned here. Output is for
    the owner to rule on, satisfying O-G4 without the agent interpreting prose.
    """
    records = load_index()
    rows = readme_rows()
    out = ["# STATUS ADJUDICATION WORKSHEET — CR-2026-10-04-006",
           "",
           "Agent-extracted prose only. **No status has been assigned.** Fill the",
           "`status` column with one of the 13 enum values and hand back.",
           "",
           f"Enum: `{' · '.join(STATUSES)}`",
           "",
           "| ID | Artefacts on disk | Code markers | README prose (verbatim) | status ← YOU |",
           "|---|---|---|---|---|"]
    for rec in records:
        prose = " ⏎ ".join(
            " / ".join(c for c in cells[1:] if c) for cells in rows.get(rec["id"], [])
        ) or "— absent from README —"
        prose = prose.replace("|", "\\|")[:400]
        out.append(
            f"| {rec['id']} | {rec['artefacts'] or '—'} | "
            f"{'YES' if rec['code_markers'] else 'no'} | {prose} |  |"
        )
    path = ITEMS_DIR / "CR-2026-10-04-006-google-sheet-registry-mirror/STATUS_WORKSHEET.md"
    path.write_text("\n".join(out) + "\n")
    print(f"Wrote {path} — {len(records)} rows, status column intentionally empty.")


# ---------------------------------------------------------------- views (P4)

def route(rec):
    status, gate = rec.get("status"), rec.get("next_gate")
    if status in STATUS_TO_TAB:
        return STATUS_TO_TAB[status]
    if gate in GATE_TO_TAB:
        return GATE_TO_TAB[gate]
    return None


def cell(value):
    if value is None or value == "":
        return ""
    if isinstance(value, bool):
        return "YES" if value else "no"
    if isinstance(value, list):
        if value and isinstance(value[0], dict):
            return " · ".join(
                f"{b.get('party')}: {b.get('ref')}"
                + (f" (since {b['since']})" if b.get("since") else "")
                for b in value
            )
        return ", ".join(str(v) for v in value)
    return str(value)


def badge(rec):
    parties = {b.get("party") for b in rec.get("blocked_on") or []}
    if rec.get("next_gate") == "Approval" or "OWNER" in parties:
        return "BLOCKED-YOU"
    if parties:
        return "BLOCKED-" + "/".join(sorted(parties))
    return ""


HEADERS = ["ID", "Type", "Title", "Status", "Badge", "Status note", "Severity",
           "Risk", "Owner action", "Blocked on", "Next gate", "Wave / track",
           "Files", "Artefacts", "Registered", "Last updated", "Related",
           "Code markers"]


def row_for(rec):
    return [
        cell(rec["id"]), cell(rec["type"]), cell(rec["title"]), cell(rec["status"]),
        badge(rec), cell(rec["status_note"]), cell(rec["severity"]), cell(rec["risk"]),
        cell(rec["owner_action"]), cell(rec["blocked_on"]), cell(rec["next_gate"]),
        cell(rec["wave_track"]), cell(rec["files"]), cell(rec["artefacts"]),
        cell(rec["registered"]), cell(rec["last_updated"]), cell(rec["related"]),
        cell(rec["code_markers"]),
    ]


def build_views(records):
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    views = {}

    for tab in GATE_TABS:
        rows = [row_for(r) for r in records if route(r) == tab]
        views[tab] = [[(f"{tab} — {len(rows)} items · generated {stamp} · READ-ONLY, "
                        f"edits are overwritten")], HEADERS, *rows]

    unrouted = [r for r in records if route(r) is None]
    views["All Items"] = [
        [(f"All items — {len(records)} total · {len(unrouted)} awaiting owner status "
          f"adjudication · generated {stamp} · READ-ONLY")],
        HEADERS, *[row_for(r) for r in records],
    ]

    blockers = [["Blockers by party — who is holding us up · generated " + stamp],
                ["Party", "Ref", "Since", "Item", "Item title", "Severity"]]
    by_party = {}
    for rec in records:
        for blocker in rec.get("blocked_on") or []:
            by_party.setdefault(blocker.get("party"), []).append((blocker, rec))
    for party in PARTIES:
        entries = by_party.get(party, [])
        if not entries:
            continue
        blockers.append([f"{party} — {len(entries)} blocker(s)"])
        for blocker, rec in sorted(entries, key=lambda e: str(e[0].get("since") or "")):
            blockers.append([party, cell(blocker.get("ref")), cell(blocker.get("since")),
                             rec["id"], cell(rec["title"]), cell(rec["severity"])])
    if len(blockers) == 2:
        blockers.append([("No blockers recorded in index.yml — "
                          "blocked_on is part of the owner hand-authoring pass.")])
    views["Blockers"] = blockers

    delivered = [r for r in records if r.get("status") in
                 ("IMPLEMENTED", "QA_PASSED", "AWAITING_OWNER_SMOKE", "CLOSED")]
    dropped = [r for r in records if r.get("status") in
               ("PARKED", "DEFERRED", "REVERTED", "TOMBSTONE")]
    summary = [
        [f"REGISTRY SUMMARY · generated {stamp} · one-way mirror of index.yml · READ-ONLY"],
        [],
        ["Block 1 — pipeline funnel"],
        ["Gate tab", "Items"],
        *[[tab, len([r for r in records if route(r) == tab])] for tab in GATE_TABS],
        ["Unrouted (status not adjudicated)", len(unrouted)],
        ["TOTAL", len(records)],
        [],
        ["Block 2 — risk at a glance"],
        ["Metric", "Value"],
        *[[f"Severity {sev}", len([r for r in records if r.get("severity") == sev])]
          for sev in SEVERITIES],
        ["Risk HIGH or CRITICAL",
         len([r for r in records if r.get("risk") in ("HIGH", "CRITICAL")])],
        ["Money-path items", len([r for r in records if r.get("money_path")])],
        [],
        ["Block 3 — who is holding us up"],
        ["Party", "Blockers"],
        *[[party, len(by_party.get(party, []))] for party in PARTIES],
        [],
        ["Block 4 — trust indicators (can this registry be believed?)"],
        ["Metric", "Value"],
        ["Items indexed", len(records)],
        ["Status NOT yet adjudicated by owner", len(unrouted)],
        ["Delivered (implemented or beyond)", len(delivered)],
        ["Dropped / parked / reverted", len(dropped)],
        ["Live code markers but status REGISTERED (F1 tripwire)",
         len([r for r in records if r["code_markers"] and r.get("status") == "REGISTERED"])],
        ["Items with live code markers", len([r for r in records if r["code_markers"]])],
        ["index.yml <-> README divergence",
         len(readme_ids() ^ {r["id"] for r in records})],
        ["last_updated unavailable for history (by design)",
         len([r for r in records if not r.get("last_updated")])],
    ]
    views["Summary"] = summary
    return views


def dump_csv(views):
    CSV_DIR.mkdir(exist_ok=True)
    for tab, rows in views.items():
        path = CSV_DIR / f"{tab.replace(' ', '_')}.csv"
        with open(path, "w", newline="") as fh:
            csv.writer(fh).writerows(rows)
    print(f"CSV dump -> {CSV_DIR}")
    for tab, rows in views.items():
        print(f"  {tab:<14} {max(len(rows) - 2, 0):>3} data rows")


# ---------------------------------------------------------------- push (P5)

def access_token():
    load_dotenv(ENV_PATH)
    if not os.path.exists(TOKEN_PATH):
        sys.exit(f"No OAuth token at {TOKEN_PATH} — run probe_sheets_oauth.py first.")
    with open(TOKEN_PATH) as fh:
        refresh_token = json.load(fh)["refresh_token"]
    resp = requests.post(TOKEN_URL, data={
        "refresh_token": refresh_token,
        "client_id": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        "grant_type": "refresh_token",
    }, timeout=30)
    if resp.status_code != 200:
        sys.exit(f"Token refresh failed [{resp.status_code}]: {resp.text}")
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    if "/" in sheet_id:
        sys.exit("GOOGLE_SHEET_ID must be the bare ID, not a URL.")
    return resp.json()["access_token"], sheet_id


def api(method, token, path, **kwargs):
    resp = requests.request(method, f"{SHEETS_API}/{path}",
                            headers={"Authorization": f"Bearer {token}"},
                            timeout=60, **kwargs)
    if resp.status_code != 200:
        sys.exit(f"{method} {path} failed [{resp.status_code}]: {resp.text}")
    return resp.json()


def a1(tab):
    return "'" + tab.replace("'", "''") + "'"


def push(views):
    token, sheet_id = access_token()
    meta = api("GET", token, sheet_id, params={"fields": "sheets.properties"})
    existing = {s["properties"]["title"]: s["properties"]["sheetId"]
                for s in meta["sheets"]}

    missing = [t for t in TABS if t not in existing]
    if missing:
        api("POST", token, f"{sheet_id}:batchUpdate", json={"requests": [
            {"addSheet": {"properties": {"title": t}}} for t in missing]})
        print(f"Created tabs: {missing}")
        meta = api("GET", token, sheet_id, params={"fields": "sheets.properties"})
        existing = {s["properties"]["title"]: s["properties"]["sheetId"]
                    for s in meta["sheets"]}

    api("POST", token, f"{sheet_id}/values:batchClear",
        json={"ranges": [a1(t) for t in TABS]})

    data = [{"range": f"{a1(tab)}!A1", "values": views[tab]} for tab in TABS]
    for start in range(0, len(data), 100):
        api("POST", token, f"{sheet_id}/values:batchUpdate", json={
            "valueInputOption": "RAW", "data": data[start:start + 100]})
    print(f"Pushed {len(TABS)} tabs.")

    requests_body = []
    for tab in TABS:
        sid = existing[tab]
        requests_body.append({"updateSheetProperties": {
            "properties": {"sheetId": sid,
                           "gridProperties": {"frozenRowCount": 2 if tab not in
                                              ("Summary",) else 1}},
            "fields": "gridProperties.frozenRowCount"}})
        requests_body.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "textFormat": {"bold": True},
                "backgroundColor": {"red": 0.12, "green": 0.14, "blue": 0.18}}},
            "fields": "userEnteredFormat(textFormat,backgroundColor)"}})
    for tab in TABS:
        requests_body.append({"autoResizeDimensions": {"dimensions": {
            "sheetId": existing[tab], "dimension": "COLUMNS",
            "startIndex": 0, "endIndex": 18}}})
    stale = [t for t in existing if t not in TABS]
    for tab in stale:
        requests_body.append({"deleteSheet": {"sheetId": existing[tab]}})
    api("POST", token, f"{sheet_id}:batchUpdate", json={"requests": requests_body})
    if stale:
        print(f"Removed non-generated tabs: {stale}")
    print(f"Sheet: https://docs.google.com/spreadsheets/d/{sheet_id}/edit")


# ------------------------------------------------------------ changelog (P6)

def changelog(records):
    if STATE_PATH.exists():
        with open(STATE_PATH) as fh:
            previous = json.load(fh)
    else:
        previous = {}
    current = {r["id"]: {f: r.get(f) for f in FIELDS if f != "id"} for r in records}
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = []
    for item_id, fields in current.items():
        if item_id not in previous:
            lines.append(f"- `{item_id}` · **added to index** · generator · {stamp}")
            continue
        for field, value in fields.items():
            was = previous[item_id].get(field)
            if was != value:
                lines.append(f"- `{item_id}` · `{field}` · {was!r} → {value!r} "
                             f"· generator · {stamp}")
    for item_id in previous:
        if item_id not in current:
            lines.append(f"- `{item_id}` · **removed from index** · generator · {stamp}")

    if not CHANGELOG_PATH.exists():
        CHANGELOG_PATH.write_text(
            "# REGISTRY CHANGELOG — generated by CR-2026-10-04-006\n\n"
            "Append-only. One entry per observed field change, newest section last.\n"
            "`id · field · from → to · authority · date`\n"
        )
    body = "\n".join(lines) if lines else "- No changes since the last generation."
    with open(CHANGELOG_PATH, "a") as fh:
        fh.write(f"\n## {stamp}\n\n{body}\n")
    STATE_PATH.write_text(json.dumps(current, indent=1, default=str))
    print(f"CHANGELOG: {len(lines)} entr{'y' if len(lines) == 1 else 'ies'} appended.")


def sync(dry_run):
    records = load_index()
    views = build_views(records)
    dump_csv(views)
    total = sum(len([r for r in records if route(r) == t]) for t in GATE_TABS)
    unrouted = len([r for r in records if route(r) is None])
    print(f"\nRouting: {total} routed + {unrouted} unrouted = {len(records)} "
          f"(must equal {len(records)})")
    if dry_run:
        print("\n--dry-run: nothing written to Sheets, no CHANGELOG entry, "
              "no state snapshot.")
        return
    push(views)
    changelog(records)


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "bootstrap":
        bootstrap()
    elif command == "audit":
        audit()
    elif command == "propose":
        propose()
    elif command == "sync":
        sync("--dry-run" in sys.argv)
    else:
        sys.exit(__doc__)
