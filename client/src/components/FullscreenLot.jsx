import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import useAuctionStore from '../store/auctionStore';
import useAuthStore from '../store/authStore';
import socketService from '../services/socket';
import Confetti from 'react-confetti';

function FullscreenLot({ lotId, onClose }) {
  const lot = useAuctionStore(state => state.getLot(lotId));
  const settings = useAuctionStore(state => state.settings);
  const user = useAuthStore(state => state.user);

  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [lastBid, setLastBid] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');

  const audioContextRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!lot || lot.status !== 'active') return;

    const updateTimer = () => {
      const end = new Date(lot.endsAt);
      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Завершен');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}ч ${minutes}м ${seconds}с`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}м ${seconds}с`);
      } else {
        setTimeLeft(`${seconds}с`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [lot?.endsAt, lot?.status]);

  // Set initial bid amount
  useEffect(() => {
    if (!lot) return;
    const minBid = (lot.currentPrice || lot.startingPrice) + lot.minStep;
    setBidAmount(minBid.toString());
  }, [lot?.currentPrice, lot?.startingPrice, lot?.minStep]);

  // Listen for bid events
  useEffect(() => {
    const handleNewBid = ({ lotId: eventLotId, bid }) => {
      if (eventLotId !== lotId) return;

      setLastBid(bid);

      // Play sound
      if (settings.sound && audioContextRef.current) {
        playBeep();
      }

      // Show confetti
      if (settings.confetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Show banner
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), settings.bannerMs);
    };

    const handleBidRejected = ({ reason }) => {
      setError(reason);
      setTimeout(() => setError(''), 3000);
    };

    socketService.on('newBid', handleNewBid);
    socketService.on('bidRejected', handleBidRejected);

    return () => {
      socketService.off('newBid', handleNewBid);
      socketService.off('bidRejected', handleBidRejected);
    };
  }, [lotId, settings]);

  // Initialize audio context
  useEffect(() => {
    if (settings.sound && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, [settings.sound]);

  const playBeep = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = settings.volume;

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.stop(now + 0.2);
  };

  const handlePlaceBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Некорректная сумма');
      return;
    }

    socketService.placeBid(lotId, amount);
    setError('');
  };

  const handleQuickBid = () => {
    const minBid = (lot.currentPrice || lot.startingPrice) + lot.minStep;
    socketService.placeBid(lotId, minBid);
    setError('');
  };

  if (!lot) {
    return null;
  }

  const minBid = (lot.currentPrice || lot.startingPrice) + lot.minStep;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 overflow-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={false}
        />
      )}

      <div className="min-h-screen flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full text-2xl font-bold z-10"
        >
          ✕
        </button>

        {/* Banner */}
        {showBanner && lastBid && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-xl shadow-2xl z-10 animate-bounce">
            <div className="text-center">
              <div className="text-sm font-semibold">Новая ставка!</div>
              <div className="text-2xl font-bold">{lastBid.username}</div>
              <div className="text-lg">{lastBid.amount} MC</div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 container mx-auto px-4 py-20 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Image */}
            <div className="bg-card rounded-2xl overflow-hidden border border-slate-700">
              {lot.imageUrl ? (
                <img
                  src={lot.imageUrl}
                  alt={lot.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-slate-800 text-6xl">
                  📦
                </div>
              )}
            </div>

            {/* Right: Info & Bidding */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {lot.title}
                </h1>
                {lot.description && (
                  <p className="text-lg text-slate-300">{lot.description}</p>
                )}
              </div>

              {/* Status & Timer */}
              <div className="bg-card rounded-xl p-6 border border-slate-700">
                {lot.status === 'active' && (
                  <>
                    <div className="text-slate-400 text-sm mb-2">Осталось времени:</div>
                    <div className="text-5xl font-bold text-green-400 font-mono">
                      {timeLeft}
                    </div>
                  </>
                )}
                {lot.status === 'pending' && (
                  <div className="text-2xl text-yellow-400 font-bold">
                    Ожидает начала
                  </div>
                )}
                {lot.status === 'ended' && (
                  <div className="text-2xl text-slate-400 font-bold">
                    Аукцион завершен
                  </div>
                )}
              </div>

              {/* Current bid */}
              <div className="bg-card rounded-xl p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Текущая цена:</div>
                <div className="text-4xl font-bold text-green-400 mb-4">
                  {lot.currentPrice || lot.startingPrice} MC
                </div>

                {lot.currentBidder && (
                  <div className="flex items-center gap-3">
                    {lot.currentBidderAvatar && (
                      <img
                        src={lot.currentBidderAvatar}
                        alt={lot.currentBidder}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="text-xs text-slate-400">Лидирует:</div>
                      <div className="text-lg font-semibold text-white">
                        {lot.currentBidder}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-sm text-slate-400">
                  Минимальная ставка: {minBid} MC (шаг: {lot.minStep} MC)
                </div>
              </div>

              {/* Bidding controls */}
              {lot.status === 'active' && (
                <div className="bg-card rounded-xl p-6 border border-slate-700 space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Ваша ставка (MC):
                    </label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={minBid}
                      step={lot.minStep}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg px-4 py-2 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleQuickBid}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                    >
                      Быстрая ставка ({minBid} MC)
                    </button>
                    <button
                      onClick={handlePlaceBid}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                    >
                      Сделать ставку
                    </button>
                  </div>
                </div>
              )}

              {/* Bid history */}
              {lot.bids && lot.bids.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">
                    История ставок ({lot.bids.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {lot.bids.map((bid, idx) => (
                      <div
                        key={bid.id || idx}
                        className="flex items-center justify-between bg-slate-900 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          {bid.avatar && (
                            <img
                              src={bid.avatar}
                              alt={bid.username}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className="text-white font-semibold">
                            {bid.username}
                          </span>
                        </div>
                        <div className="text-green-400 font-bold">
                          {bid.amount} MC
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullscreenLot;
