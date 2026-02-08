import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, History, Dices } from 'lucide-react';
import { Header } from '../../components/ui/header';

interface RollResult {
  id: string; // Unique ID for key
  dieType: string;
  value: number;
  timestamp: number;
}

const DIE_TYPES = [
  {
    type: 'd4',
    label: 'D4',
    max: 4,
    color: 'bg-red-500',
    rings: 'ring-red-200',
  },
  {
    type: 'd6',
    label: 'D6',
    max: 6,
    color: 'bg-blue-500',
    rings: 'ring-blue-200',
  },
  {
    type: 'd8',
    label: 'D8',
    max: 8,
    color: 'bg-green-500',
    rings: 'ring-green-200',
  },
  {
    type: 'd10',
    label: 'D10',
    max: 10,
    color: 'bg-purple-500',
    rings: 'ring-purple-200',
  },
  {
    type: 'd12',
    label: 'D12',
    max: 12,
    color: 'bg-orange-500',
    rings: 'ring-orange-200',
  },
  {
    type: 'd20',
    label: 'D20',
    max: 20,
    color: 'bg-indigo-600',
    rings: 'ring-indigo-200',
  },
];

export default function DiceRoller() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [history, setHistory] = useState<RollResult[]>([]);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Restore history from local storage on mount (optional, per game?)
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

  // Save history to local storage
  useEffect(() => {
    if (gameId) {
      localStorage.setItem(`dice_history_${gameId}`, JSON.stringify(history));
    }
  }, [history, gameId]);

  const handleRoll = (die: (typeof DIE_TYPES)[0]) => {
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
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
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 px-1">
            Roll a Die
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {DIE_TYPES.map((die) => (
              <button
                key={die.type}
                onClick={() => handleRoll(die)}
                disabled={isRolling}
                className={`
                    relative group overflow-hidden
                    aspect-square rounded-2xl shadow-sm border border-gray-100
                    flex flex-col items-center justify-center
                    transition-all duration-100 active:scale-90
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
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mr-3 ${DIE_TYPES.find((d) => d.label === roll.dieType)?.color || 'bg-gray-500'}`}
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
    </div>
  );
}
