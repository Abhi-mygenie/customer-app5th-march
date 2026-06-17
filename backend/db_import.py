"""
DB Import Script - Imports all JSON files into MongoDB.

Usage:
  python db_import.py                          # Import from db_data/ (skip existing)
  python db_import.py --drop                   # Drop & replace from db_data/
  python db_import.py --source db_export_new/db_export  # Import from another dir
  python db_import.py --upsert                 # Upsert by 'id' field
  python db_import.py --drop --source db_export_new/db_export

Options:
  --drop              Drop existing collections before importing
  --upsert            Upsert documents by 'id' field (update if exists, insert if not)
  --source <dir>      Path to data directory (default: db_data/)
  --dry-run           Show what would be imported without making changes
"""

import os
import sys
import json
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
DEFAULT_DATA_DIR = os.path.join(os.path.dirname(__file__), "db_data")


def restore_types(obj):
    """Recursively restore MongoDB Extended JSON types."""
    if isinstance(obj, dict):
        if "$oid" in obj and len(obj) == 1:
            return ObjectId(obj["$oid"])
        if "$date" in obj and len(obj) == 1:
            try:
                return datetime.fromisoformat(obj["$date"])
            except (ValueError, TypeError):
                return obj["$date"]
        return {k: restore_types(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [restore_types(item) for item in obj]
    return obj


def parse_args():
    args = {
        "drop": False,
        "upsert": False,
        "dry_run": False,
        "source": DEFAULT_DATA_DIR,
    }
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == "--drop":
            args["drop"] = True
        elif arg == "--upsert":
            args["upsert"] = True
        elif arg == "--dry-run":
            args["dry_run"] = True
        elif arg == "--source" and i + 1 < len(sys.argv):
            i += 1
            source = sys.argv[i]
            if not os.path.isabs(source):
                source = os.path.join(os.path.dirname(__file__), source)
            args["source"] = source
        else:
            print(f"Unknown argument: {arg}")
            sys.exit(1)
        i += 1
    return args


def import_all(source_dir, drop_existing=False, upsert=False, dry_run=False):
    if not os.path.exists(source_dir):
        print(f"Error: Data directory not found: {source_dir}")
        sys.exit(1)

    skip_files = {"_manifest.json", "_export_metadata.json", "_summary.json"}
    json_files = sorted(
        f for f in os.listdir(source_dir)
        if f.endswith(".json") and f not in skip_files and not f.startswith("_")
    )

    if not json_files:
        print(f"No JSON files found in {source_dir}")
        sys.exit(1)

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    mode = "DRY RUN" if dry_run else ("DROP & REPLACE" if drop_existing else ("UPSERT" if upsert else "SKIP EXISTING"))
    print(f"Source:   {source_dir}")
    print(f"Database: {DB_NAME}")
    print(f"Mode:     {mode}")
    print(f"Files:    {len(json_files)}")
    print("-" * 50)

    total_imported = 0
    total_skipped = 0

    for filename in json_files:
        col_name = filename.replace(".json", "")
        filepath = os.path.join(source_dir, filename)

        with open(filepath, "r") as f:
            try:
                docs = json.load(f)
            except json.JSONDecodeError as e:
                print(f"  ERROR {col_name}: Invalid JSON - {e}")
                continue

        if not docs:
            print(f"  SKIP  {col_name}: empty file")
            total_skipped += 1
            continue

        # Restore Extended JSON types ($oid, $date)
        docs = restore_types(docs)
        doc_count = len(docs)

        if dry_run:
            print(f"  WOULD  {col_name}: {doc_count} documents")
            total_imported += doc_count
            continue

        existing_count = db[col_name].count_documents({})

        if drop_existing:
            if existing_count > 0:
                db[col_name].drop()
                print(f"  DROP   {col_name}: dropped {existing_count} existing docs")
            result = db[col_name].insert_many(docs)
            print(f"  IMPORT {col_name}: {len(result.inserted_ids)} documents")
            total_imported += len(result.inserted_ids)

        elif upsert:
            upserted = 0
            updated = 0
            inserted_new = 0
            for doc in docs:
                if "id" in doc:
                    res = db[col_name].update_one(
                        {"id": doc["id"]},
                        {"$set": doc},
                        upsert=True,
                    )
                    if res.upserted_id:
                        upserted += 1
                    elif res.modified_count:
                        updated += 1
                elif "_id" in doc:
                    res = db[col_name].update_one(
                        {"_id": doc["_id"]},
                        {"$set": doc},
                        upsert=True,
                    )
                    if res.upserted_id:
                        upserted += 1
                    elif res.modified_count:
                        updated += 1
                else:
                    db[col_name].insert_one(doc)
                    inserted_new += 1
            print(f"  UPSERT {col_name}: {upserted} new, {updated} updated, {inserted_new} inserted (no id)")
            total_imported += upserted + updated + inserted_new

        else:
            if existing_count > 0:
                print(f"  SKIP   {col_name}: already has {existing_count} docs (use --drop or --upsert)")
                total_skipped += 1
                continue
            result = db[col_name].insert_many(docs)
            print(f"  IMPORT {col_name}: {len(result.inserted_ids)} documents")
            total_imported += len(result.inserted_ids)

    print("-" * 50)
    print(f"Done! Imported: {total_imported}, Skipped: {total_skipped}")

    # Show final collection counts
    print("\nCurrent DB state:")
    for col in sorted(db.list_collection_names()):
        print(f"  {col}: {db[col].count_documents({})} docs")

    client.close()


if __name__ == "__main__":
    args = parse_args()
    import_all(
        source_dir=args["source"],
        drop_existing=args["drop"],
        upsert=args["upsert"],
        dry_run=args["dry_run"],
    )
