import type { Message } from 'ai';

export const customMiddleware = {
  async transformMessages(messages: Message[]) {
    return messages;
  }
};
