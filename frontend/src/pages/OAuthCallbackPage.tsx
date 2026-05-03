import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface OAuthUser {
  name: string;
  email: string;
  role: string;
}

export default function OAuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.slice(1) || window.location.search,
    );
    const accessToken = params.get("access_token");
    const userParam = params.get("user");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(oauthError);
      return;
    }

    if (!accessToken || !userParam) {
      setError("Google sign in did not return a valid session.");
      return;
    }

    try {
      const user = JSON.parse(userParam) as OAuthUser;
      login(user, accessToken);
      navigate(user.role === "admin" ? "/admin" : "/chat", { replace: true });
    } catch (err) {
      setError("Could not finish Google sign in.");
    }
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-black">Signing you in</h1>
        {error ? (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        ) : (
          <p className="text-sm text-gray-600 mt-4">
            Finishing Google authentication...
          </p>
        )}
      </div>
    </div>
  );
}
