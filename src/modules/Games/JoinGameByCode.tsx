import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetchGameByCodeQuery } from '../../apis/gameApi';
import { EXPLORE_GAME_DETAIL_ROUTE, HOME_ROUTE } from '../../constants/routes';
import { getRoute } from '../../utils/getRoute';
import LoadingScreen from '../../components/LoadingScreen';
import ErrorScreen from '../../components/ErrorScreen';

export default function JoinGameByCode() {
  const navigate = useNavigate();
  const { gameCode } = useParams<{ gameCode: string }>();
  const normalizedCode = (gameCode || '').trim().toLowerCase();

  const { data: game, isLoading, isError } = useFetchGameByCodeQuery(normalizedCode, {
    skip: !normalizedCode,
  });

  useEffect(() => {
    if (game && game.game_id) {
      navigate(getRoute(EXPLORE_GAME_DETAIL_ROUTE, { gameId: game.game_id }), { replace: true });
    }
  }, [game, navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || (!isLoading && !game)) {
    return (
      <ErrorScreen
        title="Game Not Found"
        description={`No game found matching code "${gameCode || ''}". Please check the link or code and try again.`}
        action={() => navigate(HOME_ROUTE)}
      />
    );
  }

  return <LoadingScreen />;
}
