import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { verifyToken, requireAdmin, socketAuth } from './auth.js';
import { userQueries, lotQueries, bidQueries } from './database.js';

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
    createdAt: lot.created_at ? lot.created_at + 'Z' : null,
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
    avatar: user.discord_avatar || user.google_avatar,
    isAdmin: !!user.is_admin,
    premium: user.premium,
    balance: user.balance || 0
  };
}

// ===== Auto-expire lots timer =====
setInterval(() => {
  const now = new Date();
  const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const activeLots = lotQueries.getActive.all(nowStr);

  activeLots.forEach(lot => {
    const now = new Date();
    const endsAt = new Date(lot.ends_at + 'Z');

    // Debug logging
    const diff = endsAt - now;
    if (diff < 60000) { // Log if less than 1 minute remaining
      console.log('⏰ Lot expiring soon:', {
        id: lot.id,
        title: lot.title,
        now: now.toISOString(),
        endsAt: endsAt.toISOString(),
        diff_seconds: Math.floor(diff / 1000)
      });
    }

    if (now >= endsAt) {
      console.log('🏁 Lot expired:', { id: lot.id, title: lot.title });

      // Get highest bid to determine winner
      const highestBid = bidQueries.getHighestBid.get(lot.id);

      if (highestBid) {
        lotQueries.setWinner.run(highestBid.user_id, lot.id);
      } else {
        lotQueries.updateStatus.run('ended', lot.id);
      }

      const updatedLot = lotQueries.findById.get(lot.id);
      io.emit('lotUpdated', publicLot(updatedLot));
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
app.get('/api/lots', (req, res) => {
  try {
    const status = req.query.status;
    const lots = status
      ? lotQueries.getByStatus.all(status)
      : lotQueries.getAll.all();

    res.json(lots.map(publicLot));
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// Get single lot (public)
app.get('/api/lots/:id', (req, res) => {
  try {
    const lot = lotQueries.findById.get(req.params.id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
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

// Create lot (admin only)
app.post('/api/admin/lots', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, description, imageUrl, startingPrice, minStep, durationMinutes } = req.body;

    if (!title || startingPrice === undefined || !minStep) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const info = lotQueries.create.run(
      title,
      description || '',
      imageUrl || '',
      startingPrice,
      minStep,
      durationMinutes || 60,
      req.user.id
    );

    // Calculate start and end times in JavaScript (UTC)
    const now = new Date();
    const endsAt = new Date(now.getTime() + (durationMinutes || 60) * 60 * 1000);

    // Format as ISO string without 'Z' for SQLite (YYYY-MM-DD HH:MM:SS)
    const formatForSQLite = (date) => {
      return date.toISOString().replace('T', ' ').substring(0, 19);
    };

    // Automatically start the lot with calculated times
    lotQueries.start.run(
      formatForSQLite(now),
      formatForSQLite(endsAt),
      info.lastInsertRowid
    );

    const lot = lotQueries.findById.get(info.lastInsertRowid);

    // Debug logging
    console.log('📦 Lot created:', {
      id: lot.id,
      title: lot.title,
      duration_minutes: lot.duration_minutes,
      started_at: lot.started_at,
      ends_at: lot.ends_at,
      status: lot.status,
      now: new Date().toISOString(),
      ends_at_date: new Date(lot.ends_at).toISOString()
    });

    const publicLotData = publicLot(lot);

    io.emit('lotCreated', publicLotData);

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

    const { title, description, imageUrl, startingPrice, minStep } = req.body;

    lotQueries.update.run(
      title || lot.title,
      description !== undefined ? description : lot.description,
      imageUrl !== undefined ? imageUrl : lot.image_url,
      startingPrice !== undefined ? startingPrice : lot.starting_price,
      minStep !== undefined ? minStep : lot.min_step,
      lot.id
    );

    const updatedLot = lotQueries.findById.get(lot.id);
    const publicLotData = publicLot(updatedLot);

    io.emit('lotUpdated', publicLotData);

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

    lotQueries.start.run(lot.id);

    const updatedLot = lotQueries.findById.get(lot.id);
    const publicLotData = publicLot(updatedLot);

    io.emit('lotUpdated', publicLotData);

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

    io.emit('lotUpdated', publicLotData);

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
setInterval(() => {
  const sockets = io.sockets.sockets;
  sockets.forEach((socket) => {
    if (socket.user && socket.user.id) {
      const freshUser = userQueries.findById.get(socket.user.id);
      if (freshUser) {
        const freshUserData = publicUser(freshUser);
        const currentUserData = publicUser(socket.user);

        // Check if isAdmin status changed
        if (freshUserData.isAdmin !== currentUserData.isAdmin) {
          console.log(`👤 Admin status changed for ${freshUser.username}: ${currentUserData.isAdmin} -> ${freshUserData.isAdmin}`);
          socket.user = freshUser; // Update socket.user
          socket.emit('userUpdated', freshUserData);
        }
      }
    }
  });
}, 30000); // Check every 30 seconds

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.username} (ID: ${socket.user.id})`);

  // Send initial state
  socket.emit('bootstrap', {
    lots: lotQueries.getAll.all().map(publicLot),
    user: publicUser(socket.user)
  });

  // Place bid
  socket.on('placeBid', ({ lotId, amount }) => {
    console.log(`💰 Bid attempt: User ${socket.user.username} (ID: ${socket.user.id}) - Lot ${lotId} - Amount ${amount}`);

    try {
      const lot = lotQueries.findById.get(lotId);

      if (!lot) {
        return socket.emit('bidRejected', { reason: 'Lot not found' });
      }

      if (lot.status !== 'active') {
        return socket.emit('bidRejected', { reason: 'Lot is not active' });
      }

      const currentPrice = lot.current_price || lot.starting_price;
      const minBid = currentPrice + lot.min_step;

      if (amount < minBid) {
        return socket.emit('bidRejected', {
          reason: `Minimum bid is ${minBid}`
        });
      }

      // Check if user has enough balance
      if (socket.user.balance < amount) {
        return socket.emit('bidRejected', {
          reason: `Insufficient balance. You have ${socket.user.balance.toFixed(2)} M¢, but bid requires ${amount} M¢`
        });
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

      io.emit('lotUpdated', publicLot(updatedLot));

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

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.username}`);
  });
});

// ===== Start Server =====

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Auction server running on http://localhost:${PORT}`);
});
