# Виртуальный Аукцион - Mileage Riot

Real-time auction application built with React + Node.js + Socket.io, integrated with Hub OAuth.

## Features

- ✅ OAuth authentication through hub.mileageriot.com (Discord, Google, Steam)
- ✅ Real-time bidding with WebSocket (Socket.io)
- ✅ Anti-sniping mechanism (extends auction by 10s if bid placed in last 10s)
- ✅ Admin panel for lot management
- ✅ Fullscreen lot view with visual effects
- ✅ Confetti animations on new bids
- ✅ Sound notifications with volume control
- ✅ Persistent settings in localStorage
- ✅ Responsive design with Tailwind CSS

## Tech Stack

### Frontend
- React 18
- Vite
- React Router 6
- Zustand (state management)
- Socket.io Client
- Tailwind CSS
- React Confetti
- Axios
- date-fns

### Backend
- Node.js (ES Modules)
- Express
- Socket.io
- Better-SQLite3
- Hub API OAuth integration
- JWT authentication

## Project Structure

```
auction_rammstik/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API & Socket services
│   │   ├── store/          # Zustand stores
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env               # Frontend environment variables
│   └── package.json
├── server/                # Node.js backend
│   ├── server.js          # Main server file
│   ├── auth.js            # OAuth & JWT middleware
│   ├── database.js        # SQLite database
│   ├── .env              # Backend environment variables
│   └── package.json
└── README.md
```

## Setup Instructions

### 1. Clone and Navigate

```bash
cd C:\Users\veles\Desktop\auction_rammstik
```

### 2. Setup Backend

```bash
cd server
npm install
```

Edit `server/.env`:
```env
PORT=3001
CLIENT_URL=http://localhost:5173
HUB_API_URL=https://hub.mileageriot.com/api
JWT_SECRET=your_jwt_secret_change_in_production
DATABASE_PATH=./database.sqlite
```

Start the server:
```bash
npm run dev
```

The server will start on http://localhost:3001

### 3. Setup Frontend

```bash
cd ../client
npm install
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_HUB_URL=https://hub.mileageriot.com
```

Start the client:
```bash
npm run dev
```

The app will start on http://localhost:5173

### 4. Hub OAuth Configuration

The application uses hub.mileageriot.com for OAuth authentication.

**OAuth Flow:**
1. User clicks "Войти через Hub" on login page
2. Redirected to `https://hub.mileageriot.com/oauth/authorize?redirect_uri=http://localhost:5173/auth/callback`
3. User logs in via Discord/Google/Steam
4. Hub redirects back with token: `http://localhost:5173/auth/callback?token=xxx`
5. Frontend stores token and connects to auction server

**Admin Users:**
Admin status is determined by `auth()->user()->is_admin()` in Hub (users with IDs: 1, 2, 3, 42).

## Usage

### For Users

1. Open http://localhost:5173
2. Click "Войти через Hub"
3. Authenticate via Discord/Google/Steam
4. Browse active lots
5. Click on a lot to view fullscreen
6. Place bids in real-time
7. Watch for confetti and sound notifications when someone bids

### For Admins

1. Login as admin user
2. Click "Админ-панель" in header
3. Create new lots with:
   - Title
   - Description
   - Image URL
   - Starting price (MC)
   - Minimum bid step (MC)
   - Duration (minutes)
4. Manage existing lots:
   - Start pending lots
   - End active lots
   - Delete lots
5. Configure settings (⚙️):
   - Banner duration
   - Sound notifications
   - Volume
   - Confetti effects

## Database Schema

### Users Table
- Synced from Hub
- Stores: hub_user_id, username, email, avatars, is_admin, premium

### Lots Table
- id, title, description, image_url
- starting_price, current_price, min_step
- duration_minutes, created_at, started_at, ends_at
- status (pending, active, ended, cancelled)
- winner_id, creator_id

### Bids Table
- id, lot_id, user_id, amount, created_at

## API Endpoints

### Public
- `GET /api/health` - Health check
- `GET /api/lots` - Get all lots (optional ?status=active)
- `GET /api/lots/:id` - Get single lot
- `GET /api/lots/:id/bids` - Get lot bids

### Authenticated (Bearer token)
- `GET /api/user` - Get current user

### Admin Only
- `POST /api/admin/lots` - Create lot
- `PUT /api/admin/lots/:id` - Update lot
- `POST /api/admin/lots/:id/start` - Start auction
- `POST /api/admin/lots/:id/end` - End auction
- `DELETE /api/admin/lots/:id` - Delete lot

## WebSocket Events

### Server → Client
- `bootstrap` - Initial state (lots, user)
- `lotCreated` - New lot created
- `lotUpdated` - Lot updated
- `lotDeleted` - Lot deleted
- `bidPlaced` - New bid placed
- `lotExtended` - Auction extended (anti-snipe)
- `bidAccepted` - Bid accepted
- `bidRejected` - Bid rejected (with reason)

### Client → Server
- `placeBid` - Place a bid { lotId, amount }

## Development

### Run both services:

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

### Build for production:

```bash
cd client
npm run build
```

## Environment Variables

### Client (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_SOCKET_URL` - WebSocket server URL
- `VITE_HUB_URL` - Hub OAuth URL

### Server (.env)
- `PORT` - Server port
- `CLIENT_URL` - Frontend URL (for CORS)
- `HUB_API_URL` - Hub API URL for validation
- `JWT_SECRET` - JWT secret (not currently used, reserved)
- `DATABASE_PATH` - SQLite database path

## Troubleshooting

### OAuth not working
- Check that `VITE_HUB_URL` points to https://hub.mileageriot.com
- Verify redirect_uri matches your client URL + /auth/callback
- Check Hub API is accessible

### WebSocket connection failed
- Ensure backend is running on port 3001
- Check CORS settings in server.js
- Verify token is being sent in socket auth

### Admin panel not visible
- Ensure you're logged in as admin (Hub user IDs: 1, 2, 3, or 42)
- Check `is_admin` flag in user data

## License

MIT

## Credits

Built for Mileage Riot community.
