import { useState, useEffect } from "preact/hooks";
import type * as preact from "preact";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChatPage from "@/pages/ChatPage";
import ModelsPage from "@/pages/ModelsPage";
import HistoryPage from "@/pages/HistoryPage";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";

import { OllamaClientClass } from "$/lib/client";
import type { OllamaModel } from "$/lib/schemas/client.schema";

const OllamaClient = new OllamaClientClass();
import LibraryPage from "@/pages/LibraryPage";
import CloudLLMsPage from "@/pages/CloudLLMsPage";

import { VscLibrary } from "react-icons/vsc";
import { SiRobotframework } from "react-icons/si";
import { MdChatBubbleOutline } from "react-icons/md";
import { History, Sun, Moon, Cloud } from "lucide-react";

interface PageConfig {
  id: string;
  name: string;
  icon: preact.ComponentChildren;
  component: (
    props: preact.ComponentProps<typeof ChatPage>,
  ) => preact.ComponentChildren;
}

const pageConfigs: PageConfig[] = [
  {
    id: "chat",
    name: "Chat",
    icon: <MdChatBubbleOutline />,
    component: (props) => <ChatPage {...props} />,
  },
  {
    id: "models",
    name: "Your Models",
    icon: <SiRobotframework />,
    component: () => <ModelsPage />,
  },
  {
    id: "library",
    name: "Library",
    icon: <VscLibrary />,
    component: () => <LibraryPage />,
  },
  {
    id: "history",
    name: "History",
    icon: <History />,
    component: () => <HistoryPage />,
  },
  {
    id: "cloud-llms",
    name: "Cloud LLMs",
    icon: <Cloud />,
    component: () => <CloudLLMsPage />,
  },
];

export default function App() {
  const [page, setPage] = useState<string>(pageConfigs[0].id);
  const [theme, setTheme] = useState("dark");

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Listen for navigation events from history page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "chat") {
        setPage("chat");
        window.location.hash = ""; // Clear hash
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const [loadedModel, setLoadedModel] = useState<{ name: string } | null>(null);
  const [contextLength, setContextLength] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<number>(0.8); // Default temperature
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      let allModels: OllamaModel[] = [];
      let defaultSelectedModel: string | null = null;

      // Load Ollama models
      try {
        const modelsResponse = await OllamaClient.listModels();
        allModels = allModels.concat(modelsResponse.models);
      } catch (error) {
        console.error("Failed to load Ollama models:", error);
      }

      // Load Gemini models if configured
      const geminiConfigString = localStorage.getItem("geminiConfig");
      if (geminiConfigString) {
        try {
          const geminiConfig = JSON.parse(geminiConfigString);
          if (geminiConfig.apiKey && geminiConfig.defaultModel) {
            // Add hardcoded Gemini models
            const geminiModels = [
              { name: "gemini-pro", modified_at: "", size: 0, digest: "" },
              {
                name: "gemini-pro-vision",
                modified_at: "",
                size: 0,
                digest: "",
              },
              {
                name: "gemini-1.5-flash",
                modified_at: "",
                size: 0,
                digest: "",
              },
              { name: "gemini-1.5-pro", modified_at: "", size: 0, digest: "" },
              {
                name: "gemini-2.0-flash",
                modified_at: "",
                size: 0,
                digest: "",
              },
              {
                name: "gemini-2.5-flash",
                modified_at: "",
                size: 0,
                digest: "",
              },
              { name: "gemini-2.5-pro", modified_at: "", size: 0, digest: "" },
            ];
            allModels = allModels.concat(geminiModels);
            defaultSelectedModel = geminiConfig.defaultModel;
          }
        } catch (error) {
          console.error(
            "Failed to parse Gemini config from localStorage:",
            error,
          );
          localStorage.removeItem("geminiConfig"); // Clear invalid config
        }
      }

      setAvailableModels(allModels);

      if (defaultSelectedModel) {
        setSelectedModel(defaultSelectedModel);
        setLoadedModel({ name: defaultSelectedModel });
      } else if (allModels.length > 0) {
        setSelectedModel(allModels[0].name);
        setLoadedModel({ name: allModels[0].name });
      }

      // Fetch Ollama config if an Ollama model is selected initially
      if (selectedModel && !selectedModel.startsWith("gemini")) {
        try {
          const configResponse = await OllamaClient.getConfig();
          setContextLength(configResponse.num_ctx);
        } catch (configError) {
          console.warn(
            "Failed to get Ollama config, using default context length:",
            configError,
          );
          setContextLength(2048); // Set a reasonable default if config fails
        }
      }
    };

    loadInitialData();
  }, [page]);

  const currentPageComponent = pageConfigs.find(
    (p) => p.id === page,
  )?.component;

  const geminiConfigString = localStorage.getItem("geminiConfig");
  let geminiApiKey: string = "";
  let selectedGeminiModel: string = "";

  if (geminiConfigString) {
    try {
      const config = JSON.parse(geminiConfigString);
      geminiApiKey = config.apiKey || "";
      selectedGeminiModel = config.defaultModel || "";
    } catch (e) {
      console.error("Failed to parse Gemini config for ChatPage props", e);
    }
  }

  return (
    <ChatHistoryProvider>
      <div className={`flex h-screen bg-background`}>
        {/* Left Sidebar */}
        <aside className="w-56 bg-card p-4 border-r border-border">
          <h2 className="text-lg font-semibold mb-4">zama</h2>
          {pageConfigs.map((p) => (
            <Button
              key={p.id}
              variant={page === p.id ? "secondary" : "ghost"}
              className="w-full mb-2 text-left justify-start"
              onClick={() => setPage(p.id)}
            >
              {p.icon} {p.name}
            </Button>
          ))}
          <Button onClick={toggleTheme} variant="ghost" className="w-full mt-4">
            {theme === "dark" ? (
              <Sun className="mr-2" />
            ) : (
              <Moon className="mr-2" />
            )}{" "}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="h-10 bg-card border-b border-border px-4 flex items-center justify-between">
            <div className="flex justify-center items-center flex-1">
              <span className="text-sm font-mono font-semibold">
                {loadedModel?.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="model-select" className="text-sm">
                Select Model:
              </label>
              <Select
                value={selectedModel || ""}
                onValueChange={(value: string) => {
                  setSelectedModel(value);
                  setLoadedModel({ name: value });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model: OllamaModel) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Page Content */}
            <section
              className={`flex-1 overflow-auto ${page === "history" ? "p-0" : "p-4"}`}
            >
              {currentPageComponent?.({
                selectedModel,
                contextLength,
                temperature,
                systemPrompt,
                geminiApiKey,
                selectedGeminiModel,
              })}
            </section>

            {/* Right Sidebar - only show for chat page */}
            {page === "chat" && (
              <aside className="w-72 bg-card p-4 border-l border-border">
                <h2 className="text-lg font-semibold mb-2">
                  Model Configuration
                </h2>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <label htmlFor="system-prompt" className="block mb-1">
                      System Prompt:
                    </label>
                    <Textarea
                      id="system-prompt"
                      value={systemPrompt}
                      onInput={(e) =>
                        setSystemPrompt((e.target as HTMLTextAreaElement).value)
                      }
                      placeholder="Enter system prompt here..."
                    />
                  </div>
                  <div>
                    <label htmlFor="context-length" className="block mb-1">
                      Context Length: {contextLength}
                    </label>
                    <Slider
                      id="context-length"
                      min={512}
                      max={8192}
                      step={1}
                      value={[contextLength || 0]}
                      onValueChange={(value) => setContextLength(value[0])}
                    />
                  </div>
                  <div>
                    <label htmlFor="temperature" className="block mb-1">
                      Temperature: {temperature}
                    </label>
                    <Slider
                      id="temperature"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[temperature]}
                      onValueChange={(value) => setTemperature(value[0])}
                    />
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </ChatHistoryProvider>
  );
}
