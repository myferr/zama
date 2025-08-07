export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: Record<string, any>;
}

export interface ListModelsResponse {
  models: OllamaModel[];
}

export interface ChatRequest {
  model: string;
  messages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[];
  stream?: boolean;
  options?: Record<string, any>;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: {
    role: "assistant";
    content: string;
  };
  done: boolean;
}

export interface PullModelRequest {
  name: string;
  stream?: boolean;
}

export interface DeleteModelRequest {
  name: string;
}

export interface ShowModelRequest {
  name: string;
}

export interface ShowModelResponse {
  modelfile: string;
  parameters: Record<string, string>;
  template: string;
  system: string;
}

export interface ConfigResponse {
  num_ctx: number;
  num_gpu: number;
  num_thread: number;
  numa: boolean;
  seed: number;
}
