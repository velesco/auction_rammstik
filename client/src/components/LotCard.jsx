import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatTimeRemaining } from '../utils/formatTime';

function LotCard({ lot, onClick }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [timeUntilStart, setTimeUntilStart] = useState('');

  // Timer for active lots
  useEffect(() => {
    if (lot.status !== 'active') return;

    const updateTimer = () => {
      setTimeLeft(formatTimeRemaining(lot.endsAt));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [lot.endsAt, lot.status]);

  // Timer for pending lots with scheduled start
  useEffect(() => {
    if (lot.status !== 'pending' || !lot.scheduledStart) return;

    const updateTimer = () => {
      setTimeUntilStart(formatTimeRemaining(lot.scheduledStart));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [lot.scheduledStart, lot.status]);

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
          {lot.status === 'pending' && lot.scheduledStart && timeUntilStart && (
            <span className="text-sm font-mono text-yellow-400">
              Начнется через {timeUntilStart}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-white line-clamp-2 flex-1">
            {lot.title}
          </h3>
          {lot.vipOnly && (
            <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 text-xs font-bold rounded" title="Только для VIP">
              🌟 VIP
            </span>
          )}
        </div>

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
