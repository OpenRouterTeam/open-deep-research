import type { CoreMessage, LanguageModelV1Middleware } from 'ai';

export const customMiddleware: LanguageModelV1Middleware = {
  middlewareVersion: 'v1',
  transformParams: async ({ params }) => params
};
