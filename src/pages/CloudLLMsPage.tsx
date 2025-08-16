import { useState, useEffect } from "preact/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface GeminiConfig {
  apiKey: string;
  defaultModel: string;
}

const GEMINI_CONFIG_KEY = "geminiConfig";

export default function CloudLLMsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [selectedGeminiModel, setSelectedGeminiModel] =
    useState<string>("gemini-pro");
  const { showToast, ToastComponent } = useToast();

  const availableGeminiModels = [
    { name: "gemini-pro" },
    { name: "gemini-pro-vision" },
    { name: "gemini-1.5-flash" },
    { name: "gemini-1.5-pro" },
    { name: "gemini-2.0-flash" },
    { name: "gemini-2.5-flash" },
    { name: "gemini-2.5-pro" },
  ];

  useEffect(() => {
    const storedConfig = localStorage.getItem(GEMINI_CONFIG_KEY);
    if (storedConfig) {
      try {
        const config: GeminiConfig = JSON.parse(storedConfig);
        setGeminiApiKey(config.apiKey);
        setSelectedGeminiModel(config.defaultModel);
      } catch (e) {
        console.error("Failed to parse Gemini config from localStorage", e);
        localStorage.removeItem(GEMINI_CONFIG_KEY);
      }
    }
  }, []);

  const handleSaveGeminiConfig = () => {
    if (!geminiApiKey) {
      showToast("Gemini API Key cannot be empty.", "error");
      return;
    }
    const config: GeminiConfig = {
      apiKey: geminiApiKey,
      defaultModel: selectedGeminiModel,
    };
    localStorage.setItem(GEMINI_CONFIG_KEY, JSON.stringify(config));
    showToast("Gemini configuration saved successfully!", "success");
  };

  const handleDeleteGeminiConfig = () => {
    localStorage.removeItem(GEMINI_CONFIG_KEY);
    setGeminiApiKey("");
    setSelectedGeminiModel("gemini-pro");
    showToast("Gemini configuration deleted.", "success");
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Cloud LLM Configurations</h1>

      <Card>
        <CardHeader>
          <CardTitle>Google Gemini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="gemini-api-key"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              API Key:
            </label>
            <Input
              id="gemini-api-key"
              type="password"
              value={geminiApiKey}
              onInput={(e) =>
                setGeminiApiKey((e.target as HTMLInputElement).value)
              }
              placeholder="Enter your Gemini API Key"
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="gemini-default-model"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Default Model:
            </label>
            <Select
              value={selectedGeminiModel}
              onValueChange={(value: string) => setSelectedGeminiModel(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a default model" />
              </SelectTrigger>
              <SelectContent>
                {availableGeminiModels.map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSaveGeminiConfig}>Save Configuration</Button>
            <Button variant="destructive" onClick={handleDeleteGeminiConfig}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {ToastComponent}
    </div>
  );
}
