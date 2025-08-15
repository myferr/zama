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

// Input validation helpers
function validateModelName(name: string): void {
  if (!name || typeof name !== "string") {
    throw new Error("Model name must be a non-empty string");
  }
  if (name.trim() !== name) {
    throw new Error("Model name cannot have leading or trailing whitespace");
  }
  if (name.length > 200) {
    throw new Error("Model name is too long (max 200 characters)");
  }
  // Basic pattern to prevent obvious injection attempts
  if (/[<>"'&]/.test(name)) {
    throw new Error("Model name contains invalid characters");
  }
}

function validateChatRequest(request: ChatRequest): void {
  if (!request.model || typeof request.model !== "string") {
    throw new Error("Chat request must include a valid model name");
  }
  validateModelName(request.model);

  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    throw new Error("Chat request must include at least one message");
  }

  for (const message of request.messages) {
    if (
      !message.role ||
      !["user", "assistant", "system"].includes(message.role)
    ) {
      throw new Error("Invalid message role");
    }
    if (typeof message.content !== "string") {
      throw new Error("Message content must be a string");
    }
    if (message.content.length > 50000) {
      throw new Error("Message content is too long (max 50,000 characters)");
    }
  }
}

export class OllamaClientClass {
  async listModels(): Promise<ListModelsResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error("Failed to list models");
    return res.json();
  }

  async pullModel({ name }: PullModelRequest): Promise<string> {
    validateModelName(name);
    try {
      const response = await invoke<string>("pull_model", { modelName: name });
      return response;
    } catch (error) {
      throw new Error(`Failed to pull model: ${error}`);
    }
  }

  async deleteModel({
    name,
  }: DeleteModelRequest): Promise<{ success: boolean }> {
    validateModelName(name);
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

  async showModel({ name }: ShowModelRequest): Promise<ShowModelResponse> {
    validateModelName(name);
    const res = await fetch(`${OLLAMA_BASE}/api/show`, {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to show model");
    return res.json();
  }

  async getConfig(): Promise<ConfigResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/config`);
    if (!res.ok) throw new Error("Failed to get config");
    return res.json();
  }

  async chat(request: ChatRequest): Promise<ChatResponse[]> {
    validateChatRequest(request);
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

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatResponse> {
    validateChatRequest(request);
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
