import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { JSX } from 'react';
import {
  DECK_ROUTE,
  DICE_ROLLER_ROUTE,
  GAME_DETAIL_ROUTE,
  HOME_ROUTE,
  LOGIN_ROUTE,
  MAP_ROUTE,
  ROOT_ROUTE,
  SIGNUP_ROUTE,
} from "./constants/routes";
import Home from "./modules/Home";
import AuthGuard from "./components/AuthGuard";
import BaseLayout from "./Layouts/BaseLayout";
import NotFound from "./components/NotFound";
import Login from "./modules/Auth/Login";
import MapPage from "./modules/Map";
import GameDetail from "./modules/Games/GameDetail";
import DiceRoller from "./modules/DiceRoller";
import SignUp from "./modules/Auth/SignUp";
import DeckPage from "./modules/DeckPage";
  ASK_QUESTION_ROUTE,
  ANSWER_QUESTION_ROUTE,
} from './constants/routes';
import Home from './modules/Home';
import AuthGuard from './components/AuthGuard';
import BaseLayout from './Layouts/BaseLayout';
import NotFound from './components/NotFound';
import Login from './modules/Auth/Login';
import Map from './components/Map';
import GameDetail from './modules/Games/GameDetail';
import DiceRoller from './modules/DiceRoller';
import SignUp from './modules/Auth/SignUp';
import DeckPage from './modules/DeckPage';
import { AskQuestionModule } from './modules/Games/AskQuestionModule';
import { AnswerQuestionModule } from './modules/Games/AnswerQuestionModule';

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
        <Route path={LOGIN_ROUTE} element={<Login />} />
        <Route path={SIGNUP_ROUTE} element={<SignUp />} />

        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
