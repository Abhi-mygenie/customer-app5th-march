# MyGenie Customer App - Complete Project Documentation

## Project Overview
A full-stack restaurant customer-facing and admin application for digital menu ordering, built for the MyGenie platform.

**Repository**: https://github.com/Abhi-mygenie/customer-app5th-march.git  
**Database**: External MongoDB at `52.66.232.149:27017` (mygenie database)

---

## Tech Stack

### Frontend
- **React 19** with functional components and hooks
- **React Router v7** for navigation
- **TailwindCSS** for styling
- **React Query** (@tanstack/react-query) for data fetching/caching
- **Radix UI** components for accessible UI primitives
- **react-hot-toast** for notifications
- **react-phone-number-input** for phone validation
- **TipTap** for rich text editing in admin
- **dnd-kit** for drag-and-drop menu ordering

### Backend
- **FastAPI** (Python) with async support
- **Motor** (async MongoDB driver)
- **JWT** authentication with OTP support
- **bcrypt** for password hashing

### External APIs
- **MyGenie POS API** (`https://preprod.mygenie.online/api/v1`)
  - Restaurant details, products, orders
  - Table/room configuration
  - Order placement and updates

---

## Architecture

### Frontend Structure
```
/app/frontend/src/
├── api/                    # API layer
│   ├── config/             # Axios config, endpoints
│   ├── interceptors/       # Request/response interceptors
│   ├── services/           # API service modules
│   └── utils/              # Error handlers, restaurant config
├── components/             # Reusable UI components
│   ├── AdminSettings/      # Admin panel components
│   ├── CartBar/            # Floating cart bar
│   ├── CartWrapper/        # Cart context provider
│   ├── CustomizeItemModal/ # Item customization modal
│   ├── HamburgerMenu/      # Navigation menu
│   ├── Header/             # Page header
│   ├── MenuItem/           # Menu item card
│   ├── OrderItemCard/      # Order review item
│   ├── PromoBanner/        # Promotional banner carousel
│   └── ui/                 # Shadcn/Radix UI components
├── context/                # React contexts
│   ├── AuthContext.jsx     # Authentication state
│   ├── CartContext.js      # Shopping cart state
│   └── RestaurantConfigContext.jsx  # Restaurant config/theming
├── hooks/                  # Custom hooks
│   ├── useMenuData.js      # Menu/restaurant data hooks
│   ├── useScannedTable.js  # QR scanned table detection
│   └── useCurrentTime.js   # Time-based availability
├── pages/                  # Page components
│   ├── LandingPage.jsx     # Restaurant landing
│   ├── MenuItems.jsx       # Menu browsing
│   ├── ReviewOrder.jsx     # Order review/checkout
│   ├── OrderSuccess.jsx    # Order confirmation
│   ├── AdminSettings.jsx   # Admin panel
│   ├── Profile.jsx         # Customer profile
│   └── PasswordSetup.jsx   # Customer password setup
└── utils/                  # Utility functions
    ├── authToken.js        # Token management
    ├── itemAvailability.js # Time-based item availability
    └── useRestaurantId.js  # Restaurant ID extraction
```

### Backend Structure
```
/app/backend/
├── server.py              # Main FastAPI application
├── requirements.txt       # Python dependencies
├── uploads/               # Uploaded images
├── db_data/               # Database JSON exports
└── tests/                 # API tests
```

---

## Core Features

### 1. Customer App

#### Landing Page (`/:restaurantId`)
- Restaurant branding (logo, colors, fonts)
- Welcome message and tagline
- QR-scanned table detection
- Customer capture form (optional)
- Edit Order vs Browse Menu logic
- Social media links
- Call waiter / Pay bill buttons

#### Menu (`/:restaurantId/menu`)
- Category navigation
- Search and filter (Veg/Non-veg/Egg)
- Item customization (variations, add-ons)
- Cart management
- Time-based item availability
- Edit mode for existing orders

#### Order Review (`/:restaurantId/review-order`)
- Cart items with quantity controls
- Previous order items (edit mode)
- Customer details input
- Room/table selection (for hotel restaurants)
- Loyalty points display and redemption
- Coupon code input
- Price breakdown with tax calculation
- Special instructions

#### Order Success (`/:restaurantId/order-success`)
- Order confirmation
- Bill summary
- Food status tracking (Preparing/Ready/Served)

### 2. Admin Panel (`/admin/settings`)

#### Settings Tab
- Logo upload
- Welcome message and tagline
- Browse menu button text
- Restaurant operating hours

#### Branding Tab
- Background images (desktop/mobile)
- Color palette (primary, secondary, text, background)
- Typography (heading/body fonts)
- Border radius style

#### Visibility Tab
- Landing page toggles (logo, welcome, social, table number, etc.)
- Menu page toggles (categories, promotions, FAB button)
- Order page toggles (customer details, loyalty, coupon)
- Order status page toggles

#### Banners Tab
- Add/edit/delete promotional banners
- Display location (landing/menu/both)
- Image upload with dimension validation

#### Content Tab
- About Us content and image
- Contact information (address, email, map embed)
- Footer text and links
- Navigation menu order
- Custom pages (WYSIWYG editor)
- Feedback settings

#### Menu Tab
- Category order (drag-and-drop)
- Category visibility
- Item order per category
- Item visibility per category
- Station-specific ordering (for multi-station restaurants)

---

## Authentication Flow

### Customer Authentication
1. **OTP Login**: Phone number → Send OTP → Verify OTP → JWT token
2. **Password Login**: Phone + Password → Verify → JWT token
3. **Password Setup**: New customers can set password for quicker login

### Admin Authentication
- Email/phone + Password login
- Restaurant-scoped access
- JWT token with 24-hour expiry

---

## Data Models

### Collections
- **customers**: Customer profiles, points, wallet, tier
- **users**: Restaurant admin users
- **customer_app_config**: Per-restaurant app configuration
- **orders**: Order history
- **points_transactions**: Loyalty points history
- **wallet_transactions**: Wallet balance history
- **coupons**: Discount coupons
- **loyalty_settings**: Points earning/redemption rules
- **feedback**: Customer feedback
- **whatsapp_templates**: Notification templates

### Key Config Fields (`customer_app_config`)
```javascript
{
  restaurant_id: "698",
  // Visibility toggles
  showLogo: true,
  showWelcomeText: true,
  showTableNumber: true,
  showLoyaltyPoints: true,
  // Branding
  logoUrl: "/api/uploads/...",
  primaryColor: "#F26B33",
  fontHeading: "Poppins",
  borderRadius: "rounded",
  // Content
  welcomeMessage: "Welcome!",
  tagline: "...",
  banners: [...],
  navMenuOrder: [...],
  menuOrder: { categoryOrder: [...], itemOrder: {...} }
}
```

---

## API Endpoints

### Auth Routes (`/api/auth/`)
- `POST /send-otp` - Send OTP to phone
- `POST /check-customer` - Check if customer exists
- `POST /login` - Unified login (OTP/password)
- `GET /me` - Get current user
- `POST /set-password` - Set customer password
- `POST /verify-password` - Verify password login
- `POST /reset-password` - Reset via OTP

### Customer Routes (`/api/customer/`)
- `GET /profile` - Customer profile
- `PUT /profile` - Update profile
- `GET /orders` - Order history
- `GET /points` - Points transactions
- `GET /wallet` - Wallet balance and history
- `GET /coupons` - Available coupons

### Config Routes (`/api/config/`)
- `GET /{restaurant_id}` - Get app config (public)
- `PUT /` - Update config (admin only)
- `POST /banners` - Add banner
- `PUT /banners/{id}` - Update banner
- `DELETE /banners/{id}` - Delete banner
- `POST /pages` - Add custom page
- `POST /feedback` - Submit feedback

### Utility Routes
- `POST /api/upload/image` - Upload image
- `GET /api/loyalty-settings/{restaurant_id}` - Loyalty rules
- `GET /api/customer-lookup/{restaurant_id}?phone=` - Find customer

---

## Special Features

### Multi-Station Restaurants (e.g., Hyatt - ID 716, 739)
- Separate station selection page
- Station-based menu filtering
- Time-based station availability
- Room/table selection with searchable dropdown

### Loyalty Program
- Tier-based earning (Bronze/Silver/Gold/Platinum)
- Points redemption with configurable value
- First-visit bonus points
- Minimum order value for earning

### Edit Order Flow
1. QR scan detects existing order via `checkTableStatus` API
2. "Edit Order" button shown instead of "Browse Menu"
3. Previous items displayed (read-only)
4. New items added to cart
5. `updateCustomerOrder` API appends to existing order

### Time-Based Availability
- Restaurant operating hours (configurable)
- Station timing (e.g., "7 am - 11 am")
- Item availability windows (`web_available_time_starts`, `web_available_time_ends`)

---

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
DB_NAME=mygenie
JWT_SECRET=customer-app-secret-key-change-in-production
CORS_ORIGINS=*
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://d2hdw3ik-bgqh-ehjd-8888.preview.emergentagent.com
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1
REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online
```

---

## Database Stats (Current)
- Customers: 6,517 records
- Users: 16 records
- App Configs: 25 records
- Collections: 15 total

---

## Implementation Status (Jan 2026)
- ✅ Project cloned and configured
- ✅ MongoDB connected to external database
- ✅ Backend running on port 8001
- ✅ Frontend running on port 3000
- ✅ All dependencies installed

## URLs
- **Preview**: https://d2hdw3ik-bgqh-ehjd-8888.preview.emergentagent.com/698
- **Admin Panel**: /admin/settings
- **Customer App**: /{restaurantId} (e.g., /698)

---

## Future Enhancements
- [ ] Customer analytics dashboard
- [ ] Order history with reorder functionality
- [ ] Push notifications integration
- [ ] Payment gateway integration
- [ ] Multi-language support
