import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "employee",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    department?: string;
  }>({});

  function validateName(name: string): string | undefined {
    if (!name.trim()) {
      return "Full name is required";
    }
    if (name.trim().length < 2) {
      return "Name must be at least 2 characters";
    }
    if (name.length > 100) {
      return "Name must not exceed 100 characters";
    }
    return undefined;
  }

  function validateEmail(email: string): string | undefined {
    if (!email.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  }

  function validatePassword(password: string): string | undefined {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password.length > 50) {
      return "Password must not exceed 50 characters";
    }
    return undefined;
  }

  function validateDepartment(department: string): string | undefined {
    if (department && department.length > 100) {
      return "Department name must not exceed 100 characters";
    }
    return undefined;
  }

  function validateForm(): boolean {
    const errors: typeof fieldErrors = {};
    
    const nameError = validateName(form.name);
    if (nameError) errors.name = nameError;
    
    const emailError = validateEmail(form.email);
    if (emailError) errors.email = emailError;
    
    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;
    
    const departmentError = validateDepartment(form.department);
    if (departmentError) errors.department = departmentError;
    
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
    // Clear the error for this field when user starts typing
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setError(registerData.detail || "Registration failed");
        return;
      }

      // Auto login after register
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError(
          "Registered successfully but login failed. Please login manually.",
        );
        navigate("/login");
        return;
      }

      login(loginData.user, loginData.access_token);

      if (loginData.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/chat");
      }
    } catch (err) {
      setError(
        "Could not connect to server. Make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-black">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit}>
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
                fieldErrors.password ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Minimum 6 character
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 ${
                fieldErrors.department ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              placeholder="e.g. HR, Engineering, Finance"
            />
            {fieldErrors.department && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.department}</p>
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
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
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
