import { useState, useEffect } from "preact/hooks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChatPage from "@/pages/ChatPage";
import ModelsPage from "@/pages/ModelsPage";
import { ComponentChildren } from "preact";
import { OllamaClient } from "../lib/client";
import type { OllamaModel } from "$/lib/schemas/client.schema";
import LibraryPage from "@/pages/LibraryPage";

interface PageConfig {
  id: string;
  name: string;
  icon: string;
  component: ComponentChildren;
}

const pageConfigs: PageConfig[] = [
  {
    id: "chat",
    name: "Chat",
    icon: "🗨️",
    component: <ChatPage />,
  },
  {
    id: "models",
    name: "Your Models",
    icon: "⚙️",
    component: <ModelsPage />,
  },
  {
    id: "library",
    name: "Library",
    icon: "📕",
    component: <LibraryPage />,
  },
];

export default function App() {
  const [page, setPage] = useState<string>(pageConfigs[0].id);
  const [loadedModel, setLoadedModel] = useState<{ name: string } | null>(null);
  const [modelInfo, setModelInfo] = useState<{
    status: string;
    vram: number;
    vram_total: number;
    load: number;
    temp: number;
  } | null>(null);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch available models
        const modelsResponse = await OllamaClient.listModels();
        setAvailableModels(modelsResponse.models);
        if (modelsResponse.models.length > 0) {
          setSelectedModel(modelsResponse.models[0].name); // Select the first model by default
          setLoadedModel({ name: modelsResponse.models[0].name });
        }

        // Fetch model info
        const infoResponse = await OllamaClient.getConfig();
        setModelInfo({
          status: "loaded", // ConfigResponse doesn't have status, so we'll default this
          vram: 0, // ConfigResponse doesn't have vram info, so we'll default these
          vram_total: 0,
          load: 0,
          temp: 0,
        });
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };

    loadInitialData();
  }, []);

  const currentPageComponent = pageConfigs.find(
    (p) => p.id === page,
  )?.component;

  return (
    <div className="flex h-screen text-white bg-background">
      {/* Left Sidebar */}
      <aside className="w-56 bg-card p-4 border-r border-border">
        <h2 className="text-lg font-semibold mb-4">Navigation</h2>
        {pageConfigs.map((p) => (
          <Button
            key={p.id}
            variant={page === p.id ? "secondary" : "ghost"}
            className="w-full mb-2"
            onClick={() => setPage(p.id)}
          >
            {p.icon} {p.name}
          </Button>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between">
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
                {availableModels.map((model) => (
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
          <section className="flex-1 overflow-auto p-4">
            {page === "chat" ? (
              <ChatPage selectedModel={selectedModel} />
            ) : (
              currentPageComponent
            )}
          </section>

          {/* Right Sidebar */}
          <aside className="w-72 bg-card p-4 border-l border-border">
            <h2 className="text-lg font-semibold mb-2">Model Info</h2>
            {modelInfo && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>Status:</strong> {modelInfo.status}
                </li>
                <li>
                  <strong>VRAM:</strong> {(modelInfo.vram / 1e9).toFixed(2)} /{" "}
                  {(modelInfo.vram_total / 1e9).toFixed(2)} GB
                </li>
                <li>
                  <strong>Load:</strong> {(modelInfo.load * 100).toFixed(0)}%
                </li>
                <li>
                  <strong>Temp:</strong> {modelInfo.temp}°C
                </li>
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
