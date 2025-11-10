import OpenAI from 'openai';

export const openAiProvider = {
  provide: OpenAI,
  useFactory: (): OpenAI | undefined => {
    const apiKey = process.env.OPENAI_API_KEY;

    return apiKey != null ? new OpenAI({ apiKey }) : undefined;
  },
};
