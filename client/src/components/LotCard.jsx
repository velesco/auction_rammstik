import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

function LotCard({ lot, onClick }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (lot.status !== 'active') return;

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
  }, [lot.endsAt, lot.status]);

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
    <div
      onClick={onClick}
      className="bg-card border border-slate-700 rounded-xl overflow-hidden hover:border-green-400 transition-all cursor-pointer transform hover:scale-105 hover:shadow-xl hover:shadow-green-500/20"
    >
      {lot.imageUrl && (
        <div className="aspect-video bg-slate-900 overflow-hidden">
          <img
            src={lot.imageUrl}
            alt={lot.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 rounded text-xs font-bold text-slate-900 ${statusColors[lot.status]}`}>
            {statusLabels[lot.status]}
          </span>
          {lot.status === 'active' && timeLeft && (
            <span className="text-sm font-mono text-slate-300">
              {timeLeft}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
          {lot.title}
        </h3>

        {lot.description && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {lot.description}
          </p>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Текущая цена:</span>
            <span className="text-green-400 font-bold">
              {lot.currentPrice || lot.startingPrice} MC
            </span>
          </div>

          {lot.currentBidder && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Лидер:</span>
              <span className="text-white font-semibold">
                {lot.currentBidder}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Ставок:</span>
            <span className="text-white">{lot.bidsCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LotCard;
