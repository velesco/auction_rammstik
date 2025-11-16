import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { verifyToken, requireAdmin, socketAuth } from './auth.js';
import { userQueries, lotQueries, bidQueries, chatQueries } from './database.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ===== Helper Functions =====

function publicLot(lot) {
  const bids = bidQueries.getByLot.all(lot.id);
  const highestBid = bidQueries.getHighestBid.get(lot.id);

  return {
    id: lot.id,
    title: lot.title,
    description: lot.description,
    imageUrl: lot.image_url,
    startingPrice: lot.starting_price,
    currentPrice: lot.current_price || lot.starting_price,
    minStep: lot.min_step,
    durationMinutes: lot.duration_minutes,
    vipOnly: Boolean(lot.vip_only),
    createdAt: lot.created_at ? lot.created_at + 'Z' : null,
    scheduledStart: lot.scheduled_start ? lot.scheduled_start + 'Z' : null,
    startedAt: lot.started_at ? lot.started_at + 'Z' : null,
    endsAt: lot.ends_at ? lot.ends_at + 'Z' : null,
    status: lot.status,
    winnerId: lot.winner_id,
    currentBidder: highestBid?.username || null,
    currentBidderAvatar: highestBid?.discord_avatar || highestBid?.google_avatar || null,
    bidsCount: bids.length,
    bids: bids.map(b => ({
      id: b.id,
      amount: b.amount,
      username: b.username,
      avatar: b.discord_avatar || b.google_avatar,
      createdAt: b.created_at ? b.created_at + 'Z' : null
    }))
  };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar || user.discord_avatar || user.google_avatar,
    isAdmin: !!user.is_admin,
    premium: user.premium,
    balance: user.balance || 0
  };
}

// Broadcast lot update to users who can see it (VIP filtering)
function broadcastLotUpdate(eventName, lotData) {
  const lot = typeof lotData.vipOnly !== 'undefined' ? lotData : publicLot(lotData);

  io.sockets.sockets.forEach((socket) => {
    // Send to VIP users or if lot is not VIP only
    if (!lot.vipOnly || socket.user.premium >= 1) {
      socket.emit(eventName, lot);
    }
  });
}

// ===== Auto-start scheduled lots =====
setInterval(() => {
  const now = new Date();

  // Find pending lots that should start now
  const pendingLots = lotQueries.getByStatus.all('pending');

  pendingLots.forEach(lot => {
    if (lot.scheduled_start) {
      const scheduledStart = new Date(lot.scheduled_start + 'Z');
      if (now >= scheduledStart) {
        // Calculate end time
        const endsAt = new Date(now.getTime() + lot.duration_minutes * 60 * 1000);
        const formatForSQLite = (date) => {
          return date.toISOString().replace('T', ' ').substring(0, 19);
        };

        // Start the lot
        lotQueries.start.run(
          formatForSQLite(now),
          formatForSQLite(endsAt),
          lot.id
        );

        const updatedLot = lotQueries.findById.get(lot.id);
        broadcastLotUpdate('lotUpdated', updatedLot);
      }
    }
  });
}, 1000);

// ===== Auto-expire lots timer =====
setInterval(() => {
  const now = new Date();
  const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const activeLots = lotQueries.getActive.all(nowStr);

  activeLots.forEach(lot => {
    const now = new Date();
    const endsAt = new Date(lot.ends_at + 'Z');

    if (now >= endsAt) {

      // Get highest bid to determine winner
      const highestBid = bidQueries.getHighestBid.get(lot.id);

      if (highestBid) {
        lotQueries.setWinner.run(highestBid.user_id, lot.id);
      } else {
        lotQueries.updateStatus.run('ended', lot.id);
      }

      const updatedLot = lotQueries.findById.get(lot.id);
      broadcastLotUpdate('lotUpdated', updatedLot);
    }
  });
}, 1000);

// ===== REST API Routes =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get current user (authenticated)
app.get('/api/user', verifyToken, (req, res) => {
  try {
    res.json(publicUser(req.user));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all lots (public)
app.get('/api/lots', verifyToken, (req, res) => {
  try {
    const status = req.query.status;
    let lots = status
      ? lotQueries.getByStatus.all(status)
      : lotQueries.getAll.all();

    // Filter out VIP lots if user is not VIP
    if (!req.user || req.user.premium < 1) {
      lots = lots.filter(lot => !lot.vip_only);
    }

    res.json(lots.map(publicLot));
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// Get single lot (public)
app.get('/api/lots/:id', verifyToken, (req, res) => {
  try {
    const lot = lotQueries.findById.get(req.params.id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Check if lot is VIP only and user is not VIP
    if (lot.vip_only && (!req.user || req.user.premium < 1)) {
      return res.status(403).json({ error: 'This lot is VIP only' });
    }

    res.json(publicLot(lot));
  } catch (error) {
    console.error('Error fetching lot:', error);
    res.status(500).json({ error: 'Failed to fetch lot' });
  }
});

// Get lot bids (public)
app.get('/api/lots/:id/bids', (req, res) => {
  try {
    const bids = bidQueries.getByLot.all(req.params.id);

    res.json(bids.map(b => ({
      id: b.id,
      amount: b.amount,
      username: b.username,
      avatar: b.discord_avatar || b.google_avatar,
      createdAt: b.created_at
    })));
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Get lot chat messages (public)
app.get('/api/lots/:id/chat', (req, res) => {
  try {
    const messages = chatQueries.getByLot.all(req.params.id);

    res.json(messages.reverse().map(m => ({
      id: m.id,
      userId: m.user_id,
      username: m.username,
      avatar: m.avatar,
      message: m.message,
      createdAt: m.created_at
    })));
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// Create lot (admin only)
app.post('/api/admin/lots', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, description, imageUrl, startingPrice, minStep, durationMinutes, vipOnly, scheduledStart } = req.body;

    if (!title || startingPrice === undefined || !minStep) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format scheduled start time if provided
    let formattedScheduledStart = null;
    if (scheduledStart) {
      const scheduledDate = new Date(scheduledStart);
      formattedScheduledStart = scheduledDate.toISOString().replace('T', ' ').substring(0, 19);
    }

    const info = lotQueries.create.run(
      title,
      description || '',
      imageUrl || '',
      startingPrice,
      minStep,
      durationMinutes || 60,
      vipOnly ? 1 : 0,
      formattedScheduledStart,
      req.user.id
    );

    // Don't auto-start - let admin start manually
    const lot = lotQueries.findById.get(info.lastInsertRowid);

    const publicLotData = publicLot(lot);

    broadcastLotUpdate('lotCreated', publicLotData);

    res.status(201).json(publicLotData);
  } catch (error) {
    console.error('Error creating lot:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// Update lot (admin only)
app.put('/api/admin/lots/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const lot = lotQueries.findById.get(req.params.id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    if (lot.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot edit active or ended lot' });
    }

    const { title, description, imageUrl, startingPrice, minStep, vipOnly, scheduledStart } = req.body;

    // Format scheduled start time if provided
    let formattedScheduledStart = lot.scheduled_start;
    if (scheduledStart !== undefined) {
      if (scheduledStart) {
        const scheduledDate = new Date(scheduledStart);
        formattedScheduledStart = scheduledDate.toISOString().replace('T', ' ').substring(0, 19);
      } else {
        formattedScheduledStart = null;
      }
    }

    lotQueries.update.run(
      title || lot.title,
      description !== undefined ? description : lot.description,
      imageUrl !== undefined ? imageUrl : lot.image_url,
      startingPrice !== undefined ? startingPrice : lot.starting_price,
      minStep !== undefined ? minStep : lot.min_step,
      vipOnly !== undefined ? (vipOnly ? 1 : 0) : lot.vip_only,
      formattedScheduledStart,
      lot.id
    );

    const updatedLot = lotQueries.findById.get(lot.id);
    const publicLotData = publicLot(updatedLot);

    broadcastLotUpdate('lotUpdated', publicLotData);

    res.json(publicLotData);
  } catch (error) {
    console.error('Error updating lot:', error);
    res.status(500).json({ error: 'Failed to update lot' });
  }
});

// Start lot (admin only)
app.post('/api/admin/lots/:id/start', verifyToken, requireAdmin, (req, res) => {
  try {
    const lot = lotQueries.findById.get(req.params.id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    if (lot.status !== 'pending') {
      return res.status(400).json({ error: 'Lot already started or ended' });
    }

    // Calculate start and end times in JavaScript (UTC)
    const now = new Date();
    const endsAt = new Date(now.getTime() + lot.duration_minutes * 60 * 1000);

    // Format as ISO string without 'Z' for SQLite (YYYY-MM-DD HH:MM:SS)
    const formatForSQLite = (date) => {
      return date.toISOString().replace('T', ' ').substring(0, 19);
    };

    // Start the lot with calculated times
    lotQueries.start.run(
      formatForSQLite(now),
      formatForSQLite(endsAt),
      lot.id
    );

    const updatedLot = lotQueries.findById.get(lot.id);
    const publicLotData = publicLot(updatedLot);

    broadcastLotUpdate('lotUpdated', publicLotData);

    res.json(publicLotData);
  } catch (error) {
    console.error('Error starting lot:', error);
    res.status(500).json({ error: 'Failed to start lot' });
  }
});

// End lot manually (admin only)
app.post('/api/admin/lots/:id/end', verifyToken, requireAdmin, (req, res) => {
  try {
    const lot = lotQueries.findById.get(req.params.id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    if (lot.status !== 'active') {
      return res.status(400).json({ error: 'Lot is not active' });
    }

    const highestBid = bidQueries.getHighestBid.get(lot.id);

    if (highestBid) {
      lotQueries.setWinner.run(highestBid.user_id, lot.id);
    } else {
      lotQueries.updateStatus.run('ended', lot.id);
    }

    const updatedLot = lotQueries.findById.get(lot.id);
    const publicLotData = publicLot(updatedLot);

    broadcastLotUpdate('lotUpdated', publicLotData);

    res.json(publicLotData);
  } catch (error) {
    console.error('Error ending lot:', error);
    res.status(500).json({ error: 'Failed to end lot' });
  }
});

// Delete lot (admin only)
app.delete('/api/admin/lots/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const lot = lotQueries.findById.get(req.params.id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    lotQueries.delete.run(lot.id);

    io.emit('lotDeleted', { lotId: lot.id });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lot:', error);
    res.status(500).json({ error: 'Failed to delete lot' });
  }
});

// ===== WebSocket Events =====

io.use(socketAuth);

// Periodic user data sync (check for role changes, etc.)
setInterval(async () => {
  const sockets = io.sockets.sockets;

  for (const socket of sockets.values()) {
    if (socket.user && socket.user.hub_user_id) {
      try {
        // Fetch fresh data from Hub API
        const hubResponse = await fetch(`${process.env.HUB_API_URL}/oauth/user`, {
          headers: {
            'Authorization': `Bearer ${socket.handshake.auth.token}`,
            'Accept': 'application/json'
          }
        });

        if (!hubResponse.ok) continue;

        const hubUser = await hubResponse.json();

        // Update local database - preserve OAuth fields, use nullish coalescing for premium/balance
        // Ensure all values are SQLite-compatible (no undefined, booleans converted to 0/1)
        const updateParams = {
          name: hubUser.name || null,
          email: hubUser.email || null,
          discord_id: socket.user.discord_id || null,
          google_id: socket.user.google_id || null,
          steam_id: socket.user.steam_id || null,
          discord_avatar: hubUser.avatar || socket.user.discord_avatar || null,
          google_avatar: socket.user.google_avatar || null,
          is_admin: (hubUser.isAdmin || hubUser.admin) ? 1 : 0, // Explicit 0/1 conversion
          premium: hubUser.premium ?? 0,
          balance: hubUser.balance ?? 0,
          hub_user_id: socket.user.hub_user_id
        };

        userQueries.update.run(
          updateParams.name,
          updateParams.email,
          updateParams.discord_id,
          updateParams.google_id,
          updateParams.steam_id,
          updateParams.discord_avatar,
          updateParams.google_avatar,
          updateParams.is_admin,
          updateParams.premium,
          updateParams.balance,
          updateParams.hub_user_id
        );

        // Get updated user from database
        const freshUser = userQueries.findByHubId.get(socket.user.hub_user_id);
        if (freshUser) {
          const freshUserData = publicUser(freshUser);
          const currentUserData = publicUser(socket.user);

          // Check if isAdmin or premium status changed
          const adminChanged = freshUserData.isAdmin !== currentUserData.isAdmin;
          const premiumChanged = freshUserData.premium !== currentUserData.premium;

          if (adminChanged || premiumChanged) {
            socket.user = freshUser; // Update socket.user
            socket.emit('userUpdated', freshUserData);
          }
        }
      } catch (error) {
        console.error(`Error syncing user ${socket.user.username}:`, error.message);
        console.error('Debug info:', {
          hubUserId: socket.user?.hub_user_id,
          socketUserFields: socket.user ? Object.keys(socket.user).reduce((acc, key) => {
            acc[key] = typeof socket.user[key];
            return acc;
          }, {}) : 'no socket.user'
        });
      }
    }
  }
}, 30000); // Check every 30 seconds

io.on('connection', (socket) => {

  // Send initial state - filter VIP lots if user is not VIP
  let allLots = lotQueries.getAll.all();
  if (socket.user.premium < 1) {
    allLots = allLots.filter(lot => !lot.vip_only);
  }

  socket.emit('bootstrap', {
    lots: allLots.map(publicLot),
    user: publicUser(socket.user)
  });

  // Place bid
  socket.on('placeBid', ({ lotId, amount }) => {

    try {
      const lot = lotQueries.findById.get(lotId);

      if (!lot) {
        return socket.emit('bidRejected', { reason: 'Lot not found' });
      }

      if (lot.status !== 'active') {
        return socket.emit('bidRejected', { reason: 'Lot is not active' });
      }

      // Check if lot is VIP only
      if (lot.vip_only && socket.user.premium < 1) {
        return socket.emit('bidRejected', {
          reason: 'Этот лот доступен только для VIP пользователей'
        });
      }

      const currentPrice = lot.current_price || lot.starting_price;
      const minBid = currentPrice + lot.min_step;

      if (amount < minBid) {
        return socket.emit('bidRejected', {
          reason: `Минимальная ставка: ${minBid} M¢`
        });
      }

      // Check if user has enough balance - if not, auto-adjust to max possible
      if (socket.user.balance < amount) {
        // Check if user can afford at least the minimum bid
        if (socket.user.balance < minBid) {
          return socket.emit('bidRejected', {
            reason: `Недостаточно средств. У вас ${socket.user.balance.toFixed(2)} M¢, минимальная ставка: ${minBid} M¢`
          });
        }
        // Auto-adjust to max possible amount (all balance)
        amount = socket.user.balance;
      }

      // Check if bid is in last 10 seconds - extend time
      const now = new Date();
      const endsAt = new Date(lot.ends_at);
      const remainingMs = endsAt - now;

      if (remainingMs > 0 && remainingMs <= 10000) {
        lotQueries.extendTime.run(lot.id);

        const extendedLot = lotQueries.findById.get(lot.id);

        io.emit('lotExtended', {
          lotId: lot.id,
          newEndsAt: extendedLot.ends_at
        });
      }

      // Create bid
      const bidInfo = bidQueries.create.run(lot.id, socket.user.id, amount);

      // Update lot current price
      lotQueries.updateCurrentPrice.run(amount, lot.id);

      const bid = bidQueries.findById.get(bidInfo.lastInsertRowid);
      const updatedLot = lotQueries.findById.get(lot.id);

      // Emit events
      io.emit('bidPlaced', {
        lotId: lot.id,
        bid: {
          id: bid.id,
          amount: bid.amount,
          username: socket.user.username,
          avatar: socket.user.discord_avatar || socket.user.google_avatar,
          createdAt: bid.created_at
        }
      });

      broadcastLotUpdate('lotUpdated', updatedLot);

      socket.emit('bidAccepted', { bidId: bid.id });

      // Send updated user data (balance may have changed)
      const freshUser = userQueries.findById.get(socket.user.id);
      if (freshUser) {
        socket.emit('userUpdated', publicUser(freshUser));
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      socket.emit('bidRejected', { reason: 'Failed to place bid' });
    }
  });

  // Delete bid (admin only)
  socket.on('deleteBid', ({ bidId, lotId }) => {
    try {

      // Check if user is admin
      if (!socket.user.is_admin) {
        return socket.emit('actionRejected', { reason: 'Требуются права администратора' });
      }

      // Check if bid exists
      const bid = bidQueries.findById.get(bidId);
      if (!bid) {
        return socket.emit('actionRejected', { reason: 'Ставка не найдена' });
      }

      // Delete the bid
      bidQueries.delete.run(bidId);

      // Get updated lot to recalculate current price
      const lot = lotQueries.findById.get(lotId);
      if (!lot) {
        return socket.emit('actionRejected', { reason: 'Лот не найден' });
      }

      // Find new highest bid
      const highestBid = bidQueries.getHighestBid.get(lotId);
      const newCurrentPrice = highestBid ? highestBid.amount : null;

      // Update lot current price
      lotQueries.updateCurrentPrice.run(newCurrentPrice, lotId);

      // Get updated lot and broadcast
      const updatedLot = lotQueries.findById.get(lotId);
      broadcastLotUpdate('lotUpdated', updatedLot);
    } catch (error) {
      console.error('Error deleting bid:', error);
      socket.emit('actionRejected', { reason: 'Не удалось удалить ставку' });
    }
  });

  // Send chat message
  socket.on('sendChatMessage', ({ lotId, message }) => {
    try {
      if (!message || message.trim().length === 0) {
        return socket.emit('chatError', { reason: 'Сообщение не может быть пустым' });
      }

      if (message.length > 500) {
        return socket.emit('chatError', { reason: 'Сообщение слишком длинное (макс. 500 символов)' });
      }

      const lot = lotQueries.findById.get(lotId);
      if (!lot) {
        return socket.emit('chatError', { reason: 'Лот не найден' });
      }

      // Get user avatar - prioritize generic avatar field
      const avatar = socket.user.avatar || socket.user.discord_avatar || socket.user.google_avatar || null;

      // Save message to database
      const result = chatQueries.create.run(
        lotId,
        socket.user.id,
        socket.user.username,
        avatar,
        message.trim()
      );

      // Broadcast message to all users viewing this lot
      const chatMessage = {
        id: result.lastInsertRowid,
        lotId,
        userId: socket.user.id,
        username: socket.user.username,
        avatar,
        message: message.trim(),
        createdAt: new Date().toISOString()
      };

      io.emit('newChatMessage', chatMessage);
    } catch (error) {
      console.error('Error sending chat message:', error);
      socket.emit('chatError', { reason: 'Не удалось отправить сообщение' });
    }
  });

  socket.on('disconnect', () => {
  });
});

// ===== Start Server =====

const PORT = process.env.PORT || 3001;

server.listen(PORT);
