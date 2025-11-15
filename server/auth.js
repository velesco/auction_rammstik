import axios from 'axios';
import { userQueries } from './database.js';

const HUB_API_URL = process.env.HUB_API_URL || 'http://localhost:8000/api';

// Middleware to verify JWT token from Hub
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify token with Hub API - use /api/oauth/user endpoint
    const response = await axios.get(`${HUB_API_URL}/oauth/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (!response.data) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const hubUser = response.data;

    // Check admin status - sync with Hub's isAdmin field
    // If Hub doesn't provide isAdmin field, default to false
    const isAdmin = hubUser.isAdmin || hubUser.admin || false;

    // Sync user to local database
    let user = userQueries.findByHubId.get(hubUser.id);

    if (!user) {
      // Create new user
      userQueries.create.run(
        hubUser.id,
        hubUser.username || hubUser.name || 'User',
        hubUser.email || null,
        hubUser.discord_id || null,
        hubUser.google_id || null,
        hubUser.steam_id || null,
        hubUser.discord_avatar || null,
        hubUser.google_avatar || null,
        isAdmin ? 1 : 0,
        hubUser.premium || 0,
        hubUser.balance || 0
      );
      user = userQueries.findByHubId.get(hubUser.id);
    } else {
      // Update existing user - ensure all values are SQLite-compatible
      userQueries.update.run(
        hubUser.username || hubUser.name || user.username || null,
        hubUser.email || user.email || null,
        hubUser.discord_id || user.discord_id || null,
        hubUser.google_id || user.google_id || null,
        hubUser.steam_id || user.steam_id || null,
        hubUser.discord_avatar || user.discord_avatar || null,
        hubUser.google_avatar || user.google_avatar || null,
        isAdmin ? 1 : 0, // Explicit 0/1 conversion
        hubUser.premium ?? user.premium ?? 0, // Use ?? to allow premium = 0
        hubUser.balance ?? user.balance ?? 0, // Use ?? to allow balance = 0
        hubUser.id
      );
      user = userQueries.findByHubId.get(hubUser.id);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    if (error.response) {
      console.error('Hub API response status:', error.response.status);
      console.error('Hub API response data:', error.response.data);
    }
    return res.status(401).json({ error: 'Authentication failed', details: error.message });
  }
}

// Middleware to check if user is admin
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
}

// Socket.io authentication middleware
export async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify token with Hub API - use /api/oauth/user endpoint
    const response = await axios.get(`${HUB_API_URL}/oauth/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (!response.data) {
      return next(new Error('Invalid token'));
    }

    const hubUser = response.data;

    // Check admin status - sync with Hub's isAdmin field
    // If Hub doesn't provide isAdmin field, default to false
    const isAdmin = hubUser.isAdmin || hubUser.admin || false;

    // Get or create user in local database
    let user = userQueries.findByHubId.get(hubUser.id);

    if (!user) {
      userQueries.create.run(
        hubUser.id,
        hubUser.username || hubUser.name || 'User',
        hubUser.email || null,
        hubUser.discord_id || null,
        hubUser.google_id || null,
        hubUser.steam_id || null,
        hubUser.discord_avatar || null,
        hubUser.google_avatar || null,
        isAdmin ? 1 : 0,
        hubUser.premium || 0,
        hubUser.balance || 0
      );
      user = userQueries.findByHubId.get(hubUser.id);
    } else {
      // Update user data - ensure all values are SQLite-compatible
      userQueries.update.run(
        hubUser.username || hubUser.name || user.username || null,
        hubUser.email || user.email || null,
        hubUser.discord_id || user.discord_id || null,
        hubUser.google_id || user.google_id || null,
        hubUser.steam_id || user.steam_id || null,
        hubUser.discord_avatar || user.discord_avatar || null,
        hubUser.google_avatar || user.google_avatar || null,
        isAdmin ? 1 : 0, // Explicit 0/1 conversion
        hubUser.premium ?? user.premium ?? 0, // Use ?? to allow premium = 0
        hubUser.balance ?? user.balance ?? 0, // Use ?? to allow balance = 0
        hubUser.id
      );
      user = userQueries.findByHubId.get(hubUser.id);
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
}

// Get user info from Hub API
export async function getUserFromHub(token) {
  try {
    const response = await axios.get(`${HUB_API_URL}/oauth/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user from Hub:', error.message);
    return null;
  }
}
