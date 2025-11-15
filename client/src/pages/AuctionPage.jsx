import useAuthStore from '../store/authStore';
import useAuctionStore from '../store/auctionStore';
import LotGrid from '../components/LotGrid';
import Header from '../components/Header';

function AuctionPage() {
  const user = useAuthStore(state => state.user);
  const lots = useAuctionStore(state => Object.values(state.lots));

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <br />
      <main className="container mx-auto px-4 py-8 mt-6">
        <div className="mb-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                👋 Добро пожаловать, {user?.username}!
              </h2>
              <p className="text-lg text-slate-300">
                Следите за аукционами в реальном времени
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center px-4">
                <div className="text-3xl font-bold text-green-400">
                  {lots.filter(l => l.status === 'active').length}
                </div>
                <div className="text-sm text-slate-400">Активных</div>
              </div>
              <div className="h-12 w-px bg-slate-700"></div>
              <div className="text-center px-4">
                <div className="text-3xl font-bold text-yellow-400">
                  {lots.filter(l => l.status === 'pending').length}
                </div>
                <div className="text-sm text-slate-400">Ожидают</div>
              </div>
              <div className="h-12 w-px bg-slate-700"></div>
              <div className="text-center px-4">
                <div className="text-3xl font-bold text-slate-400">
                  {lots.filter(l => l.status === 'ended').length}
                </div>
                <div className="text-sm text-slate-400">Завершено</div>
              </div>
            </div>
          </div>
        </div>

        <LotGrid lots={lots} />
      </main>
    </div>
  );
}

export default AuctionPage;
