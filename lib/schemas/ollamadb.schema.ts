export interface OllamaDBModel {
  model_identifier: string;
  namespace: string | null;
  model_name: string;
  model_type: string;
  description: string;
  capability: string | null;
  labels: string[];
  pulls: number;
  tags: number;
  last_updated: string;
  last_updated_str: string;
  url: string;
}

export interface OllamaDBResponse {
  models: OllamaDBModel[];
  total_count: number;
  limit: number;
  skip: number;
  data_updated: string;
}
