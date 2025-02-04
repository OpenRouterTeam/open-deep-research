// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'gpt-4o',
    label: 'GPT 4o',
    apiIdentifier: 'gpt-4o',
    description: 'For complex, multi-step tasks',
  },
  {
    id: 'openrouter-mixtral',
    label: 'Mixtral (via OpenRouter)',
    apiIdentifier: 'openrouter/mixtral-8x7b-instruct',
    description: 'High-performance open model via OpenRouter',
  },
];

export const DEFAULT_MODEL_NAME: string = 'gpt-4o';
