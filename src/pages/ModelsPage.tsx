// pages/ModelsPage.tsx
import { useEffect, useState } from "preact/hooks";
import { OllamaClient } from "$/lib/client";
import type { ListModelsResponse } from "$/lib/schemas/client.schema";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCcw } from "lucide-react";

export default function ModelsPage() {
  const [models, setModels] = useState<ListModelsResponse["models"]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await OllamaClient.listModels();
      setModels(res.models || []);
    } catch (err) {
      console.error("Failed to load models", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await OllamaClient.deleteModel({ name });
      setModels((prev) => prev.filter((m) => m.name !== name));
    } catch (err) {
      alert(`Failed to delete ${name}`);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div class="p-4 dark bg-slate-900 text-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Your Models</h2>
        <Button variant="outline" onClick={fetchModels}>
          <RefreshCcw class="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {models.length === 0 ? (
        <p class="text-slate-400">No models installed.</p>
      ) : (
        <ul class="space-y-3">
          {models.map((model) => (
            <li
              key={model.name}
              class="bg-slate-800 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <div class="font-medium">{model.name}</div>
                <div class="text-sm text-slate-400">
                  Size: {model.size} MB | Last Modified: {model.modified_at}
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => handleDelete(model.name)}
              >
                <Trash2 class="w-4 h-4 mr-2" />
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
