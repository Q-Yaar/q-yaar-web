import React, { useState, useEffect, useMemo } from 'react';
import { Gamepad2, RefreshCcw, LogOut, Search, SlidersHorizontal, Compass, X, Loader2, KeyRound, Hash, ArrowRight, AlertCircle } from 'lucide-react';
import { GameCard } from './GameCard';
import { ExploreGameCard } from './ExploreGameCard';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { useFetchGamesQuery, useExploreGamesQuery, useLazyFetchGameByCodeQuery } from '../../apis/gameApi';
import { Game } from '../../models/Game';
import { useNavigate } from 'react-router-dom';
import { getRoute } from '../../utils/getRoute';
import { GAME_DETAIL_ROUTE, EXPLORE_GAME_DETAIL_ROUTE, LOGIN_ROUTE } from '../../constants/routes';
import { useDispatch } from 'react-redux';
import { clearToken } from '../../redux/auth-reducer';
import LoadingScreen from 'components/LoadingScreen';

function ExploreSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
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

  // Tab State: ACTIVE vs DISCOVER
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DISCOVER'>('ACTIVE');

  // Popup Modal State for Join Code
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Active Games Query
  const { data: activeData, isLoading: isActiveLoading, isError: isActiveError, refetch: refetchActive } = useFetchGamesQuery(null);
  const activeGames = activeData?.results || [];

  // Game Code lookup state & hook
  const [inputGameCode, setInputGameCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [fetchGameByCode, { isLoading: isFetchingByCode }] = useLazyFetchGameByCodeQuery();

  // Search & Type Filter state for Discover Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState('ALL');

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
        setIsCodeModalOpen(false);
        setInputGameCode('');
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

  // Filter explore games only by game type
  const filteredExploreGames = useMemo(() => {
    let list: Game[] = Array.isArray(exploreData)
      ? exploreData
      : exploreData?.results || [];

    if (gameTypeFilter !== 'ALL') {
      list = list.filter((game: Game) => game.game_type === gameTypeFilter);
    }

    return list;
  }, [exploreData, gameTypeFilter]);

  if (isActiveLoading && !activeData) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 text-left">
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

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Prominent Two-Tab Selector */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="bg-gray-200/80 p-1.5 rounded-2xl flex items-center gap-1.5 w-full sm:w-auto shadow-xs">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-indigo-600" />
              <span>Active Games</span>
              {activeGames.length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'ACTIVE'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {activeGames.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('DISCOVER')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'DISCOVER'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Discover Games</span>
              {filteredExploreGames.length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'DISCOVER'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {filteredExploreGames.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Super Compact Direct Game Code Join Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-2.5 sm:p-3 sm:px-4 shadow-xs flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <KeyRound className="w-4 h-4 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                Have a Game Code?
              </h3>
              <p className="text-[11px] text-indigo-200/80 hidden sm:block truncate">
                Enter code to view game details and join teams.
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setCodeError(null);
              setIsCodeModalOpen(true);
            }}
            className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs px-3.5 py-1.5 h-8 rounded-xl shrink-0 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5 text-indigo-600" />
            <span>Enter Code</span>
          </Button>
        </div>

        {/* TAB 1 CONTENT: Active Games */}
        {activeTab === 'ACTIVE' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Active Games
                {activeGames.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                    {activeGames.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">Games you are currently participating in.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {isActiveError ? (
                <div className="col-span-full text-center py-8 bg-white rounded-2xl shadow-xs border border-red-100 p-6">
                  <p className="text-red-500 font-semibold text-sm">Failed to load active games.</p>
                  <p className="text-xs text-gray-400 mt-1 mb-3">The server encountered an error while fetching your active sessions.</p>
                  <Button onClick={() => refetchActive()} variant="outline" size="sm">
                    Retry Active Games
                  </Button>
                </div>
              ) : activeGames.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-xs border border-dashed border-gray-300 p-6">
                  <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-bold text-base">No active games found.</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Switch to the Discover Games tab to explore public game sessions.</p>
                  <Button
                    onClick={() => setActiveTab('DISCOVER')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
                  >
                    Discover Public Games
                  </Button>
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
        )}

        {/* TAB 2 CONTENT: Discover Games */}
        {activeTab === 'DISCOVER' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Discover Games
              </h3>
              <p className="text-xs text-gray-500">Search and filter for public game sessions in your region.</p>
            </div>

            {/* Simplified Search & Type Filter Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
              {/* Search Input */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search games by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8 py-2 text-xs sm:text-sm bg-gray-50/60 border-gray-200 focus-visible:ring-indigo-500 rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-auto shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Type:</span>
                <select
                  value={gameTypeFilter}
                  onChange={(e) => setGameTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer w-full sm:w-auto pr-1"
                >
                  <option value="ALL">All Game Types</option>
                  <option value="HIDE_N_SEEK">Hide & Seek</option>
                </select>
              </div>
            </div>

            {/* Explore Grid / Results */}
            <div className="w-full">
              {isExploreLoading ? (
                <ExploreSkeleton />
              ) : isExploreError ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
                  <p className="text-red-500 font-semibold text-sm">Failed to fetch discoverable games.</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">There was a network or server issue.</p>
                  <Button onClick={() => refetchExplore()} variant="outline" size="sm">
                    Retry Fetch
                  </Button>
                </div>
              ) : filteredExploreGames.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 p-6">
                  <Compass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  {searchQuery || gameTypeFilter !== 'ALL' ? (
                    <>
                      <p className="text-gray-700 font-semibold text-sm">No games match your search or filter criteria.</p>
                      <p className="text-xs text-gray-400 mt-1">Try broadening your search term or selecting "All Game Types".</p>
                      <Button
                        onClick={() => {
                          setSearchQuery('');
                          setGameTypeFilter('ALL');
                        }}
                        variant="link"
                        className="mt-2 text-indigo-600 font-bold text-xs"
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700 font-semibold text-sm">No discoverable games available right now.</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        You are either currently participating in all available sessions, or no new public games are open to join.
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
        )}

        {/* Join with Game Code Popup Modal */}
        <Modal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          title="Join Game by Code"
          className="max-w-md w-full rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 text-left"
        >
          {/* Mobile Drag Handle Indicator */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

          <form onSubmit={handleJoinByCodeSubmit} className="space-y-4">
            <p className="text-xs text-gray-500 text-left leading-relaxed">
              Enter the 6-character game code provided by your game host to look up details and join a team.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Hash className="w-4 h-4 text-indigo-600 ml-2 shrink-0" />
                <Input
                  type="text"
                  placeholder="e.g. bdd5de"
                  value={inputGameCode}
                  onChange={(e) => {
                    setInputGameCode(e.target.value);
                    setCodeError(null);
                  }}
                  maxLength={12}
                  autoFocus
                  className="bg-transparent border-0 text-gray-900 font-mono font-bold text-sm tracking-wider placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 uppercase"
                />
              </div>

              {codeError && (
                <p className="text-xs text-rose-600 font-medium px-3 py-2 text-left flex items-center gap-1.5 bg-rose-50 rounded-xl border border-rose-200 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{codeError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCodeModalOpen(false)}
                className="text-xs font-semibold text-gray-600 border-gray-200 h-10 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isFetchingByCode || !inputGameCode.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isFetchingByCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Looking up...</span>
                  </>
                ) : (
                  <>
                    <span>Join Game</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
