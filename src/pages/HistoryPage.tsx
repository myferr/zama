import { useState } from "preact/hooks";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  MessageCircle,
  Trash2,
  Edit3,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function HistoryPage() {
  const {
    conversations,
    switchToConversation,
    deleteConversation,
    updateConversationTitle,
    clearAllConversations,
  } = useChatHistory();

  const { showToast, ToastComponent } = useToast();
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editTitle, setEditTitle] = useState("");
  const [expandedConversation, setExpandedConversation] = useState<
    string | null
  >(null);

  const handleEditTitle = (conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId);
    setEditTitle(currentTitle);
  };

  const handleSaveTitle = () => {
    if (editingConversationId && editTitle.trim()) {
      updateConversationTitle(editingConversationId, editTitle.trim());
    }
    setEditingConversationId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditTitle("");
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpanded = (conversationId: string) => {
    setExpandedConversation(
      expandedConversation === conversationId ? null : conversationId,
    );
  };

  const handleContinueConversation = (conversationId: string) => {
    switchToConversation(conversationId);
    // Switch to chat tab (we'll need to add this functionality)
    window.location.hash = "#chat"; // Simple way to navigate for now
  };

  return (
    <div className="p-6 bg-background text-foreground h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Chat History</h1>
            <p className="text-muted-foreground mt-1">
              {conversations.length} conversation
              {conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
          {conversations.length > 0 && (
            <Button
              onClick={() => {
                clearAllConversations();
                showToast("All conversations deleted", "success");
              }}
              variant="destructive"
              size="sm"
            >
              <Trash2 size={16} className="mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
            <p className="text-muted-foreground">
              Start chatting to see your conversation history here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Conversation Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    {editingConversationId === conversation.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.currentTarget.value)}
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTitle();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveTitle}
                          className="h-8 w-8 p-0"
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          {conversation.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{conversation.model}</span>
                          <span>•</span>
                          <span>{conversation.messages.length} messages</span>
                          <span>•</span>
                          <span>{formatDate(conversation.updatedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        handleContinueConversation(conversation.id)
                      }
                    >
                      <MessageSquare size={14} className="mr-1" />
                      Continue
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleEditTitle(conversation.id, conversation.title)
                      }
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(conversation.id)}
                    >
                      {expandedConversation === conversation.id
                        ? "Collapse"
                        : "View"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        deleteConversation(conversation.id);
                        showToast("Conversation deleted", "success");
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Preview or Full Messages */}
                {expandedConversation === conversation.id ? (
                  <div className="space-y-4 mt-4 border-t pt-4">
                    {conversation.messages.map((message, index) => (
                      <div
                        key={`${message.timestamp}-${index}`}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-blockquote:text-foreground prose-code:text-foreground prose-pre:text-foreground">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-bold mb-2 mt-3">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-bold mb-1 mt-2">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-bold mb-1 mt-2">
                                      {children}
                                    </h3>
                                  ),
                                  h4: ({ children }) => (
                                    <h4 className="text-sm font-semibold mb-1 mt-1">
                                      {children}
                                    </h4>
                                  ),
                                  h5: ({ children }) => (
                                    <h5 className="text-xs font-semibold mb-1 mt-1">
                                      {children}
                                    </h5>
                                  ),
                                  h6: ({ children }) => (
                                    <h6 className="text-xs font-semibold mb-1 mt-1">
                                      {children}
                                    </h6>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-1">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc list-inside mb-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal list-inside mb-1">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => <li>{children}</li>,
                                  strong: ({ children }) => (
                                    <strong className="font-bold">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic">{children}</em>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-gray-300 pl-2 italic my-1">
                                      {children}
                                    </blockquote>
                                  ),
                                  code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">
                                        {children}
                                      </code>
                                    ) : (
                                      <code className={className}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  pre: ({ children }) => (
                                    <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto my-1">
                                      {children}
                                    </pre>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  conversation.messages.length > 0 && (
                    <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                      <p className="truncate">
                        <span className="font-medium">
                          {conversation.messages[
                            conversation.messages.length - 1
                          ]?.role === "user"
                            ? "You"
                            : "Assistant"}
                          :
                        </span>{" "}
                        {
                          conversation.messages[
                            conversation.messages.length - 1
                          ]?.content
                        }
                      </p>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {ToastComponent}
    </div>
  );
}
