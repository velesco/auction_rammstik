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

    console.log('🔍 Hub user data:', JSON.stringify(hubUser, null, 2));

    // Check admin status - Hardcoded admin IDs (modify this list to add/remove admins)
    const isAdmin = [2, 3, 42].includes(hubUser.id);
    console.log('✅ User ID:', hubUser.id, 'Is Admin:', isAdmin);

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
      // Update existing user
      userQueries.update.run(
        hubUser.username || hubUser.name || user.username,
        hubUser.email || user.email,
        hubUser.discord_id || user.discord_id,
        hubUser.google_id || user.google_id,
        hubUser.steam_id || user.steam_id,
        hubUser.discord_avatar || user.discord_avatar,
        hubUser.google_avatar || user.google_avatar,
        isAdmin ? 1 : 0,
        hubUser.premium || user.premium,
        hubUser.balance || user.balance || 0,
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

    // Check admin status - Hardcoded admin IDs (modify this list to add/remove admins)
    const isAdmin = [2, 3, 42].includes(hubUser.id);

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
      // Update user data
      userQueries.update.run(
        hubUser.username || hubUser.name || user.username,
        hubUser.email || user.email,
        hubUser.discord_id || user.discord_id,
        hubUser.google_id || user.google_id,
        hubUser.steam_id || user.steam_id,
        hubUser.discord_avatar || user.discord_avatar,
        hubUser.google_avatar || user.google_avatar,
        isAdmin ? 1 : 0,
        hubUser.premium || user.premium,
        hubUser.balance || user.balance || 0,
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
