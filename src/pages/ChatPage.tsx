// pages/ChatPage.tsx
import { useEffect, useState, useRef } from "preact/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OllamaClient } from "$/lib/client";
import type { ChatRequest } from "$/lib/schemas/client.schema";
import { SendHorizonal } from "lucide-react";
import { JSX } from "preact/jsx-runtime";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPageProps {
  selectedModel: string | null;
}

export default function ChatPage({ selectedModel }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

    try {
      for await (const chunk of OllamaClient.chatStream({
        model: selectedModel!, // selectedModel is guaranteed to be non-null here
        messages: [{ role: "user", content: userMessage.content }],
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
    <div class="flex flex-col h-full dark bg-slate-900 text-slate-100 p-4">
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
                : "bg-slate-800 text-slate-100 self-start mr-auto"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div class="text-slate-400 italic animate-pulse">Generating...</div>
        )}
      </div>

      <div class="flex items-center gap-2">
        <Input
          class="flex-1 bg-slate-800 text-white border-slate-700"
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
      </div>
    </div>
  );
}
