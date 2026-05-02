import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;
console.log("🩷API_URL:", API_URL);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🩷API_URL:", API_URL);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      login(data.user, data.access_token);

      if (data.user.role === "admin") {
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
          <h1 className="text-xl font-bold text-black">
            Enterprise Knowledge Assistant
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              placeholder="you@company.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
