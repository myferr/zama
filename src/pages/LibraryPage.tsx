/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";
import { OllamaDBModel } from "$/lib/schemas/ollamadb.schema";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@/components/ui/input";

import { SiOllama } from "react-icons/si";
import { BiBadgeCheck } from "react-icons/bi";
import { RxDownload } from "react-icons/rx";
import { Check } from "lucide-react";
import { OllamaClient } from "$/lib/client";

export default function LibraryPage() {
  const [models, setModels] = useState<OllamaDBModel[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [installedModels, setInstalledModels] = useState<Set<string>>(
    new Set(),
  );

  const getBaseModelName = (modelName: string) => {
    const parts = modelName.split(":");
    return parts[0];
  };

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        const res = await invoke<string>("get_ollama_models");
        const json = JSON.parse(res);
        setModels(json.models);

        const installed = await OllamaClient.listModels();
        setInstalledModels(
          new Set(installed.models.map((m) => getBaseModelName(m.name))),
        );
      } catch (err) {
        setError(
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : "Failed to fetch models",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, []);

  const filtered = models.filter((model: OllamaDBModel) => {
    const q = query.toLowerCase();
    return (
      model.model_name.toLowerCase().includes(q) ||
      model.model_identifier.toLowerCase().includes(q) ||
      model.namespace?.toLowerCase().includes(q) ||
      model.labels.some((label: string) => label.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Search Ollama Models</h1>

      <Input
        type="text"
        className="w-full p-2 border rounded mb-4"
        placeholder="Search by model name, label, namespace..."
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />

      {loading && <p>Loading models...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((model) => (
            <li
              key={model.model_identifier}
              className="border p-4 rounded shadow-sm"
            >
              <div className="justify-between flex">
                <div className="flex gap-2.5 items-center">
                  <h2 className="text-lg font-semibold">
                    {model.model_name}{" "}
                    {pullingModel === model.model_name && "Installing..."}
                  </h2>
                  <a href={model.url} target="_blank">
                    <SiOllama />
                  </a>
                  {model.model_type === "official" ? <BiBadgeCheck /> : null}
                </div>
                <div>
                  <button
                    className={`${
                      pullingModel === model.model_name ||
                      installedModels.has(getBaseModelName(model.model_name))
                        ? "disabled"
                        : "hover:cursor-pointer"
                    } hover:bg-accent rounded p-1.5}`}
                    onClick={async () => {
                      setPullingModel(model.model_name);
                      await OllamaClient.pullModel({ name: model.model_name });
                      setPullingModel(null);
                      // Refresh installed models after successful pull
                      const installed = await OllamaClient.listModels();
                      setInstalledModels(
                        new Set(installed.models.map((m) => m.name)),
                      );
                    }}
                    disabled={
                      pullingModel === model.model_name ||
                      installedModels.has(getBaseModelName(model.model_name))
                    }
                  >
                    {installedModels.has(getBaseModelName(model.model_name)) ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <RxDownload />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{model.description}</p>
              <p className="text-xs text-gray-500">
                Tags: {model.tags}, Pulls: {model.pulls}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {model.labels.map((label) => (
                  <span
                    key={label}
                    className="bg-gray-200 text-xs px-2 py-1 rounded-full"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-muted-foreground">No models matched your search.</p>
      )}
    </div>
  );
}
