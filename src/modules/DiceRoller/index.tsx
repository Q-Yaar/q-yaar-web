import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw, History, Dices, Settings2 } from 'lucide-react';
import { Header } from '../../components/ui/header';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface RollResult {
  id: string; // Unique ID for key
  dieType: string;
  value: number;
  timestamp: number;
}

interface DieConfig {
  id: string; // Unique ID for the die slot (e.g., 'die-0', 'die-1')
  type: string; // 'd4', 'd6', etc. (derived from max)
  label: string; // Display label
  max: number;
  color: string;
  rings: string;
}

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
  const [selectedConfigIndex, setSelectedConfigIndex] = useState<number>(0);
  const [editMax, setEditMax] = useState<string>('');

  // Restore history from local storage
  useEffect(() => {
    const saved = localStorage.getItem(`dice_history_${gameId}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse dice history');
      }
    }
  }, [gameId]);

  // Load dice config from local storage
  useEffect(() => {
    const savedConfig = localStorage.getItem('dice_configurations');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (Array.isArray(parsed) && parsed.length === 9) {
          // Merge saved config with color configs to ensure colors stay fixed if we ever change them in code
          const merged = parsed.map((die: any, index: number) => ({
            ...die,
            ...COLOR_CONFIGS[index],
            id: `die-${index}`, // Ensure IDs are consistent
          }));
          setDiceConfigs(merged);
        }
      } catch (e) {
        console.error('Failed to parse dice configurations');
      }
    }
  }, []);

  // Save history to local storage
  useEffect(() => {
    if (gameId) {
      localStorage.setItem(`dice_history_${gameId}`, JSON.stringify(history));
    }
  }, [history, gameId]);

  // Save dice config to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('dice_configurations', JSON.stringify(diceConfigs));
  }, [diceConfigs]);

  const handleRoll = (die: DieConfig) => {
    setIsRolling(true);
    // Determine roll value immediately but show animation
    const rollValue = Math.floor(Math.random() * die.max) + 1;

    // Simulate short delay for "rolling" feel
    setTimeout(() => {
      const newRoll: RollResult = {
        id: crypto.randomUUID(),
        dieType: die.label,
        value: rollValue,
        timestamp: Date.now(),
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
    // initialize with the first die or currently selected
    const initialIndex = 0;
    setSelectedConfigIndex(initialIndex);
    setEditMax(diceConfigs[initialIndex].max.toString());
    setIsConfigModalOpen(true);
  };

  const handleColorSelect = (index: number) => {
    setSelectedConfigIndex(index);
    setEditMax(diceConfigs[index].max.toString());
  };

  const saveDieConfig = () => {
    const max = parseInt(editMax);
    if (isNaN(max) || max < 2) {
      alert('Please enter a valid max value (2 or greater)');
      return;
    }

    const updatedConfigs = [...diceConfigs];
    const currentConfig = updatedConfigs[selectedConfigIndex];

    updatedConfigs[selectedConfigIndex] = {
      ...currentConfig,
      max: max,
      type: `d${max}`,
      label: `D${max}`,
    };

    setDiceConfigs(updatedConfigs);
    setIsConfigModalOpen(false);
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
              Customize Dice
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
                         w-12 h-12 mb-2 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner
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
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mr-3 ${diceConfigs.find((d) => d.label === roll.dieType)?.color || 'bg-gray-500'}`}
                      >
                        {roll.dieType}
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(roll.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
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

      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Customize Dice"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Die to Edit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {diceConfigs.map((die, index) => (
                <button
                  key={die.id}
                  type="button"
                  onClick={() => handleColorSelect(index)}
                  className={`
                    w-full aspect-square rounded-lg ${die.color} flex items-center justify-center text-white text-xs font-bold
                    ${selectedConfigIndex === index ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'}
                    transition-all
                  `}
                  title={die.label}
                >
                  {die.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Value for {diceConfigs[selectedConfigIndex]?.label}
            </label>
            <Input
              type="number"
              value={editMax}
              onChange={(e) => setEditMax(e.target.value)}
              placeholder="e.g. 20"
              min={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              This die will roll a number between 1 and {editMax || '...'}.
            </p>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDieConfig}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
