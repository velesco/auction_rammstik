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
      <main className="container mx-auto px-4 py-8 mt-6">
        <div className="mb-8 bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 rounded-2xl p-6 border border-yellow-600/30">
          <h2 className="text-3xl font-bold text-white mb-2">
            ⚙️ Админ-панель
          </h2>
          <p className="text-slate-300">
            Управление лотами аукциона
          </p>
        </div>

        <AdminPanel lots={lots} />
      </main>
    </div>
  );
}

export default AdminPage;
