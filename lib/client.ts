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
import { listen } from "@tauri-apps/api/event";

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
    try {
      const response = await invoke<ListModelsResponse>("list_ollama_models");
      return response;
    } catch (error) {
      throw new Error(`Failed to list models: ${error}`);
    }
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
    try {
      await invoke<string>("delete_ollama_model", {
        request: { name },
      });
      return { success: true }; // Rust command returns string on success
    } catch (error) {
      throw new Error(`Failed to delete model: ${error}`);
    }
  }

  async showModel({ name }: ShowModelRequest): Promise<ShowModelResponse> {
    validateModelName(name);
    try {
      const response = await invoke<ShowModelResponse>("show_ollama_model", {
        request: { name },
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to show model: ${error}`);
    }
  }

  async getConfig(): Promise<ConfigResponse> {
    try {
      const response = await invoke<ConfigResponse>("get_ollama_config");
      return response;
    } catch (error) {
      throw new Error(`Failed to get config: ${error}`);
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse[]> {
    validateChatRequest(request);
    const messages: ChatResponse[] = [];
    let unsubscribe: (() => void) | undefined;

    const promise = new Promise<void>((resolve, reject) => {
      listen<ChatResponse>("ollama-chat-chunk", (event) => {
        messages.push(event.payload);
        if (event.payload.done) {
          resolve();
        }
      })
        .then((unsub) => {
          unsubscribe = unsub;
          return invoke<void>("chat_ollama", { request });
        })
        .catch((error) => {
          reject(new Error(`Failed to invoke chat_ollama: ${error}`));
        });
    });

    await promise;
    unsubscribe?.();
    return messages;
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatResponse> {
    validateChatRequest(request);
    let unsubscribe: () => void;

    const eventQueue: ChatResponse[] = [];
    let resolvePromise: ((value?: unknown) => void) | null = null;
    let dataAvailablePromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    unsubscribe = await listen<ChatResponse>("ollama-chat-chunk", (event) => {
      eventQueue.push(event.payload);
      if (resolvePromise) {
        resolvePromise();
        resolvePromise = null;
        dataAvailablePromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });
      }
    });

    try {
      await invoke<void>("chat_ollama", { request });

      while (true) {
        if (eventQueue.length > 0) {
          const chunk = eventQueue.shift() as ChatResponse;
          yield chunk;
          if (chunk.done) {
            break;
          }
        } else {
          // Wait for new data if the queue is empty
          await dataAvailablePromise;
        }
      }
    } catch (error) {
      throw new Error(`Failed to invoke chat_ollama: ${error}`);
    } finally {
      unsubscribe();
    }
  }
}
