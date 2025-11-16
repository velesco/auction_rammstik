import { useState } from 'react';
import useAuthStore from '../store/authStore';
import useAuctionStore from '../store/auctionStore';
import AdminPanel from '../components/AdminPanel';
import Header from '../components/Header';

function AdminPage() {
  const user = useAuthStore(state => state.user);
  const lots = useAuctionStore(state => Object.values(state.lots));

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <br />
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8 mt-2 md:mt-6">
        <div className="mb-6 md:mb-8 bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 rounded-xl md:rounded-2xl p-4 md:p-6 border border-yellow-600/30">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">
            ⚙️ Админ-панель
          </h2>
          <p className="text-sm md:text-base text-slate-300">
            Управление лотами аукциона
          </p>
        </div>

        <AdminPanel lots={lots} />
      </main>
    </div>
  );
}

export default AdminPage;
