/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";
import { OllamaDBModel } from "$/lib/schemas/ollamadb.schema";
import { HfModel } from "$/lib/schemas/hf.schema";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SiOllama } from "react-icons/si";
import { BiBadgeCheck } from "react-icons/bi";
import { RxDownload } from "react-icons/rx";
import { Check } from "lucide-react";
import { OllamaClient } from "$/lib/client";
import { HfClient } from "$/lib/hf-client";
import { SiHuggingface } from "react-icons/si";

type UnifiedModel = {
  id: string;
  name: string;
  description?: string;
  pulls?: number;
  tags?: string[] | any;
  labels?: string[];
  url: string;
  provider: "ollama" | "huggingface";
  isOfficial?: boolean;
  author?: string;
  lastModified?: string;
};

export default function LibraryPage() {
  const [models, setModels] = useState<UnifiedModel[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [installedModels, setInstalledModels] = useState<Set<string>>(
    new Set(),
  );
  const [provider, setProvider] = useState<"ollama" | "huggingface">("ollama");

  const getBaseModelName = (modelName: string) => {
    const parts = modelName.split(":");
    return parts[0];
  };

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        setError(null);
        let fetchedModels: UnifiedModel[] = [];

        if (provider === "ollama") {
          const res = await invoke<string>("get_ollama_models");
          const json = JSON.parse(res);
          fetchedModels = json.models.map((model: OllamaDBModel) => ({
            id: model.model_identifier,
            name: model.model_name,
            description: model.description,
            pulls: model.pulls,
            tags: model.tags,
            labels: model.labels,
            url: model.url,
            provider: "ollama",
            isOfficial: model.model_type === "official",
          }));
        } else {
          const hfModels = await HfClient.listModels(query || "GGUF");
          fetchedModels = hfModels.map((model: HfModel) => ({
            id: model.modelId,
            name: model.modelId,
            description: `Downloads: ${model.downloads}, Likes: ${model.likes}`,
            tags: model.tags,
            url: `https://huggingface.co/${model.modelId}`,
            provider: "huggingface",
            author: model.author,
            lastModified: model.lastModified,
          }));
        }

        setModels(fetchedModels);

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

    const debounce = setTimeout(() => {
      fetchModels();
    }, 300); // 300ms debounce

    return () => clearTimeout(debounce);
  }, [provider, query]);

  const handlePullModel = async (model: UnifiedModel) => {
    const modelName =
      provider === "huggingface" ? `hf.co/${model.name}` : model.name;
    setPullingModel(model.name);
    const toastId = toast.loading(`Installing ${model.name}...`);
    try {
      await OllamaClient.pullModel({ name: modelName });
      toast.success(`${model.name} installed successfully!`, { id: toastId });
      const installed = await OllamaClient.listModels();
      setInstalledModels(
        new Set(installed.models.map((m) => getBaseModelName(m.name))),
      );
    } catch (err) {
      toast.error(`Failed to install ${model.name}.`, {
        id: toastId,
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPullingModel(null);
    }
  };

  const filtered = models.filter((model: UnifiedModel) => {
    const q = query.toLowerCase();
    if (provider === "ollama") {
      return (
        model.name.toLowerCase().includes(q) ||
        model.id.toLowerCase().includes(q) ||
        model.labels?.some((label: string) => label.toLowerCase().includes(q))
      );
    }
    // For huggingface, the API does the filtering, so we just display what we get
    // Or we can do client side filtering if we want
    return true;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Search Models</h1>
        <Select
          onValueChange={(value) => setProvider(value as any)}
          value={provider}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ollama">Ollama</SelectItem>
            <SelectItem value="huggingface">Hugging Face</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          {filtered
            .sort((a, b) => {
              if (a.provider === "ollama" && b.provider === "ollama") {
                return (b.pulls || 0) - (a.pulls || 0);
              } else if (
                a.provider === "huggingface" &&
                b.provider === "huggingface"
              ) {
                const aDownloads = (a as any).downloads || 0;
                const bDownloads = (b as any).downloads || 0;
                if (bDownloads !== aDownloads) {
                  return bDownloads - aDownloads;
                }
                const aLikes = (a as any).likes || 0;
                const bLikes = (b as any).likes || 0;
                return bLikes - aLikes;
              }
              return 0;
            })
            .map((model) => (
              <li key={model.id} className="border p-4 rounded shadow-sm">
                <div className="justify-between flex">
                  <div className="flex gap-2.5 items-center">
                    <h2
                      className={`font-semibold ${model.name.length > 30 ? "text-sm" : model.name.length > 20 ? "text-base" : "text-lg"}`}
                    >
                      {model.name}
                    </h2>
                    <a href={model.url} target="_blank">
                      {model.provider === "ollama" ? (
                        <SiOllama />
                      ) : (
                        <SiHuggingface />
                      )}
                    </a>
                    {model.isOfficial && <BiBadgeCheck />}
                    <button
                      className={`${
                        pullingModel === model.name ||
                        installedModels.has(getBaseModelName(model.name))
                          ? "disabled"
                          : "hover:cursor-pointer"
                      } hover:bg-accent rounded p-1.5}`}
                      onClick={() => handlePullModel(model)}
                      disabled={
                        pullingModel === model.name ||
                        installedModels.has(getBaseModelName(model.name))
                      }
                    >
                      {installedModels.has(getBaseModelName(model.name)) ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <RxDownload />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {model.description}
                </p>
                {model.provider === "ollama" && model.pulls !== undefined && (
                  <p className="text-xs text-gray-500">
                    Pulls: {model.pulls} | Tags: {model.tags}
                  </p>
                )}
                {model.provider === "huggingface" && (
                  <p className="text-xs text-gray-500">
                    Modified: {model.lastModified}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {model.provider === "huggingface" &&
                    Array.isArray(model.tags) &&
                    model.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="bg-gray-900 text-gray-500 text-xs px-2 py-1 rounded-full"
                      >
                        {tag}
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
      <Toaster />
    </div>
  );
}
