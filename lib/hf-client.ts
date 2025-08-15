import type { HfModel } from "./schemas/hf.schema";

const HF_BASE = "https://huggingface.co";

export class HfClientClass {
  async listModels(search: string = "GGUF"): Promise<HfModel[]> {
    const res = await fetch(
      `${HF_BASE}/api/models?search=${search}&pipeline_tag=text-generation&sort=downloads&direction=-1&limit=100`,
    );
    if (!res.ok) {
      throw new Error("Failed to fetch models from Hugging Face");
    }
    const data = await res.json();
    return data;
  }
}
