import { useState } from 'react';
import { adminApi } from '../services/api';

function AdminPanel({ lots }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    startingPrice: 100,
    minStep: 10,
    durationMinutes: 60,
    vipOnly: false,
    scheduledStart: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? checked
        : (name === 'title' || name === 'description' || name === 'imageUrl' || name === 'scheduledStart'
          ? value
          : parseFloat(value) || 0)
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminApi.createLot(formData);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        startingPrice: 100,
        minStep: 10,
        durationMinutes: 60,
        vipOnly: false,
        scheduledStart: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания лота');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLot = async (lotId) => {
    if (!confirm('Запустить аукцион для этого лота?')) return;

    try {
      await adminApi.startLot(lotId);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка запуска лота');
    }
  };

  const handleEndLot = async (lotId) => {
    if (!confirm('Завершить аукцион для этого лота?')) return;

    try {
      await adminApi.endLot(lotId);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка завершения лота');
    }
  };

  const handleDeleteLot = async (lotId) => {
    if (!confirm('Удалить этот лот? Это действие нельзя отменить.')) return;

    try {
      await adminApi.deleteLot(lotId);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка удаления лота');
    }
  };

  return (
    <div className="space-y-6">
      {/* Create lot button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all"
      >
        {showCreateForm ? '✕ Отменить' : '+ Создать новый лот'}
      </button>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-card border border-slate-700 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Создание лота</h3>

          {error && (
            <div className="mb-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg px-4 py-3 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Название *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Описание
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                URL изображения
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Начальная цена (MC) *
                </label>
                <input
                  type="number"
                  name="startingPrice"
                  value={formData.startingPrice}
                  onChange={handleInputChange}
                  required
                  min={1}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Шаг ставки (MC) *
                </label>
                <input
                  type="number"
                  name="minStep"
                  value={formData.minStep}
                  onChange={handleInputChange}
                  required
                  min={1}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Длительность (минут) *
                </label>
                <input
                  type="number"
                  name="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={handleInputChange}
                  required
                  min={1}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="vipOnly"
                  checked={formData.vipOnly}
                  onChange={handleInputChange}
                  className="w-5 h-5 bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-yellow-400"
                />
                <span className="text-sm text-slate-400">
                  🌟 Только для VIP (премиум подписчики)
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Время запуска (опционально)
              </label>
              <input
                type="datetime-local"
                name="scheduledStart"
                value={formData.scheduledStart}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Оставьте пустым для ручного запуска через кнопку "Запустить"
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all"
            >
              {loading ? 'Создание...' : 'Создать лот'}
            </button>
          </form>
        </div>
      )}

      {/* Lots list */}
      <div className="bg-card border border-slate-700 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-white mb-4">
          Управление лотами ({lots.length})
        </h3>

        {lots.length === 0 ? (
          <p className="text-slate-400 text-center py-8">
            Лоты отсутствуют. Создайте первый лот.
          </p>
        ) : (
          <div className="space-y-3">
            {lots.map(lot => (
              <div
                key={lot.id}
                className="bg-slate-900 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-white truncate">
                        {lot.title}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        lot.status === 'active' ? 'bg-green-500 text-white' :
                        lot.status === 'pending' ? 'bg-yellow-500 text-slate-900' :
                        'bg-slate-500 text-white'
                      }`}>
                        {lot.status === 'active' ? 'Активен' :
                         lot.status === 'pending' ? 'Ожидает' : 'Завершен'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Цена: {lot.currentPrice || lot.startingPrice} MC •
                      Ставок: {lot.bidsCount || 0}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {lot.status === 'pending' && (
                      <button
                        onClick={() => handleStartLot(lot.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Запустить
                      </button>
                    )}

                    {lot.status === 'active' && (
                      <button
                        onClick={() => handleEndLot(lot.id)}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 text-sm font-semibold rounded-lg transition-colors"
                      >
                        Завершить
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteLot(lot.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
