import { useState, useEffect } from "preact/hooks";
import { Button } from "@/components/ui/button";
import ChatPage from "@/pages/ChatPage";
import ModelsPage from "@/pages/ModelsPage";
import { ComponentChildren } from "preact";
import { OllamaClient } from "../lib/client";
import type { ListModelsResponse, OllamaModel } from "@/lib/schemas/client.schema";

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

        // Mock model info - replace with actual API call when available
        setModelInfo({
          status: "loaded",
          vram: 4.2e9,
          vram_total: 8e9,
          load: 0.65,
          temp: 72,
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
    <div className="flex h-screen text-white bg-slate-900">
      {/* Left Sidebar */}
      <aside className="w-56 bg-slate-800 p-4 border-r border-slate-700">
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
        <header className="h-14 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">🧠 {loadedModel?.name}</h1>
          <div className="flex items-center gap-2">
            <label htmlFor="model-select" className="text-sm">Select Model:</label>
            <select
              id="model-select"
              className="bg-slate-700 text-white rounded-md p-1"
              value={selectedModel || ''}
              onChange={(e) => {
                setSelectedModel(e.currentTarget.value);
                setLoadedModel({ name: e.currentTarget.value });
              }}
            >
              {availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Page Content */}
          <section className="flex-1 overflow-auto p-4">
            {page === "chat" ? <ChatPage selectedModel={selectedModel} /> : currentPageComponent}
          </section>

          {/* Right Sidebar */}
          <aside className="w-72 bg-slate-800 p-4 border-l border-slate-700">
            <h2 className="text-lg font-semibold mb-2">Model Info</h2>
            {modelInfo && (
              <ul className="space-y-1 text-sm text-slate-300">
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
