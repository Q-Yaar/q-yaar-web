import React from 'react';
import { ChevronRight, Gamepad2, Calendar, User, Hash } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Game } from '../../models/Game';
import { getLabel } from '../../utils/utils';

interface GameCardProps {
  game: Game;
  onClick: (game: Game) => void;
  className?: string;
}

export function GameCard({ game, onClick, className }: GameCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card
      className={`cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-[0.98] group ${className || ''}`}
      onClick={() => onClick(game)}
    >
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header: Name and Arrow */}
        <div className="flex justify-between items-start w-full mb-3">
          <div className="flex flex-col gap-1 pr-4">
            <span
              className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1"
              title={game.name}
            >
              {game.name}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold uppercase tracking-wider text-gray-400">
                {getLabel(game.game_type)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(game.created).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow text-left">
          {game.description}
        </p>

        {/* Footer Info */}
        <div className="space-y-3 mt-auto">
          {/* Game Code & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100 group-hover:border-indigo-100 transition-colors">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-mono font-bold text-gray-700">
                {game.game_code}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(game.game_status)}`}
            >
              {getLabel(game.game_status)}
            </span>
          </div>

          {/* Game Master */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-bold">
              {game.game_master.profile_name.charAt(0)}
            </div>
            <span className="text-xs font-medium text-gray-600 truncate">
              By {game.game_master.profile_name}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
