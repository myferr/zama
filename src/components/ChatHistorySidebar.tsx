import { useState } from "preact/hooks";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Trash2, Edit3, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatHistorySidebarProps {
  selectedModel: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistorySidebar({
  selectedModel,
  isOpen,
  onClose,
}: ChatHistorySidebarProps) {
  const {
    conversations,
    currentConversationId,
    createNewConversation,
    switchToConversation,
    deleteConversation,
    updateConversationTitle,
    clearAllConversations,
  } = useChatHistory();

  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editTitle, setEditTitle] = useState("");

  const handleNewConversation = () => {
    if (!selectedModel) {
      alert("Please select a model first");
      return;
    }
    createNewConversation(selectedModel);
    onClose();
  };

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
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="relative bg-background border-r border-border w-80 h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat History</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            <Button
              onClick={handleNewConversation}
              className="w-full flex items-center gap-2"
              disabled={!selectedModel}
            >
              <Plus size={16} />
              New Conversation
            </Button>
            {conversations.length > 0 && (
              <Button
                onClick={clearAllConversations}
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 size={14} className="mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">
                Start a new conversation to see it here
              </p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors group border ${
                    currentConversationId === conversation.id
                      ? "bg-primary/10 border-primary/20"
                      : "bg-card hover:bg-muted/50 border-transparent"
                  }`}
                  onClick={() => {
                    switchToConversation(conversation.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingConversationId === conversation.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editTitle}
                            onChange={(e) =>
                              setEditTitle(e.currentTarget.value)
                            }
                            className="text-sm h-6 px-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTitle();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveTitle();
                            }}
                          >
                            <Check size={12} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="font-medium text-sm truncate">
                          {conversation.title}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {conversation.model}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {conversation.messages.length} messages
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(conversation.updatedAt)}
                        </span>
                      </div>
                      {conversation.messages.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {
                            conversation.messages[
                              conversation.messages.length - 1
                            ]?.content
                          }
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(conversation.id, conversation.title);
                        }}
                      >
                        <Edit3 size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
