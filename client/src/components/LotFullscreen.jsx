import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import useAuctionStore from '../store/auctionStore';
import socketService from '../services/socket';
import { playBeep } from '../utils/sound';
import './LotFullscreen.css';

function LotFullscreen({ lot, onClose }) {
  const [bidAmount, setBidAmount] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const settings = useAuctionStore(state => state.settings);
  const updatedLot = useAuctionStore(state => state.getLot(lot.id)) || lot;

  const minBid = updatedLot.currentPrice + updatedLot.minStep;

  useEffect(() => {
    setBidAmount(minBid);
  }, [minBid]);

  // Timer
  useEffect(() => {
    if (updatedLot.status !== 'active') return;

    const updateTimer = () => {
      const now = new Date();
      const endsAt = new Date(updatedLot.endsAt);
      const diff = endsAt - now;

      if (diff <= 0) {
        setTimeLeft('Auction ended');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [updatedLot.endsAt, updatedLot.status]);

  // Listen for new bids
  useEffect(() => {
    const handleNewBid = ({ lotId, bid }) => {
      if (lotId !== lot.id) return;

      // Show banner
      setBannerText(`${bid.username} raised the bid! Current bid: ${formatPrice(bid.amount)}`);
      setShowBanner(true);

      setTimeout(() => {
        setShowBanner(false);
      }, settings.bannerMs);

      // Play sound
      if (settings.sound) {
        playBeep(settings.volume);
      }

      // Show confetti
      if (settings.confetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    };

    socketService.on('newBid', handleNewBid);

    return () => {
      socketService.off('newBid', handleNewBid);
    };
  }, [lot.id, settings]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US').format(price);
  };

  const handlePlaceBid = () => {
    if (bidAmount < minBid) {
      alert(`Minimum bid is ${formatPrice(minBid)}`);
      return;
    }

    socketService.placeBid(lot.id, bidAmount);
  };

  const handleQuickBid = (multiplier) => {
    setBidAmount(prev => prev + (updatedLot.minStep * multiplier));
  };

  return (
    <div className="lot-fullscreen">
      <button className="fs-close" onClick={onClose}>
        ✖ Close
      </button>

      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      {showBanner && (
        <div className="bid-banner">
          {bannerText}
        </div>
      )}

      <div className="fs-container">
        <div className="fs-header">
          <h1 className="fs-title">{updatedLot.title}</h1>
          <span className={`fs-status ${updatedLot.status === 'active' ? 'active' : 'ended'}`}>
            {updatedLot.status === 'active' ? '🟢 Active' : '🔴 Ended'}
          </span>
        </div>

        <div className="fs-meta">
          Starting: <b>{formatPrice(updatedLot.startingPrice)}</b> •
          Step: <b>{formatPrice(updatedLot.minStep)}</b>
        </div>

        <div className="fs-image">
          {updatedLot.imageUrl ? (
            <img src={updatedLot.imageUrl} alt={updatedLot.title} />
          ) : (
            <div className="fs-image-placeholder">No Image</div>
          )}
        </div>

        <div className="fs-price">
          Current bid: <b>{formatPrice(updatedLot.currentPrice)}</b>
          {updatedLot.currentBidder && (
            <span className="fs-leader">Leader: {updatedLot.currentBidder}</span>
          )}
        </div>

        {updatedLot.status === 'active' && (
          <div className="fs-timer">
            ⏱️ Time left: {timeLeft}
          </div>
        )}

        {updatedLot.description && (
          <div className="fs-description">
            <h3>Description</h3>
            <p>{updatedLot.description}</p>
          </div>
        )}

        {updatedLot.status === 'active' && (
          <div className="fs-bid-controls">
            <input
              type="number"
              className="fs-bid-input"
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              min={minBid}
              step={updatedLot.minStep}
            />
            <button className="fs-quick-btn" onClick={() => handleQuickBid(1)}>
              +{formatPrice(updatedLot.minStep)}
            </button>
            <button className="fs-quick-btn" onClick={() => handleQuickBid(2)}>
              +{formatPrice(updatedLot.minStep * 2)}
            </button>
            <button className="fs-quick-btn" onClick={() => handleQuickBid(5)}>
              +{formatPrice(updatedLot.minStep * 5)}
            </button>
            <button className="fs-bid-button" onClick={handlePlaceBid}>
              Place Bid
            </button>
          </div>
        )}

        <div className="fs-bids">
          <h3>Bid History ({updatedLot.bids?.length || 0})</h3>
          <div className="fs-bids-list">
            {updatedLot.bids && updatedLot.bids.length > 0 ? (
              updatedLot.bids.map(bid => (
                <div key={bid.id} className="fs-bid-item">
                  {bid.avatar && (
                    <img src={bid.avatar} alt={bid.username} className="bid-avatar" />
                  )}
                  <div className="bid-info">
                    <div className="bid-amount">{formatPrice(bid.amount)}</div>
                    <div className="bid-user">{bid.username}</div>
                  </div>
                  <div className="bid-time">
                    {new Date(bid.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="fs-bids-empty">No bids yet. Be the first!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LotFullscreen;
