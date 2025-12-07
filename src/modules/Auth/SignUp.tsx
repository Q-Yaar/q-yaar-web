import React, { useState } from "react";
import { Eye, EyeOff, Mail, Gamepad, Lock, AlertCircle, User } from "lucide-react";
import { useSignupMutation } from "../../apis/api";
import { setToken } from "../../redux/auth-reducer";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE, LOGIN_ROUTE } from "../../constants/routes"; // Assuming you have a LOGIN_ROUTE

export default function SignUp() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Validation State
    const [errors, setErrors] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [touched, setTouched] = useState({
        name: false,
        email: false,
        password: false,
        confirmPassword: false
    });

    // API Mutation (Make sure to add this to your API slice)
    const [register, { isLoading }] = useSignupMutation();

    // --- Validation Logic ---
    const validateName = (name: string) => {
        if (!name.trim()) return "Full name is required";
        if (name.length < 2) return "Name must be at least 2 characters";
        return "";
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return "Email is required";
        if (!emailRegex.test(email)) return "Please enter a valid email";
        return "";
    };

    const validatePassword = (password: string) => {
        if (!password) return "Password is required";
        if (password.length < 6) return "Password must be at least 6 characters";
        return "";
    };

    const validateConfirmPassword = (confirm: string, original: string) => {
        if (!confirm) return "Please confirm your password";
        if (confirm !== original) return "Passwords do not match";
        return "";
    };

    // --- Handlers ---
    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Real-time validation if already touched
        if (touched[field as keyof typeof touched]) {
            // We handle specific logic inside a useEffect or just let blur handle it, 
            // but for simple forms, clearing error on change is often enough:
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleBlur = (field: keyof typeof touched) => {
        setTouched((prev) => ({ ...prev, [field]: true }));

        let errorMessage = "";
        switch (field) {
            case "name": errorMessage = validateName(formData.name); break;
            case "email": errorMessage = validateEmail(formData.email); break;
            case "password": errorMessage = validatePassword(formData.password); break;
            case "confirmPassword": errorMessage = validateConfirmPassword(formData.confirmPassword, formData.password); break;
        }

        setErrors((prev) => ({ ...prev, [field]: errorMessage }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Run all validations
        const nameError = validateName(formData.name);
        const emailError = validateEmail(formData.email);
        const passwordError = validatePassword(formData.password);
        const confirmError = validateConfirmPassword(formData.confirmPassword, formData.password);

        setErrors({
            name: nameError,
            email: emailError,
            password: passwordError,
            confirmPassword: confirmError,
        });

        setTouched({ name: true, email: true, password: true, confirmPassword: true });

        if (!nameError && !emailError && !passwordError && !confirmError) {
            try {
                const result = await register({
                    email: formData.email,
                    password: formData.password,
                    confirm_password: formData.confirmPassword,
                    role: 'PLAYER',
                    profile_name: formData.name,

                }).unwrap();

                // Assuming register returns a token, otherwise redirect to login
                if (result?.user?.access_token) {
                    dispatch(setToken({ authData: result }));
                    navigate(HOME_ROUTE);
                } else {
                    // If registration requires email verification or doesn't auto-login
                    alert("Account created! Please log in.");
                    navigate(LOGIN_ROUTE || "/login");
                }

                console.log("Registration successful:", result);
            } catch (error: any) {
                console.error("Registration failed:", error);
                setErrors((prev) => ({
                    ...prev,
                    email: error?.data?.message || "Registration failed. Please try again.",
                }));
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md my-8">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
                        <Gamepad className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-600">Join Game Game to start playing</p>
                </div>

                {/* Sign Up Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    onBlur={() => handleBlur("name")}
                                    className={`block w-full pl-10 pr-3 py-3 border ${touched.name && errors.name
                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                        } rounded-lg focus:outline-none focus:ring-2 transition-colors`}
                                    placeholder="John Doe"
                                />
                            </div>
                            {touched.name && errors.name && (
                                <div className="mt-2 flex items-center text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    onBlur={() => handleBlur("email")}
                                    className={`block w-full pl-10 pr-3 py-3 border ${touched.email && errors.email
                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                        } rounded-lg focus:outline-none focus:ring-2 transition-colors`}
                                    placeholder="you@example.com"
                                />
                            </div>
                            {touched.email && errors.email && (
                                <div className="mt-2 flex items-center text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors.email}
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => handleChange("password", e.target.value)}
                                    onBlur={() => handleBlur("password")}
                                    className={`block w-full pl-10 pr-12 py-3 border ${touched.password && errors.password
                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                        } rounded-lg focus:outline-none focus:ring-2 transition-colors`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    )}
                                </button>
                            </div>
                            {touched.password && errors.password && (
                                <div className="mt-2 flex items-center text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors.password}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                    onBlur={() => handleBlur("confirmPassword")}
                                    className={`block w-full pl-10 pr-12 py-3 border ${touched.confirmPassword && errors.confirmPassword
                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                        } rounded-lg focus:outline-none focus:ring-2 transition-colors`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    )}
                                </button>
                            </div>
                            {touched.confirmPassword && errors.confirmPassword && (
                                <div className="mt-2 flex items-center text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors.confirmPassword}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-6 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <button
                            onClick={() => navigate(LOGIN_ROUTE || '/login')}
                            className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            Sign in
                        </button>
                    </p>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-gray-500">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}