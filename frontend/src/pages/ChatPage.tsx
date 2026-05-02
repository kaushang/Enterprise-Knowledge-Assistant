import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MessageBubble from "../components/MessageBubble";
import { Link } from "react-router-dom";

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
    logout();
    navigate("/login");
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
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-black">Chat History</h2>
        </div>

        {/* Knowledge Base link */}
        <div className="px-4 py-3 border-b border-gray-100">
          <Link
            to="/knowledge-base"
            className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:underline"
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
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 && (
            <p className="text-xs text-gray-400 p-4">No history yet</p>
          )}
          {history.map((item, i) => (
            <button
              key={i}
              onClick={() => loadFromHistory(item)}
              className="w-full text-left px-4 py-3 text-xs text-gray-600 hover:bg-gray-50 border-b border-gray-100 truncate"
            >
              {item.question}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6">
          <span className="text-sm font-semibold text-black">
            Enterprise Knowledge Assistant
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-400">
                Ask a question about company policies or procedures
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
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
        <div className="border-t border-gray-200 px-6 py-4">
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
  );
}
