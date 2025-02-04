import OpenAI from 'openai';
import type { 
  LanguageModel,
  LanguageModelV1CallOptions,
  FinishReason,
  CoreMessage,
  LanguageModelV1StreamPart,
  TextPart,
  LanguageModelUsage
} from 'ai';

const openrouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OpenRouter_AI_s_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/openrouterteam/open-deep-research',
    'X-Title': 'Open Deep Research',
  },
});

export const openrouter = (apiIdentifier: string): LanguageModel => ({
  specificationVersion: 'v1',
  provider: 'openrouter',
  modelId: apiIdentifier,
  defaultObjectGenerationMode: 'json',
  supportsStructuredOutputs: true,
  doGenerate: async (options: LanguageModelV1CallOptions) => {
    const response = await openrouterClient.chat.completions.create({
      model: apiIdentifier,
      messages: options.prompt.map(msg => {
        const content = typeof msg.content === 'string' ? msg.content : msg.content.map(part => 
          part.type === 'text' ? part.text : ''
        ).join('');
        
        if (msg.role === 'tool') {
          return {
            role: msg.role,
            content,
            tool_call_id: 'default_tool_call'
          };
        }
        
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content,
        };
      }),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      response_format: options.responseFormat?.type === 'json' ? { type: 'json_object' } : undefined,
    });

    return {
      text: response.choices[0]?.message?.content || undefined,
      finishReason: response.choices[0]?.finish_reason as FinishReason || 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      } as LanguageModelUsage,
      toolCalls: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          model: apiIdentifier,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }
      },
      response: {
        id: response.id,
        timestamp: new Date(response.created * 1000),
        modelId: response.model,
      }
    };
  },
  doStream: async (options: LanguageModelV1CallOptions) => {
    const stream = await openrouterClient.chat.completions.create({
      model: apiIdentifier,
      messages: options.prompt.map(msg => {
        const content = typeof msg.content === 'string' ? msg.content : msg.content.map(part => 
          part.type === 'text' ? part.text : ''
        ).join('');
        
        if (msg.role === 'tool') {
          return {
            role: msg.role,
            content,
            tool_call_id: 'default_tool_call'
          };
        }
        
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content,
        };
      }),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
      response_format: options.responseFormat?.type === 'json' ? { type: 'json_object' } : undefined,
    });

    return {
      stream: new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            let totalCompletionTokens = 0;
            for await (const chunk of stream) {
              if (chunk.choices[0]?.delta?.content) {
                controller.enqueue({
                  type: 'text-delta',
                  textDelta: chunk.choices[0].delta.content,
                });
                totalCompletionTokens++;
              }
              if (chunk.choices[0]?.finish_reason) {
                controller.enqueue({
                  type: 'finish',
                  finishReason: chunk.choices[0].finish_reason as FinishReason,
                  usage: {
                    promptTokens: options.prompt.reduce((acc, msg) => acc + (typeof msg.content === 'string' ? msg.content.length : 0), 0),
                    completionTokens: totalCompletionTokens,
                  }
                });
                controller.close();
              }
            }
          } catch (error) {
            controller.enqueue({
              type: 'error',
              error
            });
            controller.close();
          }
        }
      }),
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          model: apiIdentifier,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          stream: true
        }
      }
    };
  },
});
