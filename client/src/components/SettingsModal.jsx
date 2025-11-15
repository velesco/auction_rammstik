import { useState, useEffect } from 'react';
import useAuctionStore from '../store/auctionStore';

function SettingsModal({ onClose }) {
  const { settings, updateSettings } = useAuctionStore(state => ({
    settings: state.settings,
    updateSettings: state.updateSettings
  }));

  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-slate-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">⚙️ Настройки</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Banner duration */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Длительность баннера (мс)
            </label>
            <input
              type="number"
              value={localSettings.bannerMs}
              onChange={(e) => handleChange('bannerMs', parseInt(e.target.value) || 4000)}
              min={1000}
              max={10000}
              step={500}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Как долго показывать баннер новой ставки
            </p>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">Звуковые уведомления</div>
              <p className="text-xs text-slate-400">
                Воспроизводить звук при новой ставке
              </p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                checked={localSettings.sound}
                onChange={(e) => handleChange('sound', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-full h-full bg-slate-700 peer-checked:bg-green-500 rounded-full peer-focus:ring-2 peer-focus:ring-green-400 transition-colors cursor-pointer"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6"></div>
            </label>
          </div>

          {/* Volume */}
          {localSettings.sound && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Громкость звука
              </label>
              <input
                type="range"
                value={localSettings.volume}
                onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Тихо</span>
                <span>{Math.round(localSettings.volume * 100)}%</span>
                <span>Громко</span>
              </div>
            </div>
          )}

          {/* Confetti toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">Конфетти</div>
              <p className="text-xs text-slate-400">
                Показывать конфетти при новой ставке
              </p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                checked={localSettings.confetti}
                onChange={(e) => handleChange('confetti', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-full h-full bg-slate-700 peer-checked:bg-green-500 rounded-full peer-focus:ring-2 peer-focus:ring-green-400 transition-colors cursor-pointer"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6"></div>
            </label>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full mt-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all"
        >
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}

export default SettingsModal;
