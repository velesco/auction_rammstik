import { useNavigate } from 'react-router-dom';
import LotCard from './LotCard';

function LotGrid({ lots }) {
  const navigate = useNavigate();
  const activeLots = lots.filter(l => l.status === 'active');
  const pendingLots = lots.filter(l => l.status === 'pending');
  const endedLots = lots.filter(l => l.status === 'ended');

  return (
    <div className="space-y-8">
      {activeLots.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-white mb-4">
            🔥 Активные лоты ({activeLots.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeLots.map(lot => (
              <LotCard
                key={lot.id}
                lot={lot}
                onClick={() => navigate(`/lot/${lot.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {pendingLots.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-white mb-4">
            ⏳ Ожидают начала ({pendingLots.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pendingLots.map(lot => (
              <LotCard
                key={lot.id}
                lot={lot}
                onClick={() => navigate(`/lot/${lot.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {endedLots.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-white mb-4">
            ✅ Завершенные лоты ({endedLots.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {endedLots.map(lot => (
              <LotCard
                key={lot.id}
                lot={lot}
                onClick={() => navigate(`/lot/${lot.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {lots.length === 0 && (
        <div className="text-center py-32">
          <div className="text-9xl mb-6 animate-bounce">📦</div>
          <h3 className="text-4xl font-bold text-white mb-3">Нет лотов</h3>
          <p className="text-lg text-slate-400 mb-8">
            Лоты появятся здесь, когда их создаст администратор
          </p>
          <div className="inline-block px-6 py-3 bg-slate-800 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-500">
              Следите за обновлениями в реальном времени
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LotGrid;