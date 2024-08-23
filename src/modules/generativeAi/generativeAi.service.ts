import { Injectable } from '@nestjs/common';

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIResponseError,
  type GenerateContentRequest,
  type GenerativeModel,
} from '@google/generative-ai';
import { initialPrompt } from './initialPrompt';

@Injectable()
export class GenerativeAiService {
  private model: GenerativeModel | null = null;
  constructor(private readonly genAI: GoogleGenerativeAI) {}

  async onModuleInit() {
    await this.createGenerativeModel();
  }

  async createGenerativeModel() {
    try {
      this.genAI.apiKey = process.env.API_KEY;
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: initialPrompt,
      });
    } catch (error) {
      console.error('Failed to create generative model:', error);
    }
  }

  async generateResponse(messages: GenerateContentRequest) {
    if (!this.model) {
      throw new Error('Generative model is not initialized.');
    }

    try {
      const response = await this.model.generateContent(messages);
      return response;
    } catch (error) {
      if (error instanceof GoogleGenerativeAIResponseError) {
        console.error('GoogleGenerativeAI Error:', error.message);
      } else {
        console.error('Erro inesperado:', error);
      }
    }
  }
}
