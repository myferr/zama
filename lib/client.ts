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

const OLLAMA_BASE = "http://localhost:11434";

export class OllamaClient {
  static async listModels(): Promise<ListModelsResponse> {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error("Failed to list models");
    return res.json();
  }

  static async pullModel({
    name,
    stream = false,
  }: PullModelRequest): Promise<Response> {
    const { spawn } = await import("child_process");
    const { promisify } = await import("util");

    return new Promise((resolve, reject) => {
      const args = ["pull", name];
      const ollama = spawn("ollama", args);

      let stdout = "";
      let stderr = "";

      ollama.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      ollama.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      ollama.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to pull model: ${stderr}`));
          return;
        }

        // Create a mock Response object to maintain API compatibility
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ success: true }),
          text: async () => stdout,
          body: null,
          headers: new Headers(),
        } as Response;

        resolve(mockResponse);
      });

      ollama.on("error", (error) => {
        reject(new Error(`Failed to pull model: ${error.message}`));
      });
    });
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
