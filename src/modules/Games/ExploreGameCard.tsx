import React from 'react';
import { ChevronRight, Calendar, User, Hash, Compass, ArrowRight, Globe, Lock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Game } from '../../models/Game';
import { getLabel } from '../../utils/utils';

interface ExploreGameCardProps {
  game: Game;
  onClick: (game: Game) => void;
  className?: string;
}

export function ExploreGameCard({ game, onClick, className }: ExploreGameCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPLETED':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const getGameTypeColor = (type: string) => {
    switch (type) {
      case 'HIDE_N_SEEK':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const isPublic = (game.game_visibility_mode || 'PUBLIC').toUpperCase() === 'PUBLIC';

  return (
    <Card
      className={`cursor-pointer border-gray-200 bg-white hover:border-indigo-500 hover:shadow-lg transition-all duration-300 active:scale-[0.98] group flex flex-col justify-between ${className || ''}`}
      onClick={() => onClick(game)}
    >
      <CardContent className="p-5 pt-5 sm:p-6 sm:pt-6 flex flex-col h-full text-left">
        {/* Header Section */}
        <div className="flex justify-between items-start w-full mb-3">
          <div className="flex flex-col gap-1 pr-3 text-left min-w-0 flex-1">
            <h3
              className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 text-left m-0 p-0 leading-snug"
              title={game.name}
            >
              {game.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getGameTypeColor(game.game_type)}`}>
                {getLabel(game.game_type)}
              </span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                isPublic ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {getLabel(game.game_visibility_mode || 'PUBLIC')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                {new Date(game.created).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 flex-shrink-0 shadow-sm ml-2">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-6 text-left flex-grow font-normal leading-relaxed">
          {game.description || "No description provided for this game."}
        </p>

        {/* Bottom Section */}
        <div className="space-y-4 mt-auto">
          {/* Metadata Row */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200 group-hover:border-indigo-100 transition-colors">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-mono font-bold text-gray-600">
                {game.game_code}
              </span>
            </div>
            
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(game.game_status)}`}>
              {getLabel(game.game_status)}
            </span>
          </div>

          {/* Game Master Profile */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {game.game_master.profile_name ? game.game_master.profile_name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Host</span>
                <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                  {game.game_master.profile_name}
                </span>
              </div>
            </div>

            <span className="text-xs font-medium text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 transition-colors">
              Join Game
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
