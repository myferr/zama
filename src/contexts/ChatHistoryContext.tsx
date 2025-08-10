import { createContext } from "preact";
import { useContext, useState, useEffect } from "preact/hooks";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatHistoryContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentConversation: Conversation | null;
  createNewConversation: (model: string) => string;
  switchToConversation: (conversationId: string) => void;
  addMessageToConversation: (conversationId: string, message: Message) => void;
  updateMessageInConversation: (
    conversationId: string,
    messageIndex: number,
    content: string,
  ) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearAllConversations: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "zama_chat_history";

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTitleFromMessage(content: string): string {
  // Create a title from the first user message, truncated to ~40 chars
  const cleaned = content.trim().replace(/\s+/g, " ");
  return cleaned.length > 40 ? cleaned.substring(0, 40) + "..." : cleaned;
}

export function ChatHistoryProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        setConversations(parsed);

        // Set the most recent conversation as current
        if (parsed.length > 0) {
          const mostRecent = parsed.reduce((prev, curr) =>
            curr.updatedAt > prev.updatedAt ? curr : prev,
          );
          setCurrentConversationId(mostRecent.id);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [conversations]);

  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || null;

  const createNewConversation = (model: string) => {
    const newConversation: Conversation = {
      id: generateConversationId(),
      title: "New Conversation",
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  };

  const switchToConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const addMessageToConversation = (
    conversationId: string,
    message: Message,
  ) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          const updatedConv = {
            ...conv,
            messages: [...conv.messages, message],
            updatedAt: Date.now(),
          };

          // Auto-generate title from first user message
          if (conv.title === "New Conversation" && message.role === "user") {
            updatedConv.title = generateTitleFromMessage(message.content);
          }

          return updatedConv;
        }
        return conv;
      }),
    );
  };

  const updateMessageInConversation = (
    conversationId: string,
    messageIndex: number,
    content: string,
  ) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          const updatedMessages = [...conv.messages];
          if (updatedMessages[messageIndex]) {
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              content,
            };
          }
          return {
            ...conv,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
        }
        return conv;
      }),
    );
  };

  const updateConversationTitle = (conversationId: string, title: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, title, updatedAt: Date.now() }
          : conv,
      ),
    );
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conversationId);

      // If we deleted the current conversation, switch to the most recent remaining one
      if (currentConversationId === conversationId) {
        if (filtered.length > 0) {
          const mostRecent = filtered.reduce((prev, curr) =>
            curr.updatedAt > prev.updatedAt ? curr : prev,
          );
          setCurrentConversationId(mostRecent.id);
        } else {
          setCurrentConversationId(null);
        }
      }

      return filtered;
    });
  };

  const clearAllConversations = () => {
    setConversations([]);
    setCurrentConversationId(null);
  };

  return (
    <ChatHistoryContext.Provider
      value={{
        conversations,
        currentConversationId,
        currentConversation,
        createNewConversation,
        switchToConversation,
        addMessageToConversation,
        updateMessageInConversation,
        updateConversationTitle,
        deleteConversation,
        clearAllConversations,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
}
