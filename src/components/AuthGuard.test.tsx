import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import { HOME_ROUTE, LOGIN_ROUTE } from '../constants/routes';
import { configureStore } from '@reduxjs/toolkit';
import { JSX } from 'react';

// Mock Redux store setup
const createMockStore = (accessToken: string | null) => {
  return configureStore({
    reducer: {
      auth: (state = { authData: { profiles: { PLAYER: { access_token: accessToken } } } }, action) => state,
    },
  });
};

const TestComponent = () => <div>Protected Content</div>;
const LoginComponent = () => <div>Login Page</div>;
const HomeComponent = () => <div>Home Page</div>;

const renderWithRouter = (ui: JSX.Element, { route = '/' } = {}, store: any) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={ui} />
          <Route path={LOGIN_ROUTE} element={<LoginComponent />} />
          <Route path={HOME_ROUTE} element={<HomeComponent />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
};

describe('AuthGuard', () => {
  test('redirects to login if user is NOT authenticated and requireAuth is true', () => {
    const store = createMockStore(null);
    renderWithRouter(
      <AuthGuard requireAuth={true}>
        <TestComponent />
      </AuthGuard>,
      { route: '/' },
      store
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('renders children if user IS authenticated and requireAuth is true', () => {
    const store = createMockStore('valid-token');
    renderWithRouter(
      <AuthGuard requireAuth={true}>
        <TestComponent />
      </AuthGuard>,
      { route: '/' },
      store
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects to home if user IS authenticated and requireAuth is false', () => {
    const store = createMockStore('valid-token');
    renderWithRouter(
      <AuthGuard requireAuth={false}>
        <TestComponent />
      </AuthGuard>,
      { route: '/' },
      store
    );
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  test('renders children if user is NOT authenticated and requireAuth is false', () => {
    const store = createMockStore(null);
    renderWithRouter(
      <AuthGuard requireAuth={false}>
        <TestComponent />
      </AuthGuard>,
      { route: '/' },
      store
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
