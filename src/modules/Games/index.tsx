import React, { useState, useEffect, useMemo } from 'react';
import { Gamepad2, RefreshCcw, LogOut, Search, SlidersHorizontal, Compass, X, Loader2, KeyRound, Hash, ArrowRight, AlertCircle } from 'lucide-react';
import { GameCard } from './GameCard';
import { ExploreGameCard } from './ExploreGameCard';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useFetchGamesQuery, useExploreGamesQuery, useLazyFetchGameByCodeQuery } from '../../apis/gameApi';
import { Game } from '../../models/Game';
import { useNavigate } from 'react-router-dom';
import { getRoute } from '../../utils/getRoute';
import { GAME_DETAIL_ROUTE, EXPLORE_GAME_DETAIL_ROUTE, LOGIN_ROUTE } from '../../constants/routes';
import { useDispatch } from 'react-redux';
import { clearToken } from '../../redux/auth-reducer';
import LoadingScreen from 'components/LoadingScreen';
import ErrorScreen from 'components/ErrorScreen';

function ExploreSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1 pr-4">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-150 rounded w-1/2"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="space-y-2 py-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GameList() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Active Games Query
  const { data: activeData, isLoading: isActiveLoading, isError: isActiveError, refetch: refetchActive } = useFetchGamesQuery(null);
  const activeGames = activeData?.results || [];

  // Game Code lookup state & hook
  const [inputGameCode, setInputGameCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [fetchGameByCode, { isLoading: isFetchingByCode }] = useLazyFetchGameByCodeQuery();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState('ALL');
  const [gameStatusFilter, setGameStatusFilter] = useState('ALL');
  const [gameVisibilityFilter, setGameVisibilityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Explore Games Query
  const { data: exploreData, isLoading: isExploreLoading, isError: isExploreError, refetch: refetchExplore } = useExploreGamesQuery(
    debouncedSearch.trim() ? { search: debouncedSearch.trim() } : undefined
  );

  const handleLogout = () => {
    dispatch(clearToken());
    navigate(LOGIN_ROUTE);
  };

  const handleSelectActiveGame = (game: Game) => {
    navigate(getRoute(GAME_DETAIL_ROUTE, { gameId: game.game_id }));
  };

  const handleSelectExploreGame = (game: Game) => {
    navigate(getRoute(EXPLORE_GAME_DETAIL_ROUTE, { gameId: game.game_id }));
  };

  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputGameCode.trim();
    if (!trimmed) return;
    setCodeError(null);

    try {
      const game = await fetchGameByCode(trimmed).unwrap();
      if (game && game.game_id) {
        navigate(getRoute(EXPLORE_GAME_DETAIL_ROUTE, { gameId: game.game_id }));
      } else {
        setCodeError(`No game found with code "${trimmed}".`);
      }
    } catch (err: any) {
      console.error('Failed to fetch game by code:', err);
      setCodeError(err?.data?.detail || err?.data?.message || `No game found with code "${trimmed}".`);
    }
  };

  const handleRefreshAll = () => {
    refetchActive();
    refetchExplore();
  };

  // Client-side filtering & sorting on the explore games list
  const filteredExploreGames = useMemo(() => {
    let list: Game[] = Array.isArray(exploreData)
      ? exploreData
      : exploreData?.results || [];

    // Filter by type
    if (gameTypeFilter !== 'ALL') {
      list = list.filter((game: Game) => game.game_type === gameTypeFilter);
    }

    // Filter by status
    if (gameStatusFilter !== 'ALL') {
      list = list.filter((game: Game) => game.game_status === gameStatusFilter);
    }

    // Filter by visibility mode
    if (gameVisibilityFilter !== 'ALL') {
      list = list.filter(
        (game: Game) =>
          (game.game_visibility_mode || 'PUBLIC').toUpperCase() ===
          gameVisibilityFilter
      );
    }

    // Sort
    list = [...list].sort((a: Game, b: Game) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.created).getTime() - new Date(b.created).getTime();
      }
      if (sortBy === 'ALPHABETICAL') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [exploreData, gameTypeFilter, gameStatusFilter, gameVisibilityFilter, sortBy]);

  if (isActiveLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <Header
        title="Games Lobby"
        showBack={false}
        icon={<Gamepad2 className="w-5 h-5 mr-2 text-indigo-600" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshAll}
              className="text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full"
              title="Refresh All"
            >
              <RefreshCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-600 hover:bg-white rounded-full"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Section 1: Active Games (Top of Lobby) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-left">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
                Active Games
                {activeGames.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                    {activeGames.length}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500">Games you are currently participating in.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isActiveError ? (
              <div className="col-span-full text-center py-8 bg-white rounded-2xl shadow-sm border border-red-100 p-6">
                <p className="text-red-500 font-semibold text-sm">Failed to load active games.</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">The server encountered an error while fetching your active sessions.</p>
                <Button onClick={() => refetchActive()} variant="outline" size="sm">
                  Retry Active Games
                </Button>
              </div>
            ) : activeGames.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No active games found.</p>
                <p className="text-xs text-gray-400 mt-1">Explore and join public sessions below.</p>
              </div>
            ) : (
              activeGames.map((game: Game) => (
                <GameCard
                  key={game.game_id}
                  game={game}
                  onClick={handleSelectActiveGame}
                />
              ))
            )}
          </div>
        </div>

        {/* Join Game with Game Code Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-indigo-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-md border border-white/15">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Direct Join</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Have a Game Code?
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                Enter a 6-character game code to look up public or private sessions and view teams, players, and join details.
              </p>
            </div>

            <form onSubmit={handleJoinByCodeSubmit} className="w-full md:w-auto min-w-[280px] sm:min-w-[340px]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md focus-within:border-white/40 transition-colors">
                  <Hash className="w-4 h-4 text-indigo-300 ml-3 flex-shrink-0" />
                  <Input
                    type="text"
                    placeholder="e.g. bdd5de"
                    value={inputGameCode}
                    onChange={(e) => {
                      setInputGameCode(e.target.value);
                      setCodeError(null);
                    }}
                    maxLength={12}
                    className="bg-transparent border-0 text-white font-mono font-bold text-sm tracking-wider placeholder:text-indigo-200/50 focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                  />
                  <Button
                    type="submit"
                    disabled={isFetchingByCode || !inputGameCode.trim()}
                    className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold px-5 py-2.5 rounded-xl text-xs flex-shrink-0 shadow-sm transition-all"
                  >
                    {isFetchingByCode ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-900" />
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Join Game
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Button>
                </div>
                {codeError && (
                  <p className="text-xs text-rose-300 font-medium px-3 text-left animate-fade-in flex items-center gap-1.5 bg-rose-950/40 py-1.5 rounded-lg border border-rose-500/30">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {codeError}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Section Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Discover Mode
            </span>
          </div>
        </div>

        {/* Section 2: Explore Games / Discovery Section */}
        <div className="space-y-6">
          <div className="space-y-1 text-left">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Game Discovery
            </h2>
            <p className="text-sm text-gray-500">Search and filter for public game sessions in your region.</p>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by game name, code, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 bg-gray-50/50 border-gray-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                <SlidersHorizontal className="w-3 h-3 text-gray-400 hidden sm:inline" />
                <select
                  value={gameTypeFilter}
                  onChange={(e) => setGameTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer pr-1 py-1"
                >
                  <option value="ALL">All Types</option>
                  <option value="HIDE_N_SEEK">Hide & Seek</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                <select
                  value={gameStatusFilter}
                  onChange={(e) => setGameStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer pr-1 py-1"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Visibility Filter */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                <select
                  value={gameVisibilityFilter}
                  onChange={(e) => setGameVisibilityFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer pr-1 py-1"
                >
                  <option value="ALL">All Visibility</option>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 col-span-2 sm:col-span-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer pr-1 py-1 w-full"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="ALPHABETICAL">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Explore Grid / Results */}
          <div className="w-full">
            {isExploreLoading ? (
              <ExploreSkeleton />
            ) : isExploreError ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-red-500 font-semibold">Failed to fetch discoverable games.</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">There was a network or server issue.</p>
                <Button onClick={() => refetchExplore()} variant="outline" size="sm">
                  Retry Fetch
                </Button>
              </div>
            ) : filteredExploreGames.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 px-4">
                <Compass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                {searchQuery || gameTypeFilter !== 'ALL' || gameStatusFilter !== 'ALL' || gameVisibilityFilter !== 'ALL' ? (
                  <>
                    <p className="text-gray-600 font-semibold">No discoverable games match your search or filter criteria.</p>
                    <p className="text-xs text-gray-400 mt-1">Try broadening your search term or adjusting filter dropdowns.</p>
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setGameTypeFilter('ALL');
                        setGameStatusFilter('ALL');
                        setGameVisibilityFilter('ALL');
                      }}
                      variant="link"
                      className="mt-2 text-indigo-600 font-semibold"
                    >
                      Clear All Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 font-semibold">No new discoverable games available right now.</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      You are either currently participating in all available game sessions, or no new public games are open to join.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredExploreGames.map((game: Game) => (
                  <ExploreGameCard
                    key={game.game_id}
                    game={game}
                    onClick={handleSelectExploreGame}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
