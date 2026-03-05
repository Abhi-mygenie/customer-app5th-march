"""
DB Import Script - Imports all JSON files from db_data/ into MongoDB.
Usage: python db_import.py [--drop]

Options:
  --drop    Drop existing collections before importing (clean import)
  (default) Skip collections that already have data
"""

import os
import sys
import json
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
DATA_DIR = os.path.join(os.path.dirname(__file__), "db_data")


def restore_types(obj):
    """Recursively restore MongoDB types from JSON."""
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


def import_all(drop_existing=False):
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory not found: {DATA_DIR}")
        print("Run db_export.py first to create the data files.")
        sys.exit(1)

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".json") and f != "_manifest.json"]

    if not json_files:
        print("No JSON files found in db_data/")
        sys.exit(1)

    print(f"Importing into database: {DB_NAME}")
    if drop_existing:
        print("Mode: DROP & REPLACE existing data\n")
    else:
        print("Mode: SKIP collections with existing data\n")

    for filename in sorted(json_files):
        col_name = filename.replace(".json", "")
        filepath = os.path.join(DATA_DIR, filename)

        with open(filepath, "r") as f:
            docs = json.load(f)

        if not docs:
            print(f"  Skipped {col_name}: empty file")
            continue

        docs = restore_types(docs)
        existing_count = db[col_name].count_documents({})

        if existing_count > 0 and not drop_existing:
            print(f"  Skipped {col_name}: already has {existing_count} documents (use --drop to replace)")
            continue

        if drop_existing and existing_count > 0:
            db[col_name].drop()
            print(f"  Dropped {col_name} ({existing_count} docs)")

        result = db[col_name].insert_many(docs)
        print(f"  Imported {col_name}: {len(result.inserted_ids)} documents")

    client.close()
    print("\nImport complete!")


if __name__ == "__main__":
    drop = "--drop" in sys.argv
    import_all(drop_existing=drop)
