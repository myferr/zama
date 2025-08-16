// src/pages/ChatPage.tsx
import { useEffect, useState, useRef } from "preact/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useChatHistory, type Message } from "@/contexts/ChatHistoryContext";
import { OllamaClientClass, GeminiClientClass } from "$/lib/client";
import type { ChatRequest, GeminiContent } from "$/lib/schemas/client.schema";
import { SendHorizonal, Copy, Check, MessageCircle, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RxGithubLogo } from "react-icons/rx";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Thinking from "@/components/Thinking";

// Register languages for syntax highlighting
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import rust from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";

const OllamaClient = new OllamaClientClass();
const GeminiClient = new GeminiClientClass();

SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("markdown", markdown);

// Minimal helper to accept either a plain value or a signal-like object with ".value"
type MaybeSignal<T> = T | { value: T };
function isSignal<T>(v: MaybeSignal<T>): v is { value: T } {
  return typeof v === "object" && v !== null && "value" in v;
}

function unwrap<T>(v: MaybeSignal<T> | null | undefined): T | null {
  if (v == null) return null;
  if (isSignal(v)) {
    return v.value;
  }
  return v;
}

interface ChatPageProps {
  // allow string, null, or a signal-like { value: string | undefined }
  selectedModel: MaybeSignal<string | undefined> | string | null;
  contextLength: number | null;
  temperature: number;
  systemPrompt: string;
  geminiApiKey?: string;
  selectedGeminiModel?: string;
}

export default function ChatPage({
  selectedModel,
  contextLength,
  temperature,
  systemPrompt,
}: ChatPageProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null,
  );
  const [thinkingContent, setThinkingContent] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast, ToastComponent } = useToast();

  const {
    currentConversation,
    currentConversationId,
    createNewConversation,
    addMessageToConversation,
    updateMessageInConversation,
  } = useChatHistory();

  // Always work with a plain string here
  const modelName = unwrap<string | undefined>(selectedModel) ?? null;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentConversation?.messages, thinkingContent]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (!modelName) {
      showToast("Please select a model first.", "error");
      return;
    }

    // Determine service based on selected model
    const isGeminiModel = modelName.startsWith("gemini");

    // Create new conversation if none exists or if model changed
    let conversationId = currentConversationId;
    let conversationToUse = currentConversation;
    if (
      !conversationId ||
      (currentConversation && currentConversation.model !== modelName)
    ) {
      conversationId = createNewConversation(modelName);
      conversationToUse = null; // New conversation, no previous messages
    }

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const userInput = input.trim();
    setInput("");
    setLoading(true);
    setIsThinking(false);
    setThinkingContent("");

    // Calculate the position where the assistant message will be added
    const currentMessageCount = conversationToUse?.messages.length || 0;
    const assistantMessageIndex = currentMessageCount + 1;

    // Add user message to conversation
    addMessageToConversation(conversationId, userMessage);

    // Build message history for API call - include ALL previous messages for context
    const messagesToSend: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];
    if (systemPrompt) {
      messagesToSend.push({ role: "system", content: systemPrompt });
    }

    // Add all messages from current conversation for full context (before adding the new user message)
    if (conversationToUse) {
      for (const msg of conversationToUse.messages) {
        if (msg.role === "user" || msg.role === "assistant") {
          messagesToSend.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add the new user message to the API call
    messagesToSend.push({ role: "user", content: userInput });

    // Create placeholder assistant message
    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToConversation(conversationId, assistantMessage);

    try {
      let assistantResponse = "";

      if (!isGeminiModel) {
        // Ollama logic
        let thinkingBuffer = "";
        let inThinkTag = false;

        for await (const chunk of OllamaClient.chatStream({
          model: modelName,
          messages: messagesToSend,
          options: {
            num_ctx: contextLength || undefined,
            temperature: temperature,
          },
        } as ChatRequest)) {
          let content = chunk.message.content;

          if (inThinkTag) {
            if (content.includes("</think>")) {
              const parts = content.split("</think>");
              thinkingBuffer += parts[0];
              setThinkingContent(thinkingBuffer);
              inThinkTag = false;
              content = parts[1] || "";
            } else {
              thinkingBuffer += content;
              setThinkingContent(thinkingBuffer);
              continue;
            }
          }

          if (content.includes("<think>")) {
            const parts = content.split("<think>");
            assistantResponse += parts[0];
            inThinkTag = true;
            setIsThinking(true);
            thinkingBuffer = parts[1] || "";
            setThinkingContent(thinkingBuffer);
          } else {
            assistantResponse += content;
          }

          // Update the assistant message in the conversation
          updateMessageInConversation(
            conversationId,
            assistantMessageIndex,
            assistantResponse,
          );
        }
      } else {
        // Gemini logic
        const geminiConfigString = localStorage.getItem("geminiConfig");
        if (!geminiConfigString) {
          showToast(
            "Gemini not configured. Please go to Cloud LLMs page.",
            "error",
          );
          setLoading(false);
          return;
        }
        let geminiApiKey = "";
        try {
          const config = JSON.parse(geminiConfigString);
          geminiApiKey = config.apiKey || "";
        } catch (e) {
          console.error("Failed to parse Gemini config from localStorage", e);
          showToast(
            "Invalid Gemini configuration. Please reconfigure.",
            "error",
          );
          setLoading(false);
          return;
        }

        if (!geminiApiKey) {
          showToast("Please enter your Gemini API Key.", "error");
          setLoading(false);
          return;
        }

        const geminiMessages: GeminiContent[] = messagesToSend.map((msg) => ({
          role: msg.role === "user" ? "user" : "model", // Gemini roles are 'user' and 'model'
          parts: [{ text: msg.content }],
        }));

        const geminiResponse = await GeminiClient.chat(
          geminiApiKey,
          modelName, // Use modelName directly
          geminiMessages,
        );
        assistantResponse = geminiResponse;

        updateMessageInConversation(
          conversationId,
          assistantMessageIndex,
          assistantResponse,
        );
      }
    } catch (error) {
      console.error("Error during chat:", error);
      showToast("Failed to send message. Please try again.", "error");

      // Update assistant message with error
      updateMessageInConversation(
        conversationId,
        assistantMessageIndex,
        "Sorry, I encountered an error. Please try again.",
      );
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch {
      showToast("Failed to copy message", "error");
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewConversation = () => {
    if (!modelName) {
      showToast("Please select a model first.", "error");
      return;
    }
    createNewConversation(modelName);
  };

  const messages = currentConversation?.messages || [];

  return (
    <div className="flex flex-col h-full bg-background text-foreground p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {currentConversation?.title || "Chat"}
          </h1>
          {currentConversation && (
            <span className="text-sm text-muted-foreground">
              {currentConversation.model}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            disabled={!modelName}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-thumb-violet-500"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
            <p className="mb-4">
              {modelName
                ? `Chat with ${modelName}. Your conversation will continue with full context.`
                : "Select a model to start chatting"}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <a
                href="https://github.com/myferr/zama"
                target="_blank"
                rel="noopener noreferrer"
              >
                <RxGithubLogo size={26} />
              </a>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 relative group ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-12"
                    : "bg-muted text-muted-foreground mr-12"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-blockquote:text-foreground prose-code:text-foreground prose-pre:text-foreground">
                    {isThinking && index === messages.length - 1 && (
                      <Thinking content={thinkingContent} />
                    )}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold mb-2 mt-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-bold mb-2 mt-3">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-bold mb-1 mt-2">
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-sm font-bold mb-1 mt-2">
                            {children}
                          </h4>
                        ),
                        h5: ({ children }) => (
                          <h5 className="text-sm font-semibold mb-1 mt-2">
                            {children}
                          </h5>
                        ),
                        h6: ({ children }) => (
                          <h6 className="text-xs font-semibold mb-1 mt-2">
                            {children}
                          </h6>
                        ),
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                            {children}
                          </blockquote>
                        ),
                        code: ({ className, children, ...props }) => {
                          // unwrap potential signal-like className
                          const cls =
                            unwrap<string | undefined>(className) ?? "";
                          const match = /language-(\w+)/.exec(cls);

                          return match ? (
                            <SyntaxHighlighter
                              {...props}
                              style={docco}
                              language={match[1]}
                              PreTag="div"
                            >
                              {String(children as string).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code
                              {...props}
                              className={`${cls} bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono`}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto my-2">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {message.content ||
                        (loading && index === messages.length - 1 ? "..." : "")}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={() => handleCopy(message.content, index)}
                >
                  {copiedMessageIndex === index ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            modelName
              ? "Type your message..."
              : "Select a model to start chatting"
          }
          disabled={loading || !modelName}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !input.trim() || !modelName}
        >
          <SendHorizonal className="w-4 h-4" />
        </Button>
      </div>

      {ToastComponent}
    </div>
  );
}
