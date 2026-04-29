import { useState, useEffect, ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const API_URL = import.meta.env.VITE_API_URL

interface Document {
  filename: string
  chunk_count: number
  uploaded_at: string
}

export default function AdminPage() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const res = await fetch(`${API_URL}/admin/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setDocuments(data)
    } catch (err) {
      console.error("Failed to fetch documents", err)
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadMessage("")
    setUploadError("")
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setUploadMessage("")
    setUploadError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_URL}/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.detail || "Upload failed")
        return
      }

      setUploadMessage(`Successfully uploaded "${data.filename}" - ${data.chunks_created} chunks created`)
      setFile(null)
      const input = document.getElementById("file-input") as HTMLInputElement
      if (input) input.value = ""
      fetchDocuments()
    } catch (err) {
      setUploadError("Could not connect to server")
    } finally {
      setUploading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate("/login")
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6">
        <span className="text-sm font-semibold text-black">Enterprise Knowledge Assistant - Admin</span>
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

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Upload section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-black mb-4">Upload Document</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-500">
                Supported formats: PDF, TXT
              </label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
              {file && (
                <p className="text-xs text-gray-500">Selected: {file.name}</p>
              )}
              <div>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              {uploadMessage && (
                <p className="text-xs text-green-600">{uploadMessage}</p>
              )}
              {uploadError && (
                <p className="text-xs text-red-600">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-8" />

        {/* Documents table */}
        <div>
          <h2 className="text-sm font-semibold text-black mb-4">Uploaded Documents</h2>
          {documents.length === 0 ? (
            <p className="text-xs text-gray-400">No documents uploaded yet</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-600 py-2 pr-4">Filename</th>
                  <th className="text-left text-xs font-semibold text-gray-600 py-2 pr-4">Chunks</th>
                  <th className="text-left text-xs font-semibold text-gray-600 py-2">Uploaded At</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="py-2 pr-4 text-xs text-black">{doc.filename}</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">{doc.chunk_count}</td>
                    <td className="py-2 text-xs text-gray-600">{formatDate(doc.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}