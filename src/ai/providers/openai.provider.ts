import OpenAI from 'openai';

export const openAiProvider = {
  provide: OpenAI,
  useFactory: (): OpenAI => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (typeof apiKey !== 'string') {
      throw new Error(
        'OPENAI_API_KEY is required to initialize the OpenAI client.',
      );
    }

    return new OpenAI({ apiKey });
  },
};
