import type {
  ChatRequest,
  ChatResponse,
  PullModelRequest,
  DeleteModelRequest,
  ShowModelRequest,
  ShowModelResponse,
  ListModelsResponse,
  ConfigResponse,
} from "./schemas/client.schema";
import { invoke } from "@tauri-apps/api/core";

const OLLAMA_BASE = "http://localhost:11434";

export class OllamaClient {
  static async listModels(): Promise<ListModelsResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error("Failed to list models");
    return res.json();
  }

  static async pullModel({ name }: PullModelRequest): Promise<string> {
    try {
      const response = await invoke<string>("pull_model", { modelName: name });
      return response;
    } catch (error) {
      throw new Error(`Failed to pull model: ${error}`);
    }
  }

  static async deleteModel({
    name,
  }: DeleteModelRequest): Promise<{ success: boolean }> {
    const res = await fetch(`${OLLAMA_BASE}/api/delete`, {
      method: "DELETE",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to delete model: ${errText}`);
    }

    const text = await res.text();
    if (!text) return { success: true }; // empty response = success

    try {
      return JSON.parse(text);
    } catch {
      return { success: true }; // fallback if non-JSON response
    }
  }

  static async showModel({
    name,
  }: ShowModelRequest): Promise<ShowModelResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/show`, {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to show model");
    return res.json();
  }

  static async getConfig(): Promise<ConfigResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/config`);
    if (!res.ok) throw new Error("Failed to get config");
    return res.json();
  }

  static async chat(request: ChatRequest): Promise<ChatResponse[]> {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      body: JSON.stringify(request),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Chat request failed");

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body to read from");

    const decoder = new TextDecoder();
    const messages: ChatResponse[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed: ChatResponse = JSON.parse(line);
          messages.push(parsed);
        } catch {
          // Ignore malformed lines (if any)
        }
      }
    }

    return messages;
  }

  static async *chatStream(request: ChatRequest): AsyncGenerator<ChatResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      body: JSON.stringify(request),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Chat request failed");

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body to read from");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed: ChatResponse = JSON.parse(line);
          yield parsed;
        } catch {
          // Ignore malformed lines (if any)
        }
      }
    }
  }
}
