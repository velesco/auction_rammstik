# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time auction application built with **React**, **Node.js**, **SQLite**, and **Socket.io**, integrated with **Mileage Riot Hub OAuth** authentication. The application allows users to bid on auction lots in real-time with admin controls.

**Key Features:**
- OAuth authentication via Hub (Discord, Google, Steam)
- Real-time bidding with WebSocket (Socket.io)
- Role-based access control (`is_admin` check from Hub)
- SQLite database with better-sqlite3
- React frontend with Zustand state management
- Anti-sniping mechanism (10s auto-extension)
- Visual effects (confetti, sound, banners)
- Admin panel for lot management

## Development Commands

### Server Setup
```bash
cd server
npm install
npm run dev        # Development with nodemon
npm start          # Production
```

Server runs on `http://localhost:3001` (default PORT from .env)

### Client Setup
```bash
cd client
npm install
npm run dev        # Development with Vite HMR
npm run build      # Production build
npm run preview    # Preview production build
```

Client runs on `http://localhost:5173` (Vite default)

### Testing Locally
1. Ensure Hub OAuth server is running (http://localhost:8000)
2. Start both server and client in separate terminals
3. Open browser to http://localhost:5173
4. Sign in with Hub OAuth
5. Open multiple tabs/windows to test real-time bidding

## Architecture

### Backend Architecture (server/)

**Tech Stack:** Node.js + Express + Socket.io + SQLite (better-sqlite3)

**Core Files:**
- [server/server.js](server/server.js) - Main server, Socket.io handlers, REST API
- [server/database.js](server/database.js) - SQLite schema, prepared queries
- [server/auth.js](server/auth.js) - OAuth middleware, JWT validation
- [server/.env.example](server/.env.example) - Environment configuration template

**Database Schema (SQLite):**

1. **users** - Synced from Hub OAuth
   - `id` (PK), `hub_user_id` (unique from Hub)
   - `username`, `email`
   - `discord_id`, `google_id`, `steam_id`
   - `discord_avatar`, `google_avatar`
   - `is_admin` (boolean, from Hub)
   - `premium` (tier 0-4, from Hub Discord roles)

2. **lots** - Auction items
   - `id` (PK), `title`, `description`, `image_url`
   - `starting_price`, `current_price`, `min_step`
   - `duration_minutes`, `created_at`, `started_at`, `ends_at`
   - `status` (pending/active/ended/cancelled)
   - `winner_id` (FK → users), `creator_id` (FK → users)

3. **bids** - Bid history
   - `id` (PK), `lot_id` (FK → lots), `user_id` (FK → users)
   - `amount`, `created_at`

**Authentication Flow:**
1. Client redirects to Hub OAuth (`/oauth/authorize`)
2. Hub authenticates via Discord/Google/Steam
3. Hub redirects back with JWT token
4. Server validates JWT with Hub API (`POST /api/auth/validate-jwt`)
5. User data synced to local SQLite (create or update)
6. `is_admin` flag determines admin access

**REST API Endpoints:**

Public:
- `GET /api/lots` - List all lots (optional `?status=active`)
- `GET /api/lots/:id` - Get single lot
- `GET /api/lots/:id/bids` - Get bid history

Admin-only (requires `is_admin`):
- `POST /api/admin/lots` - Create lot
- `PUT /api/admin/lots/:id` - Update lot (only pending lots)
- `POST /api/admin/lots/:id/start` - Start auction
- `POST /api/admin/lots/:id/end` - End auction manually
- `DELETE /api/admin/lots/:id` - Delete lot

**WebSocket Events (Socket.io):**

Server → Client:
- `bootstrap` - Initial state (lots + user info)
- `lotCreated` / `lotUpdated` / `lotDeleted` - Lot lifecycle
- `bidPlaced` - New bid notification (triggers UI effects)
- `bidAccepted` / `bidRejected` - Bid response
- `lotExtended` - Anti-snipe time extension

Client → Server:
- `placeBid` - Submit bid `{ lotId, amount }`

**Auto-Expiration Timer:**
Server checks every 1 second for expired auctions (server.js:67-80). When lot expires, highest bidder wins automatically.

**Anti-Snipe Logic (server.js:232-238):**
If bid placed in last 10 seconds of auction, extends `endsAt` by +10 seconds.

### Frontend Architecture (client/)

**Tech Stack:** React 18 + Vite + Zustand + React Router + Socket.io-client

**Core Files:**
- [client/src/App.jsx](client/src/App.jsx) - Main app, routing setup
- [client/src/main.jsx](client/src/main.jsx) - Entry point
- [client/vite.config.js](client/vite.config.js) - Vite configuration

**State Management (Zustand):**

1. **authStore** ([client/src/store/authStore.js](client/src/store/authStore.js))
   - `user` - Current user object
   - `token` - JWT token from Hub
   - `isAuthenticated` - Boolean
   - `isAdmin()` - Function to check admin status
   - Persisted to localStorage

2. **auctionStore** ([client/src/store/auctionStore.js](client/src/store/auctionStore.js))
   - `lots` - Map of lotId → lot objects
   - `settings` - Notification preferences (banner, sound, confetti)
   - Helper methods: `getLot()`, `getActiveLots()`, etc.

**Services:**

1. **socket.js** ([client/src/services/socket.js](client/src/services/socket.js))
   - Socket.io connection manager
   - Authenticates with JWT token
   - Listens to server events, updates Zustand stores
   - Custom event emitter for components

2. **api.js** ([client/src/services/api.js](client/src/services/api.js))
   - Axios instance with auth interceptor
   - `lotsApi` - Public endpoints
   - `adminApi` - Admin endpoints
   - `authApi` - OAuth helpers

**Pages:**

1. **LoginPage** ([client/src/pages/LoginPage.jsx](client/src/pages/LoginPage.jsx))
   - OAuth login button
   - Redirects to Hub

2. **AuthCallback** ([client/src/pages/AuthCallback.jsx](client/src/pages/AuthCallback.jsx))
   - Handles OAuth redirect
   - Extracts token from URL
   - Saves to authStore
   - Redirects to auction page

3. **AuctionPage** ([client/src/pages/AuctionPage.jsx](client/src/pages/AuctionPage.jsx))
   - Main auction interface
   - Displays lot grid
   - Opens fullscreen lot view
   - Settings modal for admins

4. **AdminPage** ([client/src/pages/AdminPage.jsx](client/src/pages/AdminPage.jsx))
   - Admin-only (protected by AdminRoute)
   - Create lot form
   - Manage lots (start/end/delete)
   - Organized by status (pending/active/ended)

**Components:**

- **Header** - Top navigation, user avatar, logout
- **LotCard** - Lot preview card in grid
- **LotFullscreen** - Full lot view with bidding
- **SettingsModal** - Notification preferences (admin-only)
- **Toast** - Temporary notifications
- **PrivateRoute** - Requires authentication
- **AdminRoute** - Requires `is_admin`

**Real-time Features:**

1. **Bid Notifications** (LotFullscreen.jsx)
   - Shows banner with bidder name and amount
   - Plays beep sound (WebAudio)
   - Confetti animation (react-confetti)
   - Duration/volume controlled by settings

2. **Live Timer Updates**
   - Updates every 250ms
   - Shows MM:SS countdown
   - Auto-updates on time extension

## Important Implementation Details

### Admin Access Control

**Backend Check** ([server/auth.js:68-77](server/auth.js:68-77)):
```javascript
export function requireAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}
```

**Frontend Check** ([client/src/components/AdminRoute.jsx](client/src/components/AdminRoute.jsx)):
```javascript
if (!user?.isAdmin) {
  return <AccessDenied />;
}
```

Admin status comes from Hub (`auth()->user()->is_admin()`) and is synced to local SQLite.

### Bid Validation

**Minimum Bid Calculation** (server.js:211-219):
```javascript
const currentPrice = lot.current_price || lot.starting_price;
const minBid = currentPrice + lot.min_step;

if (amount < minBid) {
  return socket.emit('bidRejected', { reason: `Minimum bid is ${minBid}` });
}
```

### Database Queries

All queries use prepared statements for performance:
```javascript
lotQueries.findById.get(id)         // Get single lot
lotQueries.getActive.all()          // Get all active lots
bidQueries.create.run(lotId, userId, amount)  // Insert bid
```

See [server/database.js](server/database.js) for all queries.

### Socket.io Authentication

Socket connection requires valid JWT token:
```javascript
const socket = io(SOCKET_URL, {
  auth: { token },  // JWT from authStore
  reconnection: true
});
```

Server validates token on connect via `socketAuth` middleware (auth.js:80-109).

## Common Modifications

### Adding New Lot Fields

1. **Database**: Update `lots` table in [server/database.js:27-48](server/database.js:27-48)
2. **Server**: Update `createLot` query and `publicLot()` function
3. **Client**: Add input to create form in [AdminPage.jsx](client/src/pages/AdminPage.jsx)
4. **Display**: Update LotCard and LotFullscreen components

### Modifying Anti-Snipe Timer

Change extension time in [server/server.js:232-238](server/server.js:232-238):
```javascript
if (remainingMs > 0 && remainingMs <= 10000) {  // Last 10s
  lotQueries.extendTime.run(lot.id);  // +10s extension
}
```

### Customizing Notifications

Default settings in [auctionStore.js:10-15](client/src/store/auctionStore.js:10-15):
```javascript
settings: {
  bannerMs: 4000,    // Banner duration
  sound: true,       // Enable sound
  volume: 0.6,       // 60% volume
  confetti: true     // Enable confetti
}
```

Users can customize via Settings modal (admin-only).

### Changing OAuth Provider

Update Hub configuration in [server/.env](server/.env.example):
```env
HUB_URL=http://your-hub-domain.com
HUB_API_URL=http://your-hub-domain.com/api
```

Hub supports Discord, Google, and Steam OAuth out of the box.

## File Structure

```
auction_rammstik/
├── server/
│   ├── server.js           # Main server, Socket.io, REST API
│   ├── database.js         # SQLite schema and queries
│   ├── auth.js             # OAuth middleware
│   ├── .env.example        # Environment template
│   ├── package.json        # Server dependencies
│   └── database.sqlite     # SQLite database (auto-created)
│
├── client/
│   ├── src/
│   │   ├── App.jsx         # Main app component
│   │   ├── main.jsx        # Entry point
│   │   ├── index.css       # Global styles
│   │   ├── pages/          # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AuthCallback.jsx
│   │   │   ├── AuctionPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── components/     # Reusable components
│   │   │   ├── Header.jsx
│   │   │   ├── LotCard.jsx
│   │   │   ├── LotFullscreen.jsx
│   │   │   ├── SettingsModal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── PrivateRoute.jsx
│   │   │   └── AdminRoute.jsx
│   │   ├── store/          # Zustand stores
│   │   │   ├── authStore.js
│   │   │   └── auctionStore.js
│   │   ├── services/       # API and Socket services
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   └── utils/          # Utilities
│   │       └── sound.js
│   ├── index.html          # HTML template
│   ├── vite.config.js      # Vite configuration
│   └── package.json        # Client dependencies
│
├── index.html              # Legacy (replaced by React)
├── server.js               # Legacy (replaced by server/)
├── package.json            # Legacy
├── README.md               # Setup instructions
└── CLAUDE.md               # This file
```

## Environment Variables

### Server (.env)

Required:
- `PORT` - Server port (default: 3001)
- `HUB_URL` - Hub base URL
- `HUB_API_URL` - Hub API URL
- `SESSION_SECRET` - Session encryption key
- `JWT_SECRET` - JWT signing key
- `CLIENT_URL` - CORS allowed origin

Optional:
- `DATABASE_PATH` - SQLite file path (default: ./database.sqlite)
- `NODE_ENV` - Environment (development/production)

### Client (.env)

Optional:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)
- `VITE_SOCKET_URL` - Socket.io URL (default: http://localhost:3001)
- `VITE_HUB_URL` - Hub URL (default: http://localhost:8000)

## Security Considerations

1. **Admin Check**: Always verify `is_admin` on both client and server
2. **JWT Validation**: All protected routes validate JWT with Hub API
3. **SQL Injection**: Uses prepared statements (better-sqlite3)
4. **CORS**: Restrict `CLIENT_URL` in production
5. **Token Storage**: JWT stored in localStorage (consider httpOnly cookies for production)

## Troubleshooting

### Socket.io Connection Issues
- Ensure server running on correct port
- Check CORS settings in server.js
- Verify JWT token in authStore

### Authentication Fails
- Check Hub server is running
- Verify HUB_URL and HUB_API_URL
- Test JWT validation endpoint manually

### Database Errors
- Delete database.sqlite to reset
- Check file permissions
- Verify DATABASE_PATH

### Build Errors
- Run `npm install` in both server/ and client/
- Check Node.js version (18+)
- Clear node_modules and reinstall
