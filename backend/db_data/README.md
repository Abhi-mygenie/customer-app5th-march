# Database Export / Import

Pre-exported MongoDB data for this project. Use these scripts to restore the full database when setting up a new project from Git.

## Quick Start

### Export (save current DB to files)
```bash
cd /app/backend
python db_export.py
```
Saves all collections as JSON files in `db_data/`.

### Import (restore DB from files)
```bash
cd /app/backend
python db_import.py          # Skips collections that already have data
python db_import.py --drop    # Drops existing data and does a clean import
```

## What's Included

| Collection | Records | Description |
|---|---|---|
| `customer_app_config` | 12 | Restaurant branding, CMS content, nav menus |
| `users` | 6 | Admin accounts |
| `customers` | 1,967 | Customer profiles |
| `points_transactions` | 280 | Loyalty point history |
| `wallet_transactions` | 81 | Wallet transaction history |
| `feedback` | 25 | Customer feedback |
| `loyalty_settings` | 7 | Loyalty program config |
| `segments` | 4 | Customer segments |
| `coupons` | 3 | Discount coupons |

## Test Credentials
- **Admin 1**: `owner@18march.com` / `admin123`
- **Admin 2**: `owner@kunafamahal.com` / `admin123`
