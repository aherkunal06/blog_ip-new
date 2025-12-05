import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query, queryOne } from '@/lib/db';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'ollama';
export type AIModel = string;

export interface AIProviderConfig {
  id: number;
  providerName: AIProvider;
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string; // For Ollama, this is the server URL (default: http://localhost:11434)
  modelName: string;
  temperature: number;
  maxTokens: number;
  rateLimitPerMinute: number;
  isActive: boolean;
  isDefault: boolean;
  costPerToken?: number;
}

export interface AIGenerateOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIGenerateResponse {
  content: string;
  tokensUsed?: number;
  model?: string;
}

export class AIProviderFactory {
  private static openaiClients: Map<number, OpenAI> = new Map();
  private static anthropicClients: Map<number, Anthropic> = new Map();
  private static googleClients: Map<number, GoogleGenerativeAI> = new Map();
  // Ollama doesn't need client caching since it uses HTTP requests

  /**
   * Get the default active AI provider configuration
   */
  static async getDefaultProvider(): Promise<AIProviderConfig | null> {
    try {
      const provider = await queryOne<AIProviderConfig>(
        `SELECT * FROM AIProviderConfig 
         WHERE isDefault = TRUE AND isActive = TRUE 
         LIMIT 1`
      );
      return provider || null;
    } catch (error) {
      console.error('Error fetching default AI provider:', error);
      return null;
    }
  }

  /**
   * Get AI provider configuration by ID
   */
  static async getProviderById(id: number): Promise<AIProviderConfig | null> {
    try {
      const provider = await queryOne<AIProviderConfig>(
        `SELECT * FROM AIProviderConfig WHERE id = ? AND isActive = TRUE`,
        [id]
      );
      return provider || null;
    } catch (error) {
      console.error('Error fetching AI provider:', error);
      return null;
    }
  }

  /**
   * Get OpenAI client for a provider config
   */
  static getOpenAIClient(config: AIProviderConfig): OpenAI {
    if (!this.openaiClients.has(config.id)) {
      this.openaiClients.set(
        config.id,
        new OpenAI({
          apiKey: config.apiKey,
        })
      );
    }
    return this.openaiClients.get(config.id)!;
  }

  /**
   * Get Anthropic client for a provider config
   */
  static getAnthropicClient(config: AIProviderConfig): Anthropic {
    if (!this.anthropicClients.has(config.id)) {
      this.anthropicClients.set(
        config.id,
        new Anthropic({
          apiKey: config.apiKey,
        })
      );
    }
    return this.anthropicClients.get(config.id)!;
  }

  /**
   * Get Google AI client for a provider config
   */
  static getGoogleClient(config: AIProviderConfig): GoogleGenerativeAI {
    if (!this.googleClients.has(config.id)) {
      this.googleClients.set(
        config.id,
        new GoogleGenerativeAI(config.apiKey)
      );
    }
    return this.googleClients.get(config.id)!;
  }

  /**
   * Generate content using the specified provider
   */
  static async generate(
    config: AIProviderConfig,
    options: AIGenerateOptions
  ): Promise<AIGenerateResponse> {
    const { prompt, maxTokens, temperature, model } = options;
    const finalMaxTokens = maxTokens || config.maxTokens;
    const finalTemperature = temperature ?? config.temperature;
    const finalModel = model || config.modelName;

    try {
      switch (config.providerName) {
        case 'openai':
          return await this.generateWithOpenAI(
            config,
            prompt,
            finalMaxTokens,
            finalTemperature,
            finalModel
          );
        case 'anthropic':
          return await this.generateWithAnthropic(
            config,
            prompt,
            finalMaxTokens,
            finalTemperature,
            finalModel
          );
        case 'google':
          return await this.generateWithGoogle(
            config,
            prompt,
            finalMaxTokens,
            finalTemperature,
            finalModel
          );
        case 'ollama':
          return await this.generateWithOllama(
            config,
            prompt,
            finalMaxTokens,
            finalTemperature,
            finalModel
          );
        default:
          throw new Error(`Unsupported AI provider: ${config.providerName}`);
      }
    } catch (error: any) {
      console.error(`Error generating with ${config.providerName}:`, error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Generate content using OpenAI
   */
  private static async generateWithOpenAI(
    config: AIProviderConfig,
    prompt: string,
    maxTokens: number,
    temperature: number,
    model: string
  ): Promise<AIGenerateResponse> {
    const client = this.getOpenAIClient(config);
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model: response.model,
    };
  }

  /**
   * Generate content using Anthropic
   */
  private static async generateWithAnthropic(
    config: AIProviderConfig,
    prompt: string,
    maxTokens: number,
    temperature: number,
    model: string
  ): Promise<AIGenerateResponse> {
    const client = this.getAnthropicClient(config);
    const response = await client.messages.create({
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content =
      response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('') || '';
    const tokensUsed = response.usage?.input_tokens && response.usage?.output_tokens
      ? response.usage.input_tokens + response.usage.output_tokens
      : undefined;

    return {
      content,
      tokensUsed,
      model: response.model,
    };
  }

  /**
   * Generate content using Ollama
   */
  private static async generateWithOllama(
    config: AIProviderConfig,
    prompt: string,
    maxTokens: number,
    temperature: number,
    model: string
  ): Promise<AIGenerateResponse> {
    try {
      // Get baseUrl with fallbacks
      const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const apiUrl = `${baseUrl}/api/generate`;

      console.log(`[Ollama] Connecting to: ${apiUrl}`);
      console.log(`[Ollama] Config baseUrl: ${config.baseUrl || 'not set'}`);
      console.log(`[Ollama] Env baseUrl: ${process.env.OLLAMA_BASE_URL || 'not set'}`);
      console.log(`[Ollama] Final baseUrl: ${baseUrl}`);
      console.log(`[Ollama] Model: ${model}, MaxTokens: ${maxTokens}, Temperature: ${temperature}`);

      // Add timeout to fetch (5 minutes for Ollama - blog generation can take time)
      // Smaller models like llama3.2:1b are slower, especially for longer content (2000 tokens)
      const controller = new AbortController();
      const timeoutMs = 300000; // 5 minutes for blog/article generation
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      console.log(`[Ollama] Timeout set to ${timeoutMs / 1000} seconds (${timeoutMs / 60000} minutes)`);

      try {
        const requestBody = {
          model: model,
          prompt: prompt,
          options: {
            temperature: temperature,
            num_predict: maxTokens, // Ollama uses num_predict instead of max_tokens
          },
          stream: false, // We want the complete response
        };

        console.log(`[Ollama] Request body:`, JSON.stringify({ ...requestBody, prompt: prompt.substring(0, 100) + '...' }));

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[Ollama] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Ollama] API error (${response.status}):`, errorText);
          throw new Error(`Ollama API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Ollama] Response data keys:`, Object.keys(data));

        if (!data.response || data.response.trim().length === 0) {
          console.error(`[Ollama] Empty response. Data:`, JSON.stringify(data).substring(0, 500));
          throw new Error('Empty response from Ollama');
        }

        console.log(`[Ollama] Response received, length: ${data.response.length} characters`);

        // Ollama doesn't provide token usage in the standard way
        // We can estimate based on response length if needed
        const estimatedTokens = Math.ceil(data.response.length / 4); // Rough estimate

        return {
          content: data.response,
          tokensUsed: data.eval_count ? data.eval_count + (data.prompt_eval_count || 0) : estimatedTokens,
          model: model,
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error(`[Ollama] Fetch error:`, {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack,
          cause: fetchError.cause,
        });
        throw fetchError;
      }
    } catch (error: any) {
      console.error('[Ollama] Generation error:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        baseUrl: config.baseUrl || 'http://localhost:11434',
        model: model,
        config: {
          id: config.id,
          providerName: config.providerName,
          baseUrl: config.baseUrl,
        },
      });

      // Provide more specific error messages for Ollama
      const errorMsg = error.message || error.toString();
      const errorName = error.name || '';
      
      if (errorName === 'AbortError' || errorMsg.includes('timeout') || errorMsg.includes('aborted')) {
        throw new Error('Ollama request timed out. The model might be too large or the server is overloaded. Try a smaller model or increase timeout.');
      } else if (errorName === 'TypeError' && errorMsg.includes('fetch')) {
        // This might be a Node.js fetch issue - try to provide helpful message
        throw new Error(`Cannot connect to Ollama server at ${config.baseUrl || 'http://localhost:11434'}. Error: ${errorMsg}. Make sure Ollama is running: ollama serve`);
      } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('fetch failed') || errorMsg.includes('network') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNRESET')) {
        throw new Error(`Cannot connect to Ollama server at ${config.baseUrl || 'http://localhost:11434'}. Make sure Ollama is running: ollama serve`);
      } else if (errorMsg.includes('model') || errorMsg.includes('not found') || errorMsg.includes('404')) {
        throw new Error(`Model "${model}" not found. Pull it with: ollama pull ${model}`);
      } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
        throw new Error('Ollama server error. Check if the model is loaded and Ollama is running properly.');
      }
      throw error;
    }
  }

  /**
   * Generate content using Google AI
   */
  private static async generateWithGoogle(
    config: AIProviderConfig,
    prompt: string,
    maxTokens: number,
    temperature: number,
    model: string
  ): Promise<AIGenerateResponse> {
    try {
      const client = this.getGoogleClient(config);
      const genModel = client.getGenerativeModel({
        model: model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
        },
      });

      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      
      // Check for blocked content or errors
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
      }

      const content = response.text();

      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from Google AI');
      }

      // Google AI doesn't provide token usage in the same way
      return {
        content,
        model: model,
      };
    } catch (error: any) {
      // Provide more specific error messages for Google AI
      if (error.message?.includes('API key')) {
        throw new Error('Invalid Google AI API key. Please check your API key configuration.');
      } else if (error.message?.includes('model') || error.message?.includes('not found')) {
        throw new Error(`Model "${model}" not found or not available for Google AI.`);
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new Error('Google AI quota exceeded or rate limit reached. Please check your API limits.');
      } else if (error.message?.includes('blocked')) {
        throw error; // Re-throw blocked content errors as-is
      }
      throw error;
    }
  }

  /**
   * Test connection to AI provider
   */
  static async testConnection(config: AIProviderConfig): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
    details?: string;
  }> {
    const startTime = Date.now();
    try {
      const testPrompt = 'Reply with only the word "OK" and nothing else.';
      const response = await this.generate(config, {
        prompt: testPrompt,
        maxTokens: 20,
      });

      const responseTime = Date.now() - startTime;
      const content = response.content?.trim() || '';

      // Check if response is empty
      if (!content) {
        return {
          success: false,
          message: 'Empty response from AI provider',
          responseTime,
          details: 'The AI provider returned an empty response. Please check your API key and model configuration.',
        };
      }

      // If we got any non-empty response, the connection is working
      // The test is just to verify the API is accessible and responding
      // We don't need to check for exact "OK" - any response means it's working
      return {
        success: true,
        message: 'Connection successful',
        responseTime,
        details: `Response received: "${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"`,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error('AI Provider Test Error:', {
        provider: config.providerName,
        model: config.modelName,
        error: error.message,
        stack: error.stack,
      });
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Connection failed';
      if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
        errorMessage = 'Invalid API key. Please check your API key configuration.';
      } else if (errorMessage.includes('model') || errorMessage.includes('not found')) {
        if (config.providerName === 'ollama') {
          errorMessage = `Model "${config.modelName}" not found. Pull it with: ollama pull ${config.modelName}`;
        } else {
          errorMessage = `Model "${config.modelName}" not found or not available. Please check the model name.`;
        }
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        errorMessage = 'Rate limit exceeded or quota exceeded. Please check your API limits.';
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        if (config.providerName === 'ollama') {
          errorMessage = 'Cannot connect to Ollama server. Make sure Ollama is running.';
        } else {
          errorMessage = 'Cannot connect to AI provider server.';
        }
      }

      return {
        success: false,
        message: errorMessage,
        responseTime,
        details: error.stack || error.toString(),
      };
    }
  }

  /**
   * Clear cached clients (useful when API keys are updated)
   */
  static clearCache(providerId?: number): void {
    if (providerId) {
      this.openaiClients.delete(providerId);
      this.anthropicClients.delete(providerId);
      this.googleClients.delete(providerId);
    } else {
      this.openaiClients.clear();
      this.anthropicClients.clear();
      this.googleClients.clear();
    }
  }
}

