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
      <main className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8 mt-2 md:mt-6">
        <div className="mb-6 md:mb-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">
                👋 Добро пожаловать, {user?.username}!
              </h2>
              <p className="text-sm md:text-lg text-slate-300">
                Следите за аукционами в реальном времени
              </p>
            </div>
            <div className="flex gap-3 md:gap-6 w-full sm:w-auto justify-around sm:justify-start">
              <div className="text-center px-2 md:px-4">
                <div className="text-2xl md:text-3xl font-bold text-green-400">
                  {lots.filter(l => l.status === 'active').length}
                </div>
                <div className="text-xs md:text-sm text-slate-400">Активных</div>
              </div>
              <div className="h-12 w-px bg-slate-700"></div>
              <div className="text-center px-2 md:px-4">
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {lots.filter(l => l.status === 'pending').length}
                </div>
                <div className="text-xs md:text-sm text-slate-400">Ожидают</div>
              </div>
              <div className="h-12 w-px bg-slate-700"></div>
              <div className="text-center px-2 md:px-4">
                <div className="text-2xl md:text-3xl font-bold text-slate-400">
                  {lots.filter(l => l.status === 'ended').length}
                </div>
                <div className="text-xs md:text-sm text-slate-400">Завершено</div>
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
