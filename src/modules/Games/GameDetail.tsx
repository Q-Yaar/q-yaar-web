import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Hash,
  User,
  Calendar,
  MapPin,
  Users,
  MessageSquare,
  Clock,
  Share2,
  ChevronLeft
} from "lucide-react";
import { useFetchGameDetailsQuery } from "../../apis/gameApi";

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: game, isLoading, isError } = useFetchGameDetailsQuery(id || "", {
    skip: !id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS": return "bg-green-100 text-green-800";
      case "COMPLETED": return "bg-gray-100 text-gray-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Game not found</h2>
        <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Games
        </button>

        {/* --- HEADER SECTION (Real Data) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusColor(game.game_status)}`}>
                  {game.game_status}
                </span>
                <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(game.created).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 text-left">{game.name}</h1>
              <p className="text-gray-500 max-w-2xl">{game.description}</p>
            </div>

            {/* Game Code Box */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center min-w-[150px]">
                <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider block mb-1">Game Code</span>
                <div className="flex items-center justify-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-400" />
                  <span className="text-2xl font-mono font-bold text-gray-900">{game.game_code}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN: Core Details (Real Data) */}
          <div className="lg:col-span-1 space-y-6">

            {/* Game Master Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> Host Details
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {game.game_master.profile_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{game.game_master.profile_name}</p>
                  <p className="text-xs text-gray-500">{game.game_master.email_id}</p>
                  <p className="text-xs text-gray-400 mt-1">{game.game_master.phone}</p>
                </div>
              </div>
            </div>

            {/* Game Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Game Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-900">{game.game_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="font-medium text-gray-900">{new Date(game.modified).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Future Modules (Placeholders) */}
          <div className="lg:col-span-2 space-y-6">

            {/* MODULE: PLAYERS (Future Implementation) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-24 h-24 text-indigo-600" />
              </div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> Players
                </h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded font-medium">Coming Soon</span>
              </div>

              {/* Empty State / Placeholder UI */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                <p className="text-gray-500 font-medium">Player list module will go here</p>
                <p className="text-gray-400 text-sm mt-1">Will display active participants and their status.</p>
              </div>
            </div>

            {/* MODULE: MAP / LOCATION (Future Implementation) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <MapPin className="w-24 h-24 text-emerald-600" />
              </div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" /> Live Map
                </h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded font-medium">Coming Soon</span>
              </div>

              {/* Empty State / Placeholder UI */}
              <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Map visualization pending integration</p>
                </div>
              </div>
            </div>

            {/* MODULE: GAME LOGS (Future Implementation) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" /> Activity Feed
                </h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded font-medium">Coming Soon</span>
              </div>
              <div className="space-y-3 opacity-50">
                {/* Mock skeleton items */}
                <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                <div className="h-2 bg-gray-100 rounded w-5/6"></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}