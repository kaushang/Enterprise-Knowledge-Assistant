interface Message {
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[70%] ${isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-black"} rounded-lg px-4 py-3 text-sm`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-500">
              Sources: {message.sources.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}