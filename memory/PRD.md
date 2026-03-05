# Customer App - PRD

## Original Problem Statement
Pull the repository from `https://github.com/Abhi-mygenie/customer-app5th-march.git`, set it up, import the database, and build/maintain a full-stack restaurant customer application.

## Tech Stack
- **Frontend**: React, react-router-dom, axios, Tailwind CSS, react-phone-number-input, react-hot-toast, react-icons, tiptap (rich editor), dnd-kit
- **Backend**: Python, FastAPI, pymongo/motor, passlib, bcrypt, PyJWT
- **Database**: MongoDB

## Architecture
- React frontend (port 3000) + FastAPI backend (port 8001) + MongoDB
- All backend routes prefixed with `/api`
- Config-driven UI: restaurant appearance/features controlled via `customer_app_config` collection

## Key DB Schema
- **customer_app_config**: `{ restaurant_id, show*, primaryColor, extraInfoItems, ... }` — UI and feature configs per restaurant
- **users**: `{ id, email, restaurant_id, password_hash, ... }` — Admin users
- **customers**: `{ id, phone, name, user_id, tier, total_points, wallet_balance, ... }` — End customers scoped by `user_id` (e.g., `pos_0001_restaurant_478`)

## Test Credentials
- **Admin**: email: `owner@18march.com`, password: `admin123`, restaurant_id: `478`
- **Customer**: phone: `7505242126` (Abhishek), OTP: `1111` (test OTP)

## What's Been Implemented
- Project setup, DB migration from git repo
- Bug fix: consistent `restaurant_id` usage between admin/frontend
- Configurable "Customer Capture" form on landing page
- Configurable "Extra Info" footer section (up to 5 bullet points)
- Price Breakdown UI redesign on Review Order page
- Footer social icons overlap CSS fix
- **UI width fix**: Added `max-width: 600px` to Profile, Review Order, Order Success pages (2026-03-05)
- Admin Settings page verified working (all 7 tabs functional)

## Backlog
- P2: Auto-create customer on guest order (deferred by user)
- Verify footer social icons fix with user
