import { useEffect, useState, FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface PendingGoogleSignup {
  signupToken: string;
  name: string;
  email: string;
}

interface RegisterFieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  department?: string;
  role?: string;
}

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [pendingGoogleSignup, setPendingGoogleSignup] =
    useState<PendingGoogleSignup | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  useEffect(() => {
    const storedSignup = sessionStorage.getItem("pendingGoogleSignup");
    if (!storedSignup) return;

    try {
      const parsedSignup = JSON.parse(storedSignup) as PendingGoogleSignup;
      setPendingGoogleSignup(parsedSignup);
      setForm((prev) => ({
        ...prev,
        name: parsedSignup.name,
        email: parsedSignup.email,
      }));
      setStep(2);
    } catch (err) {
      sessionStorage.removeItem("pendingGoogleSignup");
      setError("Could not continue Google registration.");
    }
  }, [location.search]);

  const isGoogleSignup = Boolean(pendingGoogleSignup);

  function validateName(name: string): string | undefined {
    if (!name.trim()) return "Full name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.length > 100) return "Name must not exceed 100 characters";
    return undefined;
  }

  function validateEmail(email: string): string | undefined {
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return undefined;
  }

  function validatePassword(password: string): string | undefined {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 50) return "Password must not exceed 50 characters";
    return undefined;
  }

  function validateConfirmPassword(): string | undefined {
    if (!form.confirmPassword) return "Please confirm your password";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return undefined;
  }

  function validateDepartment(department: string): string | undefined {
    if (department && department.length > 100) {
      return "Department name must not exceed 100 characters";
    }
    return undefined;
  }

  function validateRole(role: string): string | undefined {
    if (!role) return "Role is required";
    return undefined;
  }

  function validateAccountStep(): boolean {
    const errors: RegisterFieldErrors = {};

    const nameError = validateName(form.name);
    if (nameError) errors.name = nameError;

    const emailError = validateEmail(form.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword();
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateProfileStep(): boolean {
    const errors: RegisterFieldErrors = {};

    const departmentError = validateDepartment(form.department);
    if (departmentError) errors.department = departmentError;

    const roleError = validateRole(form.role);
    if (roleError) errors.role = roleError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google/login`;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleAccountContinue(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateAccountStep()) return;
    setStep(2);
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!validateProfileStep()) return;

    setLoading(true);

    try {
      if (pendingGoogleSignup) {
        const res = await fetch(`${API_URL}/auth/google/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signup_token: pendingGoogleSignup.signupToken,
            department: form.department || null,
            role: form.role,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || "Google registration failed");
          return;
        }

        sessionStorage.removeItem("pendingGoogleSignup");
        login(data.user, data.access_token);
        navigate(data.user.role === "admin" ? "/admin" : "/chat");
        return;
      }

      const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          department: form.department || null,
          role: form.role,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setError(registerData.detail || "Registration failed");
        return;
      }

      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError("Registered successfully but login failed. Please login manually.");
        navigate("/login");
        return;
      }

      login(loginData.user, loginData.access_token);
      navigate(loginData.user.role === "admin" ? "/admin" : "/chat");
    } catch (err) {
      setError("Could not connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToAccount() {
    setError("");
    setFieldErrors({});
    setStep(1);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-black">Create your account</h1>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div
                className={`h-2 flex-1 rounded-full ${
                  step >= 1 ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
              <div
                className={`h-2 flex-1 rounded-full ${
                  step >= 2 ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Account</span>
              <span>Profile</span>
            </div>
          </div>
        </div>

        {step === 1 && !isGoogleSignup ? (
          <>
            <form onSubmit={handleAccountContinue}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 ${
                    fieldErrors.name ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="John Doe"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 ${
                    fieldErrors.email ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="you@company.com"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 ${
                    fieldErrors.password
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="********"
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 ${
                    fieldErrors.confirmPassword
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="********"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded hover:bg-blue-700"
              >
                Continue
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-500">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full border border-gray-300 bg-white text-gray-700 text-sm font-medium py-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <img className="w-5 h-5" src="google.png" alt="Google" />
              Continue with Google
            </button>
          </>
        ) : (
          <form onSubmit={handleProfileSubmit}>
            {isGoogleSignup && (
              <div className="mb-5 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{form.name}</p>
                <p className="text-xs text-gray-600">{form.email}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleChange}
                className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 ${
                  fieldErrors.department
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder="e.g. HR, Engineering, Finance"
              />
              {fieldErrors.department && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.department}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 bg-white ${
                  fieldErrors.role ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
              >
                <option value="">Select a role</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              {fieldErrors.role && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.role}</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
              {!isGoogleSignup && (
                <button
                  type="button"
                  onClick={handleBackToAccount}
                  className="w-full border border-gray-300 bg-white text-gray-700 text-sm font-medium py-2 rounded hover:bg-gray-50"
                >
                  Back
                </button>
              )}

            </div>
          </form>
        )}

        <p className="text-xs text-gray-500 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
