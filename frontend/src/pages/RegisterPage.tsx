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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
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
          <h1 className="text-xl font-bold text-black">Nebula9 Internal</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
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
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              placeholder="John Doe"
            />
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
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              placeholder="you@company.com"
            />
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
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              placeholder="••••••••"
            />
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
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              placeholder="e.g. HR, Engineering, Finance"
            />
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
