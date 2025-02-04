import OpenAI from 'openai';
import { AIStream, StreamingTextResponse } from 'ai';
import type { Message } from 'ai';

interface GenerateOptions {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

import { customMiddleware } from './custom-middleware';
import { openrouter } from './openrouter';

const openaiClient = new OpenAI();

export const customModel = (apiIdentifier: string) => {
  const provider = apiIdentifier.startsWith('openrouter/') ? openrouter : (id: string) => ({
    id: 'openai',
    generateText: async (options: GenerateOptions) => {
      const response = await openaiClient.chat.completions.create({
        model: id,
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
      const response = await openaiClient.chat.completions.create({
        model: id,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    },
    stream: async (options: GenerateOptions & AIStreamCallbacksAndOptions) => {
      const response = await openaiClient.chat.completions.create({
        model: id,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      });
      return new StreamingTextResponse(AIStream(response));
    },
  });

  return provider(apiIdentifier);
};
