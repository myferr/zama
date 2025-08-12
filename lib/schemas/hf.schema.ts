export interface HfModel {
  modelId: string;
  sha: string;
  private: boolean;
  pipeline_tag: string;
  tags: string[];
  author: string;
  gated: boolean;
  lastModified: string;
  downloads: number;
  likes: number;
}
