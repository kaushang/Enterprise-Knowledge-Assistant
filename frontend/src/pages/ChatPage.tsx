import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MessageBubble from "../components/MessageBubble";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL;

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface HistoryItem {
  question: string;
  answer: string;
  sources: string;
  created_at: string;
}

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchHistory() {
    try {
      const res = await fetch(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);

      fetchHistory();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleLogout() {
    setShowLogoutConfirm(true);
  }

  function confirmLogout() {
    logout();
    navigate("/login");
  }

  function startNewChat() {
    setMessages([]);
    setInput("");
  }

  function loadFromHistory(item: HistoryItem) {
    setMessages([
      { role: "user", content: item.question },
      {
        role: "assistant",
        content: item.answer,
        sources: item.sources ? item.sources.split(", ") : [],
      },
    ]);
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-white">
      {/* Header */}
      <Navbar
        title="Enterprise Knowledge Assistant"
        userName={user?.name}
        onLogout={handleLogout}
      />

      {/* Content area with sidebar and main chat */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white px-2">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={startNewChat}
              className="w-full bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              + New Chat
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <div className="px-4 pt-4">
                <h2 className="text-xs font-semibold text-gray-400 pb-2">
                  Chat History
                </h2>
              </div>
              {/* History list */}
              <div className="flex-1 overflow-y-auto -pb-2">
                {history.length === 0 && (
                  <p className="text-xs text-gray-400 p-4">No history yet</p>
                )}
                {history.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => loadFromHistory(item)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 truncate"
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="px-4 pt-4">
                <h2 className="text-xs font-semibold text-gray-400 pb-2">
                  Navigate
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* <button
                        onClick={() => navigate("/chat")}
                        className="w-full text-left px-4 py-1 text-sm text-gray-800  hover:bg-gray-100"
                      >
                        Chat
                      </button> */}
                <button
                  onClick={() => navigate("/knowledge-base")}
                  className="w-full text-left px-4 py-1 text-sm text-gray-800 hover:bg-gray-100"
                >
                  Knowledge base
                </button>
              </div>
            </div>
          </div>

          {/* <div className="px-4 py-8 border-b border-gray-100">
            <Link
              to="/knowledge-base"
              className="w-full flex items-center justify-center gap-2 text-blue-600 text-md font-medium rounded transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
              Browse Knowledge Base
            </Link>
          </div> */}
        </div>

        {/* Main chat area */}
        <div className="min-h-0 flex-1 flex flex-col">
          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-gray-400">
                  Ask a question about company policies or procedures
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} userName={user?.name} />
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
                rows={2}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 resize-none"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
