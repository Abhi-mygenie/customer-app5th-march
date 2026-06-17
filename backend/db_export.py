"""
DB Export Script - Exports all MongoDB collections to JSON files.
Usage: python db_export.py
Output: /app/backend/db_data/<collection_name>.json
"""

import os
import json
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "db_data")


class MongoJSONEncoder(json.JSONEncoder):
    """Custom encoder to handle MongoDB-specific types."""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return {"$oid": str(obj)}
        if isinstance(obj, datetime):
            return {"$date": obj.isoformat()}
        return super().default(obj)


def export_all():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    collections = db.list_collection_names()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    manifest = {"exported_at": datetime.utcnow().isoformat(), "db_name": DB_NAME, "collections": {}}

    for col_name in sorted(collections):
        docs = list(db[col_name].find())
        count = len(docs)
        filepath = os.path.join(OUTPUT_DIR, f"{col_name}.json")

        with open(filepath, "w") as f:
            json.dump(docs, f, cls=MongoJSONEncoder, indent=2)

        manifest["collections"][col_name] = count
        print(f"  Exported {col_name}: {count} documents")

    # Write manifest
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    client.close()
    print(f"\nAll data exported to {OUTPUT_DIR}/")
    print(f"Total collections: {len(collections)}")


if __name__ == "__main__":
    export_all()
