import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

export default function MessageBubble({
  message,
  userName,
}: {
  message: Message
  userName?: string
}) {
  const isUser = message.role === "user"
  const displayName = userName || "You"
  const senderLabel = isUser ? displayName : "Assistant"
  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  const avatarText = isUser ? userInitials : "A"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="mr-3 mt-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs font-semibold text-white">
          {avatarText}
        </div>
      )}
      <div className={`flex max-w-[70%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <span
          className={`mb-1 text-xs font-semibold ${
            isUser ? "text-blue-700" : "text-gray-500"
          }`}
        >
          {senderLabel}
        </span>
        <div className={`w-full ${isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-black"} rounded-lg px-4 py-3 text-sm`}>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="whitespace-pre-wrap" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
              em: ({node, ...props}) => <em className="italic" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside" {...props} />,
              li: ({node, ...props}) => <li className="ml-2" {...props} />,
              h1: ({node, ...props}) => <h1 className="font-bold text-lg" {...props} />,
              h2: ({node, ...props}) => <h2 className="font-bold text-base" {...props} />,
              h3: ({node, ...props}) => <h3 className="font-bold" {...props} />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-500">
              Sources: {message.sources.join(", ")}
            </p>
          </div>
        )}
        </div>
      </div>
      {isUser && (
        <div className="ml-3 mt-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">
          {avatarText}
        </div>
      )}
    </div>
  )
}
