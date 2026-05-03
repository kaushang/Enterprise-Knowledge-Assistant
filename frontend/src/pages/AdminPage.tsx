import { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL;

interface Document {
  id: number;
  filename: string;
  chunk_count: number;
  category: string;
  uploaded_at: string;
}

const CATEGORIES = [
  "General",
  "Legal Policies",
  "Joining Policies",
  "Leaving Policies",
  "HR Policies",
  "Finance Policies",
  "IT Policies",
];

export default function AdminPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("General");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 3 dots menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit modal state
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm state
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        const droppedFile = files[0];
        if (
          droppedFile.name.endsWith(".pdf") ||
          droppedFile.name.endsWith(".txt")
        ) {
          setFile(droppedFile);
          setUploadError("");
          setUploadMessage("");
        } else {
          setUploadError("Please drop a PDF or TXT file");
        }
      }
    }

    dropZone.addEventListener("dragover", handleDragOver as any);
    dropZone.addEventListener("dragleave", handleDragLeave as any);
    dropZone.addEventListener("drop", handleDrop as any);

    return () => {
      dropZone.removeEventListener("dragover", handleDragOver as any);
      dropZone.removeEventListener("dragleave", handleDragLeave as any);
      dropZone.removeEventListener("drop", handleDrop as any);
    };
  }, []);

  async function fetchDocuments() {
    try {
      const res = await fetch(`${API_URL}/admin/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadMessage("");
    setUploadError("");
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  function handleClearFile() {
    setFile(null);
    const input = document.getElementById("file-input") as HTMLInputElement;
    if (input) input.value = "";
    setUploadMessage("");
    setUploadError("");
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    try {
      const res = await fetch(`${API_URL}/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.detail || "Upload failed");
        return;
      }
      setUploadMessage(
        `Successfully uploaded "${data.filename}" - ${data.chunks_created} chunks created`,
      );
      setFile(null);
      const input = document.getElementById("file-input") as HTMLInputElement;
      if (input) input.value = "";
      fetchDocuments();
    } catch (err) {
      setUploadError("Could not connect to server");
    } finally {
      setUploading(false);
    }
  }

  function openEditModal(doc: Document) {
    setEditingDoc(doc);
    setEditFilename(doc.filename);
    setEditCategory(doc.category);
    setEditError("");
    setOpenMenuId(null);
  }

  async function handleEdit() {
    if (!editingDoc) return;
    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch(`${API_URL}/admin/documents/${editingDoc.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: editFilename,
          category: editCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.detail || "Update failed");
        return;
      }
      setEditingDoc(null);
      fetchDocuments();
    } catch (err) {
      setEditError("Could not connect to server");
    } finally {
      setEditLoading(false);
    }
  }

  function openDeleteConfirm(docId: number) {
    setDeletingDocId(docId);
    setOpenMenuId(null);
  }

  async function handleDelete() {
    if (!deletingDocId) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/documents/${deletingDocId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setDeletingDocId(null);
      fetchDocuments();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleLogout() {
    setShowLogoutConfirm(true);
  }

  function confirmLogout() {
    logout();
    navigate("/login");
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navbar
        title="Enterprise Knowledge Assistant - Admin"
        userName={user?.name}
        onLogout={handleLogout}
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Upload section */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Upload Document
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-1">
            <div
              ref={dropZoneRef}
              className={`border-2 border-dashed bg-white border-gray-300 rounded-lg p-8 transition-all duration-200 cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-100"
                  : " hover:border-gray-400"
              }`}
            >
              <div className="flex flex-col gap-4 items-center justify-center">
                <div className="text-4xl">📁</div>
                <div className="text-center">
                  <div className="flex-col items-end gap-1 mb-2">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-md font-semibold text-gray-900">
                        {file
                          ? `Selected: ${file.name}`
                          : "Drag and drop your file here, or "}
                      </p>
                      {file && (
                        <button
                          onClick={handleClearFile}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                          title="Clear selection"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <input
                      id="file-input"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-input"
                      className="text-blue-700 text-sm font-medium cursor-pointer hover:underline"
                    >
                      Browse
                    </label>
                  </div>

                  <p className="text-xs text-gray-500">
                    Supported formats: <strong>.pdf, .txt</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category and Upload Controls */}
          <div className="mt-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-blue-600 text-white text-md font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          {/* Messages */}
          <div className="mt-4">
            {uploadMessage && (
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                ✓ {uploadMessage}
              </p>
            )}
            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                ✕ {uploadError}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 mb-8" />

        {/* Documents table */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Uploaded Documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-xs text-gray-400">No documents uploaded yet</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-600 py-2 pr-4">
                    Filename
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 py-2 pr-4">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 py-2 pr-4">
                    Chunks
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 py-2 pr-4">
                    Uploaded At
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="py-2 pr-4 text-xs text-black">
                      {doc.filename}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {doc.category}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {doc.chunk_count}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="py-2 relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === doc.id ? null : doc.id)
                        }
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>

                      {openMenuId === doc.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded shadow-md w-36"
                        >
                          <button
                            onClick={() => openEditModal(doc)}
                            className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(doc.id)}
                            className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-sm font-semibold text-black mb-4">
              Edit Document
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Filename
              </label>
              <input
                type="text"
                value={editFilename}
                onChange={(e) => setEditFilename(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-600 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {editError && (
              <p className="text-xs text-red-600 mb-4">{editError}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editLoading}
                className="px-4 py-2 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingDocId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-black mb-2">
              Delete Document
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to delete this document? This cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingDocId(null)}
                className="px-4 py-2 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
