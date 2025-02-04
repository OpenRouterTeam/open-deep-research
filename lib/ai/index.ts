import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { 
  LanguageModel,
  LanguageModelV1CallOptions,
  FinishReason,
  CoreMessage,
  TextPart,
  LanguageModelV1StreamPart,
  LanguageModelUsage
} from 'ai';

import { customMiddleware } from './custom-middleware';
import { openrouter } from './openrouter';

const openaiClient = new OpenAI();

const convertToOpenAIMessages = (messages: CoreMessage[]): ChatCompletionMessageParam[] => 
  messages.map(msg => {
    const content = Array.isArray(msg.content) 
      ? msg.content.filter((part): part is TextPart => 
          typeof part === 'object' && part !== null && 'type' in part && part.type === 'text')
          .map(part => part.text)
          .join('')
      : msg.content;
    
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
  });

export const customModel = (apiIdentifier: string): LanguageModel => {
  const provider = apiIdentifier.startsWith('openrouter/') ? openrouter : (id: string): LanguageModel => ({
    specificationVersion: 'v1',
    provider: 'openai',
    modelId: id,
    defaultObjectGenerationMode: 'json',
    supportsStructuredOutputs: true,
    doGenerate: async (options: LanguageModelV1CallOptions) => {
      const messages = convertToOpenAIMessages(options.prompt);
      const response = await openaiClient.chat.completions.create({
        model: id,
        messages,
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
          rawPrompt: messages,
          rawSettings: {
            model: id,
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
      const messages = convertToOpenAIMessages(options.prompt);
      const stream = await openaiClient.chat.completions.create({
        model: id,
        messages,
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
                      promptTokens: messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0),
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
          rawPrompt: messages,
          rawSettings: {
            model: id,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: true
          }
        }
      };
    },
  });

  return provider(apiIdentifier);
};
