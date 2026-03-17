import { IAIService } from '../interfaces/ai.interface';
import { CozeService } from './coze.service';
import { DeepSeekService } from './deepseek.service';

export class AIServiceFactory {
  static createService(): IAIService {
    const provider = process.env.AI_PROVIDER || 'deepseek';
    
    switch (provider.toLowerCase()) {
      case 'coze':
        console.log('🤖 Using Coze AI service');
        return new CozeService();
      case 'deepseek':
      default:
        console.log('🤖 Using DeepSeek AI service');
        return new DeepSeekService();
    }
  }
}

export const aiService = AIServiceFactory.createService();
