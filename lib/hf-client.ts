import type { HfModel } from "./schemas/hf.schema";
import { invoke } from "@tauri-apps/api/core";

export class HfClientClass {
  async listModels(search: string = "GGUF"): Promise<HfModel[]> {
    try {
      const response = await invoke<HfModel[]>("list_hf_models", { search });
      return response;
    } catch (error) {
      throw new Error(`Failed to list Hugging Face models: ${error}`);
    }
  }
}
