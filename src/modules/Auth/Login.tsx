import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Gamepad, Lock, AlertCircle } from 'lucide-react';
import { useLoginMutation } from '../../apis/api';
import { setToken } from '../../redux/auth-reducer';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HOME_ROUTE, SIGNUP_ROUTE } from '../../constants/routes';

import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from 'components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  const [login, { isLoading }] = useLoginMutation();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({ email: emailError, password: passwordError });
    setTouched({ email: true, password: true });

    if (!emailError && !passwordError) {
      try {
        const result = await login({ email, password }).unwrap();
        dispatch(setToken({ authData: result }));
        navigate(HOME_ROUTE);
        console.log('Login successful:', result);
      } catch (error: any) {
        console.error('Login failed:', error);
        setErrors({
          email: '',
          password: error?.data?.message || 'Login failed. Please try again.',
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Gamepad className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Game</h1>
          <p className="text-gray-600">Sign in to continue to your account</p>
        </div>

        <Card className="border-gray-100 shadow-xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`pl-10 ${touched.email && errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    placeholder="you@example.com"
                  />
                </div>
                {touched.email && errors.email && (
                  <div className="flex items-center text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`pl-10 pr-10 ${touched.password && errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div className="flex items-center text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-indigo-600 hover:text-indigo-500"
                onClick={() => navigate(SIGNUP_ROUTE)}
              >
                Sign up
              </Button>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to play our games.
        </p>
      </div>
    </div>
  );
}
