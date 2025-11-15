import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useAuctionStore from '../store/auctionStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    const token = useAuthStore.getState().token;

    if (!token) {
      console.error('No auth token available');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to auction server');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from auction server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    // Bootstrap
    this.socket.on('bootstrap', ({ lots, user }) => {
      useAuctionStore.getState().setLots(lots);
      useAuthStore.getState().updateUser(user);
    });

    // Lot events
    this.socket.on('lotCreated', (lot) => {
      useAuctionStore.getState().addLot(lot);
    });

    this.socket.on('lotUpdated', (lot) => {
      useAuctionStore.getState().updateLot(lot);
    });

    this.socket.on('lotDeleted', ({ lotId }) => {
      useAuctionStore.getState().deleteLot(lotId);
    });

    // Bid events
    this.socket.on('bidPlaced', ({ lotId, bid }) => {
      // Trigger custom event for UI components
      this.emit('newBid', { lotId, bid });
    });

    this.socket.on('lotExtended', ({ lotId, newEndsAt }) => {
      const lot = useAuctionStore.getState().getLot(lotId);
      if (lot) {
        useAuctionStore.getState().updateLot({
          ...lot,
          endsAt: newEndsAt
        });
      }
      this.emit('lotExtended', { lotId, newEndsAt });
    });

    this.socket.on('bidAccepted', ({ bidId }) => {
      this.emit('bidAccepted', { bidId });
    });

    this.socket.on('bidRejected', ({ reason }) => {
      this.emit('bidRejected', { reason });
    });

    // User update event (for role changes, balance updates, etc.)
    this.socket.on('userUpdated', (user) => {
      console.log('👤 User data updated from server:', user);
      useAuthStore.getState().updateUser(user);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  placeBid(lotId, amount) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('placeBid', { lotId, amount });
  }

  // Event emitter for components
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

const socketService = new SocketService();
export default socketService;
