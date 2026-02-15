import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw, History, Dices, Settings2 } from 'lucide-react';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { CustomizeDiceModal } from './CustomizeDiceModal';
import { DieConfig, RollResult } from './types';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { formatDate } from '../../utils/dateUtils';

// Fixed set of 9 colors
const COLOR_CONFIGS = [
  { color: 'bg-red-500', rings: 'ring-red-200' }, // Red
  { color: 'bg-blue-500', rings: 'ring-blue-200' }, // Blue
  { color: 'bg-green-500', rings: 'ring-green-200' }, // Green
  { color: 'bg-purple-500', rings: 'ring-purple-200' }, // Purple
  { color: 'bg-orange-500', rings: 'ring-orange-200' }, // Orange
  { color: 'bg-indigo-600', rings: 'ring-indigo-200' }, // Indigo
  { color: 'bg-pink-500', rings: 'ring-pink-200' }, // Pink
  { color: 'bg-teal-500', rings: 'ring-teal-200' }, // Teal
  { color: 'bg-cyan-500', rings: 'ring-cyan-200' }, // Cyan
];

// Initial default configuration for the 9 dice
const INITIAL_DICE_CONFIG: DieConfig[] = [
  { id: 'die-0', type: 'd4', label: 'D4', max: 4, ...COLOR_CONFIGS[0] },
  { id: 'die-1', type: 'd6', label: 'D6', max: 6, ...COLOR_CONFIGS[1] },
  { id: 'die-2', type: 'd8', label: 'D8', max: 8, ...COLOR_CONFIGS[2] },
  { id: 'die-3', type: 'd10', label: 'D10', max: 10, ...COLOR_CONFIGS[3] },
  { id: 'die-4', type: 'd12', label: 'D12', max: 12, ...COLOR_CONFIGS[4] },
  { id: 'die-5', type: 'd20', label: 'D20', max: 20, ...COLOR_CONFIGS[5] },
  { id: 'die-6', type: 'd100', label: 'D100', max: 100, ...COLOR_CONFIGS[6] },
  { id: 'die-7', type: 'd2', label: 'D2', max: 2, ...COLOR_CONFIGS[7] },
  { id: 'die-8', type: 'd30', label: 'D30', max: 30, ...COLOR_CONFIGS[8] },
];

export default function DiceRoller() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [history, setHistory] = useState<RollResult[]>([]);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Dice Configuration State
  const [diceConfigs, setDiceConfigs] =
    useState<DieConfig[]>(INITIAL_DICE_CONFIG);

  // Edit State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Restore history from local storage
  useEffect(() => {
    const key = `${STORAGE_KEYS.DICE_HISTORY_PREFIX}${gameId}`;
    const saved = storage.get<RollResult[]>(key);
    if (saved) {
      setHistory(saved);
    }
  }, [gameId]);

  // Load dice config from local storage
  useEffect(() => {
    const savedConfig = storage.get<any[]>(STORAGE_KEYS.DICE_CONFIGURATIONS);
    if (savedConfig) {
      if (Array.isArray(savedConfig) && savedConfig.length === 9) {
        // Merge saved config with color configs to ensure colors stay fixed if we ever change them in code
        const merged = savedConfig.map((die: any, index: number) => ({
          ...die,
          ...COLOR_CONFIGS[index],
          id: `die-${index}`, // Ensure IDs are consistent
        }));
        setDiceConfigs(merged);
      }
    }
  }, []);

  // Save history to local storage
  useEffect(() => {
    if (gameId) {
      const key = `${STORAGE_KEYS.DICE_HISTORY_PREFIX}${gameId}`;
      storage.set(key, history);
    }
  }, [history, gameId]);

  // Save dice config to local storage whenever it changes
  useEffect(() => {
    storage.set(STORAGE_KEYS.DICE_CONFIGURATIONS, diceConfigs);
  }, [diceConfigs]);

  const handleRoll = (die: DieConfig) => {
    setIsRolling(true);
    // Determine roll value immediately but show animation
    const rollValue = Math.floor(Math.random() * die.max) + 1;

    // Simulate short delay for "rolling" feel
    setTimeout(() => {
      const newRoll: RollResult = {
        id:
          Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        dieType: die.label,
        value: rollValue,
        timestamp: Date.now(),
        color: die.color,
        rings: die.rings,
      };

      setLastRoll(newRoll);
      setHistory((prev) => [newRoll, ...prev].slice(0, 50)); // Keep last 50
      setIsRolling(false);
    }, 300);
  };

  const clearHistory = () => {
    if (window.confirm('Clear all roll history?')) {
      setHistory([]);
      setLastRoll(null);
    }
  };

  const openConfigModal = () => {
    setIsConfigModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <Header
        title="Dice Roller"
        icon={<Dices className="w-6 h-6 mr-2 text-indigo-600" />}
      />

      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
        {/* Last Roll Display (Hero) */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center min-h-[200px] flex flex-col items-center justify-center transition-all">
          <div className="mb-2 text-sm text-gray-400 font-medium uppercase tracking-wider">
            Last Result
          </div>
          {isRolling ? (
            <div className="text-6xl font-black text-gray-300 animate-pulse">
              ...
            </div>
          ) : lastRoll ? (
            <div className="animate-in zoom-in duration-300">
              <div
                className={`text-8xl font-black bg-gradient-to-br from-indigo-500 to-purple-600 text-transparent bg-clip-text filter drop-shadow-lg`}
              >
                {lastRoll.value}
              </div>
              <div className="text-gray-500 font-medium mt-2">
                {lastRoll.dieType}
              </div>
            </div>
          ) : (
            <div className="text-gray-300">
              <Dices className="w-16 h-16 mx-auto mb-2 opacity-20" />
              <p>Tap a die to roll</p>
            </div>
          )}
        </div>

        {/* Dice Grid */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
              Roll a Die
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={openConfigModal}
              className="text-xs h-8"
            >
              <Settings2 className="w-3 h-3 mr-1.5" />
              Customize
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {diceConfigs.map((die) => (
              <button
                key={die.id}
                onClick={() => handleRoll(die)}
                disabled={isRolling}
                className={`
                    relative group overflow-hidden
                    aspect-square rounded-2xl shadow-sm border border-gray-100
                    flex flex-col items-center justify-center
                    transition-all duration-100 active:scale-95
                    hover:shadow-md hover:border-indigo-300 bg-white
                `}
              >
                <div
                  className={`
                         w-12 h-12 mb-2 rounded-xl flex items-center justify-center text-white font-bold text-md shadow-inner
                         ${die.color}
                    `}
                >
                  {die.label}
                </div>
                <div className="text-xs font-medium text-gray-500 group-hover:text-indigo-600">
                  1-{die.max}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                <History className="w-4 h-4 mr-1.5" />
                Recent Rolls
              </h2>
              <button
                onClick={clearHistory}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center bg-red-50 px-2 py-1 rounded-lg"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {history.slice(0, 10).map((roll) => (
                  <div
                    key={roll.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white mr-3 text-[10px] ${roll.color || 'bg-gray-500'}`}
                      >
                        {roll.dieType}
                      </div>
                      <span className="text-gray-400 text-xs">
                        {formatDate(roll.timestamp)}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {roll.value}
                    </div>
                  </div>
                ))}
              </div>
              {history.length > 10 && (
                <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                  {history.length - 10} more in history...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CustomizeDiceModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        diceConfigs={diceConfigs}
        onSave={setDiceConfigs}
      />
    </div>
  );
}
