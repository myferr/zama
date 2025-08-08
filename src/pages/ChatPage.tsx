// pages/ChatPage.tsx
import { useEffect, useState, useRef } from "preact/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OllamaClient } from "$/lib/client";
import type { ChatRequest } from "$/lib/schemas/client.schema";
import { SendHorizonal, Copy, Check, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { JSX } from "preact/jsx-runtime";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPageProps {
  selectedModel: string | null;
  contextLength: number | null;
  temperature: number;
  systemPrompt: string;
}

export default function ChatPage({ selectedModel, contextLength, temperature, systemPrompt }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (!selectedModel) {
      alert("Please select a model first.");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input immediately
    setLoading(true);

    const assistantMessageIndex = messages.length + 1; // Index where the assistant message will start

    // Add a placeholder for the assistant's response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const messagesToSend = [];
    if (systemPrompt) {
      messagesToSend.push({ role: "system", content: systemPrompt });
    }
    messagesToSend.push({ role: "user", content: userMessage.content });

    try {
      for await (const chunk of OllamaClient.chatStream({
        model: selectedModel!, // selectedModel is guaranteed to be non-null here
        messages: messagesToSend,
        options: {
          num_ctx: contextLength || undefined,
          temperature: temperature,
        },
      } as ChatRequest)) {
        // Cast to ChatRequest as chatStream expects it
        setMessages((prev) => {
          const newMessages = [...prev];
          // Append content to the last assistant message
          newMessages[assistantMessageIndex].content += chunk.message.content;
          return newMessages;
        });
      }
    } catch (err) {
      console.error("Chat stream error:", err);
      // Optionally, add an error message to the chat
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not get a response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
  }, [messages]);

  return (
    <div class="flex flex-col h-full bg-background text-foreground p-4">
      <div
        ref={containerRef}
        class="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-thumb-violet-500"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            class={`rounded-lg p-3 max-w-xl ${
              msg.role === "user"
                ? "bg-violet-700 text-white self-end ml-auto"
                : "bg-card text-foreground self-start mr-auto"
            }`}
          >
            <div>
              {msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "assistant" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(msg.content);
                  setCopiedMessageIndex(i);
                  setTimeout(() => setCopiedMessageIndex(null), 2000); // Reset after 2 seconds
                }}
                className="mt-2"
              >
                {copiedMessageIndex === i ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        ))}
        {loading && (
          <div class="text-muted-foreground italic animate-pulse">
            Generating...
          </div>
        )}
      </div>

      <div class="flex items-center gap-2">
        <Input
          class="flex-1 bg-input text-foreground border-border"
          value={input}
          onInput={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
            setInput(e.currentTarget.value)
          }
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask something..."
        />
        <Button onClick={handleSubmit} disabled={loading}>
          <SendHorizonal class="w-4 h-4 mr-1" />
          Send
        </Button>
        <Button
          variant="outline"
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
        >
          <Trash2 class="w-4 h-4 mr-1" />
          Clear Chat
        </Button>
      </div>
    </div>
  );
}
