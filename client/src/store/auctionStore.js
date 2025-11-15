import { create } from 'zustand';

const useAuctionStore = create((set, get) => ({
  lots: {},
  connectedUsers: [],
  settings: {
    bannerMs: 4000,
    sound: true,
    volume: 0.6,
    confetti: true
  },

  setLots: (lots) => {
    const lotsMap = {};
    lots.forEach(lot => {
      lotsMap[lot.id] = lot;
    });
    set({ lots: lotsMap });
  },

  addLot: (lot) => {
    set(state => ({
      lots: { ...state.lots, [lot.id]: lot }
    }));
  },

  updateLot: (lot) => {
    set(state => ({
      lots: { ...state.lots, [lot.id]: lot }
    }));
  },

  deleteLot: (lotId) => {
    set(state => {
      const newLots = { ...state.lots };
      delete newLots[lotId];
      return { lots: newLots };
    });
  },

  getLot: (lotId) => {
    return get().lots[lotId];
  },

  getActiveLots: () => {
    return Object.values(get().lots).filter(lot => lot.status === 'active');
  },

  getPendingLots: () => {
    return Object.values(get().lots).filter(lot => lot.status === 'pending');
  },

  getEndedLots: () => {
    return Object.values(get().lots).filter(lot => lot.status === 'ended');
  },

  updateSettings: (newSettings) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings }
    }));
    localStorage.setItem('auctionSettings', JSON.stringify(get().settings));
  },

  loadSettings: () => {
    try {
      const saved = localStorage.getItem('auctionSettings');
      if (saved) {
        set({ settings: JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}));

export default useAuctionStore;
