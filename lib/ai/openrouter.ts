import OpenAI from 'openai';
import { AIStream, StreamingTextResponse } from 'ai';
import type { Message } from 'ai';

interface GenerateOptions {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

const openrouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OpenRouter_AI_s_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/openrouterteam/open-deep-research',
    'X-Title': 'Open Deep Research',
  },
});

export const openrouter = (apiIdentifier: string) => ({
  id: 'openrouter',
  generateText: async (options: GenerateOptions) => {
    const response = await openrouterClient.chat.completions.create({
      model: apiIdentifier,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false,
    });
    return {
      text: response.choices[0]?.message?.content || '',
    };
  },
  generateObject: async (options: GenerateOptions) => {
    const response = await openrouterClient.chat.completions.create({
      model: apiIdentifier,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  },
  stream: async (options: GenerateOptions & AIStreamCallbacksAndOptions) => {
    const response = await openrouterClient.chat.completions.create({
      model: apiIdentifier,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
    });
    return new StreamingTextResponse(AIStream(response));
  },
});
