# Customer App - PRD

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march.git
- Branch: 13-july
- Stack: React (TypeScript) + FastAPI (Python) + MongoDB

## What Was Done (2026-07-13)
- Wiped /app (preserved .git and .emergent platform files)
- Pulled branch `13-july` directly into /app
- Created placeholder .env files for backend and frontend

## Architecture
- Backend: FastAPI, single-file server.py, 38 API routes under /api
- Frontend: React + TypeScript + Tailwind CSS
- Database: MongoDB

## Environment Variables

### backend/.env
| Key | Description |
|-----|-------------|
| MONGO_URL | MongoDB connection URI |
| DB_NAME | Database name (default: mygenie) |
| JWT_SECRET | JWT signing secret (generate strong key) |
| MYGENIE_API_URL | MyGenie API base URL |
| MYGENIE_POS_LOGIN_PHONE | POS login phone |
| MYGENIE_POS_LOGIN_PASSWORD | POS login password |
| CORS_ORIGINS | Allowed CORS origins |

### frontend/.env
| Key | Description |
|-----|-------------|
| REACT_APP_BACKEND_URL | FastAPI public URL |
| REACT_APP_API_BASE_URL | MyGenie external API base URL |
| REACT_APP_IMAGE_BASE_URL | Image CDN base URL |
| REACT_APP_RESTAURANT_ID | Restaurant identifier |
| REACT_APP_CRM_URL | CRM API URL |
| REACT_APP_CRM_API_KEY | CRM API key |
| REACT_APP_CRM_API_VERSION | CRM API version (v2) |
| REACT_APP_GOOGLE_MAPS_API_KEY | Google Maps API key |

## Next Steps
- Replace placeholder values in backend/.env and frontend/.env
- Install dependencies: pip install -r backend/requirements.txt && yarn install in frontend/
- Start services via supervisor
