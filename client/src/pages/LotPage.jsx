import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import useAuctionStore from '../store/auctionStore';
import useAuthStore from '../store/authStore';
import socketService from '../services/socket';
import Confetti from 'react-confetti';
import Header from '../components/Header';
import { formatTimeRemaining } from '../utils/formatTime';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function LotPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lot = useAuctionStore(state => state.getLot(Number(id)));
  const settings = useAuctionStore(state => state.settings);
  const user = useAuthStore(state => state.user);
  const isAdmin = useAuthStore(state => state.isAdmin());

  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [lastBid, setLastBid] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const audioContextRef = useRef(null);
  const chatEndRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!lot || lot.status !== 'active') return;

    const updateTimer = () => {
      setTimeLeft(formatTimeRemaining(lot.endsAt));
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
      if (eventLotId !== Number(id)) return;

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
  }, [id, settings]);

  // Initialize audio context
  useEffect(() => {
    if (settings.sound && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, [settings.sound]);

  // Load chat messages
  useEffect(() => {
    const loadChatMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}/lots/${id}/chat`);
        setChatMessages(response.data);
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      }
    };

    loadChatMessages();
  }, [id]);

  // Listen for new chat messages
  useEffect(() => {
    const handleNewChatMessage = (message) => {
      if (message.lotId === Number(id)) {
        setChatMessages(prev => [...prev, message]);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const handleChatError = ({ reason }) => {
      setError(reason);
      setTimeout(() => setError(''), 3000);
    };

    socketService.on('newChatMessage', handleNewChatMessage);
    socketService.on('chatError', handleChatError);

    return () => {
      socketService.off('newChatMessage', handleNewChatMessage);
      socketService.off('chatError', handleChatError);
    };
  }, [id]);

  const playBeep = () => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(settings.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  };

  const handlePlaceBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setError('Введите корректную сумму');
      setTimeout(() => setError(''), 3000);
      return;
    }

    socketService.placeBid(Number(id), amount);
  };

  const handleDeleteBid = (bidId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту ставку?')) {
      return;
    }
    socketService.socket.emit('deleteBid', { bidId, lotId: Number(id) });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socketService.sendChatMessage(Number(id), chatInput.trim());
      setChatInput('');
    }
  };

  if (!lot) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <br />
        <div className="container mx-auto px-4 py-8 mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Лот не найден</h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
          >
            Вернуться к аукционам
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-500',
    pending: 'bg-yellow-500',
    ended: 'bg-slate-500'
  };

  const statusLabels = {
    active: 'Активен',
    pending: 'Ожидает',
    ended: 'Завершен'
  };

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <br />
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <main className="container mx-auto px-4 py-8 mt-2">
        <button
          onClick={() => navigate('/')}
          className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          ← Назад к аукционам
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image and Info */}
          <div className="space-y-6">
            {lot.imageUrl && (
              <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                <img
                  src={lot.imageUrl}
                  alt={lot.title}
                  className="w-full h-auto object-contain max-h-[600px]"
                />
              </div>
            )}

            <div className="bg-card rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-lg text-sm font-bold text-slate-900 ${statusColors[lot.status]}`}>
                  {statusLabels[lot.status]}
                </span>
                {lot.status === 'active' && timeLeft && (
                  <span className="text-2xl font-mono font-bold text-green-400">
                    {timeLeft}
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-bold text-white mb-4">{lot.title}</h1>

              {lot.description && (
                <p className="text-lg text-slate-300 mb-6">{lot.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-lg">Начальная цена:</span>
                  <span className="text-white font-bold text-xl">{lot.startingPrice} M¢</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-lg">Текущая цена:</span>
                  <span className="text-green-400 font-bold text-2xl">
                    {lot.currentPrice || lot.startingPrice} M¢
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-lg">Минимальный шаг:</span>
                  <span className="text-white font-bold text-xl">{lot.minStep} M¢</span>
                </div>

                {lot.currentBidder && (
                  <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                    <span className="text-slate-400 text-lg">Лидер:</span>
                    <div className="flex items-center gap-2">
                      {lot.currentBidderAvatar && (
                        <img
                          src={lot.currentBidderAvatar}
                          alt={lot.currentBidder}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="text-white font-bold text-xl">{lot.currentBidder}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-lg">Всего ставок:</span>
                  <span className="text-white font-bold text-xl">{lot.bidsCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Bidding and History */}
          <div className="space-y-6">
            {/* Bidding Form */}
            {lot.status === 'active' && (
              <div className="bg-card rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6">Сделать ставку</h2>

                {error && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Ваша ставка (минимум: {(lot.currentPrice || lot.startingPrice) + lot.minStep} M¢)
                    </label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      step={lot.minStep}
                      min={(lot.currentPrice || lot.startingPrice) + lot.minStep}
                      max={user?.balance || 0}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-xl font-bold focus:outline-none focus:border-green-400"
                    />
                  </div>

                  {/* Quick bid multiplier buttons */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Быстрая ставка:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => setBidAmount(((lot.currentPrice || lot.startingPrice) + lot.minStep * 2).toString())}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                      >
                        x2
                      </button>
                      <button
                        onClick={() => setBidAmount(((lot.currentPrice || lot.startingPrice) + lot.minStep * 3).toString())}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                      >
                        x3
                      </button>
                      <button
                        onClick={() => setBidAmount(((lot.currentPrice || lot.startingPrice) + lot.minStep * 5).toString())}
                        className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
                      >
                        x5
                      </button>
                      <button
                        onClick={() => setBidAmount(((lot.currentPrice || lot.startingPrice) + lot.minStep * 10).toString())}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                      >
                        x10
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceBid}
                    className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-xl rounded-lg transition-colors transform hover:scale-105"
                  >
                    Сделать ставку
                  </button>

                  <div className="text-center text-sm text-slate-400">
                    Ваш баланс: <span className="font-bold text-green-400">{user?.balance?.toFixed(2) || 0} M¢</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bid History */}
            <div className="bg-card rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-6">История ставок</h2>

              {lot.bids && lot.bids.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {lot.bids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`p-4 rounded-lg ${
                        index === 0 ? 'bg-green-500/20 border border-green-500' : 'bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {bid.avatar && (
                            <img
                              src={bid.avatar}
                              alt={bid.username}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-semibold text-white">{bid.username}</div>
                            <div className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true, locale: ru })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-bold text-green-400">
                            {bid.amount} M¢
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteBid(bid.id)}
                              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors"
                              title="Удалить ставку"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Ставок пока нет. Будьте первым!
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="bg-card rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-6">Чат ({chatMessages.length})</h2>

              <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4 p-3 bg-slate-900 rounded-lg">
                {chatMessages.length > 0 ? (
                  chatMessages.map(msg => (
                    <div key={msg.id} className="flex gap-3">
                      {msg.avatar && (
                        <img src={msg.avatar} alt={msg.username} className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-green-400" />
                      )}
                      <div className="flex-1 bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-green-400 text-sm">{msg.username}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-slate-200 text-sm">{msg.message}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    Пока нет сообщений. Начните общение!
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Написать сообщение..."
                  maxLength={500}
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  Отправить
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* New Bid Banner */}
      {showBanner && lastBid && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-white">
            <div className="text-center">
              <div className="text-sm font-semibold mb-1">Новая ставка!</div>
              <div className="flex items-center gap-3">
                {lastBid.avatar && (
                  <img src={lastBid.avatar} alt={lastBid.username} className="w-8 h-8 rounded-full" />
                )}
                <span className="font-bold text-lg">{lastBid.username}</span>
                <span className="text-2xl font-bold">{lastBid.amount} M¢</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LotPage;
