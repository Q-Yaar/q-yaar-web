import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { JSX } from 'react';
import {
  ANSWER_QUESTION_ROUTE,
  ASK_QUESTION_ROUTE,
  DECK_ROUTE,
  DICE_ROLLER_ROUTE,
  FACTS_ROUTE,
  GAME_DETAIL_ROUTE,
  HOME_ROUTE,
  LOCATION_SETTINGS_ROUTE,
  LOGIN_ROUTE,
  MAP_ROUTE,
  ROOT_ROUTE,
  SIGNUP_ROUTE,
} from './constants/routes';
import Home from './modules/Home';
import AuthGuard from './components/AuthGuard';
import BaseLayout from './Layouts/BaseLayout';
import NotFound from './components/NotFound';
import Login from './modules/Auth/Login';
import MapPage from './modules/Map';
import GameDetail from './modules/Games/GameDetail';
import DiceRoller from './modules/DiceRoller';
import SignUp from './modules/Auth/SignUp';
import DeckPage from './modules/DeckPage';
import { AskQuestionModule } from './modules/QuestionAndAnswer/AskQuestionModule';
import { AnswerQuestionModule } from './modules/QuestionAndAnswer/AnswerQuestionModule';
import { FactsModule } from './modules/Facts/FactsModule';
import { LocationSettings } from './modules/Location/LocationSettings';

function ProtectedRoutes(): JSX.Element {
  return (
    <AuthGuard>
      <BaseLayout>
        <Routes>
          <Route path={HOME_ROUTE} element={<Home />} />
          <Route path={GAME_DETAIL_ROUTE} element={<GameDetail />} />
          <Route path={DICE_ROLLER_ROUTE} element={<DiceRoller />} />
          <Route path={DECK_ROUTE} element={<DeckPage />} />
          <Route path={MAP_ROUTE} element={<MapPage />} />
          <Route path={ASK_QUESTION_ROUTE} element={<AskQuestionModule />} />
          <Route
            path={ANSWER_QUESTION_ROUTE}
            element={<AnswerQuestionModule />}
          />
          <Route path={FACTS_ROUTE} element={<FactsModule />} />
          <Route path={LOCATION_SETTINGS_ROUTE} element={<LocationSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BaseLayout>
    </AuthGuard>
  );
}

export default function AppRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={ROOT_ROUTE}
          element={<Navigate to={LOGIN_ROUTE} replace />}
        />
        <Route
          path={LOGIN_ROUTE}
          element={
            <AuthGuard requireAuth={false}>
              <Login />
            </AuthGuard>
          }
        />
        <Route
          path={SIGNUP_ROUTE}
          element={
            <AuthGuard requireAuth={false}>
              <SignUp />
            </AuthGuard>
          }
        />

        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
