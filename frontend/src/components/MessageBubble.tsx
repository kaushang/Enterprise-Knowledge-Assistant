import ReactMarkdown from "react-markdown";

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
  )
}