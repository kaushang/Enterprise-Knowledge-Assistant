import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface Document {
  id: number;
  filename: string;
  chunk_count: number;
  category: string;
  uploaded_at: string;
}

const CATEGORIES = [
  "All",
  "General",
  "Legal Policies",
  "Joining Policies",
  "Leaving Policies",
  "HR Policies",
  "Finance Policies",
  "IT Policies",
];

export default function KnowledgeBasePage() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  async function fetchDocuments() {
    setLoading(true);
    setError("");
    try {
      const url =
        selectedCategory === "All"
          ? `${API_URL}/admin/documents`
          : `${API_URL}/admin/documents?category=${encodeURIComponent(selectedCategory)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        navigate("/login");
        return;
      }

      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const filtered = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(search.toLowerCase()),
  );

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <span className="text-sm font-semibold text-black">
          Nebula9 Knowledge Assistant
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-blue-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title and nav */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold text-black">
              Knowledge Base
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Browse all available documents
            </p>
          </div>
          <Link to="/chat" className="text-xs text-blue-600 hover:underline">
            Back to Chat
          </Link>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full border border-gray-300 rounded pl-9 pr-4 py-2 text-sm text-black focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Document grid */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">
              {documents.length === 0
                ? "No documents uploaded yet. Ask your admin to upload knowledge base documents."
                : "No documents match your search."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-8 h-8 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {doc.filename}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {doc.category}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">
                      {doc.chunk_count} chunks
                    </p>
                    <p className="text-xs text-gray-400">
                      Uploaded {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
