import OpenAI from "openai";
import { log } from '../vite';

class OpenAIService {
  private openai: OpenAI | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o serviço OpenAI com a chave de API
   */
  initialize(): boolean {
    try {
      // Usar uma chave de API simulada para ambiente de desenvolvimento se não estiver configurada
      const apiKey = process.env.OPENAI_API_KEY || "sk-simulated-key-for-development-environment";
      
      if (!apiKey) {
        log("Chave de API da OpenAI não configurada", "openai-service");
        return false;
      }

      this.openai = new OpenAI({ apiKey });
      this.initialized = true;

      if (apiKey.startsWith("sk-simulated")) {
        log("Serviço OpenAI inicializado com chave simulada para desenvolvimento", "openai-service");
      } else {
        log("Serviço OpenAI inicializado com sucesso", "openai-service");
      }
      return true;
    } catch (error) {
      log(`Erro ao inicializar serviço OpenAI: ${error}`, "openai-service");
      return false;
    }
  }

  /**
   * Envia uma mensagem para o modelo GPT da OpenAI
   * @param systemPrompt Instruções do sistema
   * @param messages Histórico de mensagens
   * @returns Resposta do modelo
   */
  async sendMessage(systemPrompt: string, messages: any[]): Promise<string> {
    if (!this.initialized || !this.openai) {
      const initialized = this.initialize();
      if (!initialized) {
        throw new Error("Serviço OpenAI não está inicializado");
      }
    }

    try {
      // Em ambiente de desenvolvimento com chave simulada, usar respostas predefinidas
      const isDevelopmentWithSimulation = process.env.NODE_ENV === 'development' && 
                                        (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-simulated'));
      
      if (isDevelopmentWithSimulation) {
        log("Usando resposta simulada para desenvolvimento", "openai-service");
        
        // Obter a última mensagem do usuário para determinar o contexto
        const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
        
        // Verificar se a mensagem contém palavras-chave para respostas personalizadas
        if (lastUserMessage.toLowerCase().includes('olá') || 
            lastUserMessage.toLowerCase().includes('oi') || 
            lastUserMessage.toLowerCase().includes('bom dia') || 
            lastUserMessage.toLowerCase().includes('boa tarde') || 
            lastUserMessage.toLowerCase().includes('boa noite')) {
          return "Olá! Sou um assistente virtual e estou aqui para ajudar. Como posso ser útil hoje?";
        } 
        
        if (lastUserMessage.toLowerCase().includes('agendamento') || 
            lastUserMessage.toLowerCase().includes('agendar') ||
            lastUserMessage.toLowerCase().includes('marcar') ||
            lastUserMessage.toLowerCase().includes('consulta')) {
          return "Claro, posso te ajudar com um agendamento. Por favor, me informe qual serviço você deseja agendar, e qual seria a data e horário de sua preferência?";
        }
        
        if (lastUserMessage.toLowerCase().includes('preço') || 
            lastUserMessage.toLowerCase().includes('valor') ||
            lastUserMessage.toLowerCase().includes('custo') ||
            lastUserMessage.toLowerCase().includes('pagamento')) {
          return "Nossos preços variam de acordo com o serviço. Posso fornecer mais detalhes sobre um serviço específico se você me informar qual é do seu interesse.";
        }
        
        // Resposta genérica para qualquer outra mensagem
        return "Obrigado pelo seu contato. Entendi sua mensagem e estou aqui para ajudar com qualquer dúvida ou informação que você precise.";
      }
      
      // Em produção, fazer chamada para API da OpenAI
      // Garantir que this.openai não seja nulo após a inicialização
      if (!this.openai) {
        throw new Error("Serviço OpenAI não está inicializado corretamente");
      }
      
      // Preparar mensagens para API
      const systemMessage = {
        role: "system",
        content: systemPrompt
      };

      const formattedMessages = [systemMessage, ...messages];

      // Fazer chamada para API da OpenAI
      // o modelo mais recente da OpenAI é "gpt-4o", que foi lançado em 13 de maio de 2024. não altere isso a menos que explicitamente solicitado pelo usuário
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: formattedMessages as any, // cast para superar questões de tipo
        max_tokens: 1000,
        temperature: 0.7,
      });

      // Extrair resposta
      const reply = response.choices[0]?.message?.content || "Não foi possível gerar uma resposta.";
      return reply;
    } catch (error) {
      log(`Erro ao enviar mensagem para OpenAI: ${error}`, "openai-service");
      
      // Em caso de erro, retornar uma resposta genérica em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        return "Desculpe, estou com dificuldades em processar sua solicitação no momento. Estamos em ambiente de desenvolvimento e a resposta real não pôde ser gerada. Como posso ajudar de outra forma?";
      }
      
      throw error;
    }
  }

  /**
   * Analisa o sentimento de um texto usando OpenAI
   * @param text Texto a ser analisado
   * @returns Objeto com dados de análise
   */
  async analyzeSentiment(text: string): Promise<any> {
    if (!this.initialized || !this.openai) {
      const initialized = this.initialize();
      if (!initialized) {
        throw new Error("Serviço OpenAI não está inicializado");
      }
    }

    try {
      // Em ambiente de desenvolvimento com chave simulada, retornar uma resposta mock
      const isDevelopmentWithSimulation = process.env.NODE_ENV === 'development' && 
                                        (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-simulated'));
      
      if (isDevelopmentWithSimulation) {
        log("Usando análise de sentimento simulada para desenvolvimento", "openai-service");
        
        // Verificar se o texto contém informações de agendamento
        if (text.toLowerCase().includes('agendamento') || 
            text.toLowerCase().includes('agendar') || 
            text.toLowerCase().includes('marcar') || 
            text.toLowerCase().includes('consulta')) {
          
          return {
            isAppointmentIntent: true,
            service: "Consulta geral",
            date: "2025-05-15",
            time: "14:00",
            name: "Cliente",
            phone: "",
            email: ""
          };
        }
        
        // Resposta padrão para análise de sentimento
        return {
          isAppointmentIntent: false,
          sentiment: "neutro",
          confidence: 0.8
        };
      }
      
      // Em produção, fazer chamada para API da OpenAI
      // Garantir que this.openai não seja nulo após a inicialização
      if (!this.openai) {
        throw new Error("Serviço OpenAI não está inicializado corretamente");
      }
      
      // o modelo mais recente da OpenAI é "gpt-4o", que foi lançado em 13 de maio de 2024. não altere isso a menos que explicitamente solicitado pelo usuário
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é um analisador de intenções. Extraia informações estruturadas do texto fornecido.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      // Extrair e tentar parsear o JSON da resposta
      const responseText = response.choices[0]?.message?.content || "{}";
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        log(`Erro ao parsear resposta JSON da OpenAI: ${parseError}`, "openai-service");
        return {};
      }
    } catch (error) {
      log(`Erro ao analisar sentimento com OpenAI: ${error}`, "openai-service");
      
      // Em caso de erro, retornar um objeto básico em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        return {
          isAppointmentIntent: false,
          sentiment: "neutro",
          confidence: 0.5,
          error: "Erro ao analisar sentimento (ambiente de desenvolvimento)"
        };
      }
      
      throw error;
    }
  }

  /**
   * Gera uma imagem a partir de um prompt
   * @param prompt Descrição da imagem desejada
   * @returns URL da imagem gerada
   */
  async generateImage(prompt: string): Promise<string> {
    if (!this.initialized || !this.openai) {
      const initialized = this.initialize();
      if (!initialized) {
        throw new Error("Serviço OpenAI não está inicializado");
      }
    }

    try {
      // Em ambiente de desenvolvimento com chave simulada, retornar uma URL de imagem simulada
      const isDevelopmentWithSimulation = process.env.NODE_ENV === 'development' && 
                                        (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-simulated'));
      
      if (isDevelopmentWithSimulation) {
        log("Usando geração de imagem simulada para desenvolvimento", "openai-service");
        // Retornar uma URL de imagem placeholder como exemplo
        return "https://via.placeholder.com/1024x1024.png?text=Imagem+Simulada+Para+Desenvolvimento";
      }
      
      // Em produção, fazer chamada para API da OpenAI
      // Garantir que this.openai não seja nulo após a inicialização
      if (!this.openai) {
        throw new Error("Serviço OpenAI não está inicializado corretamente");
      }
      
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      });

      // Verificar se o response e data existem antes de acessar
      if (!response || !response.data || response.data.length === 0) {
        throw new Error("Resposta de geração de imagem inválida");
      }
      
      return response.data[0].url || "URL de imagem não disponível";
    } catch (error) {
      log(`Erro ao gerar imagem com OpenAI: ${error}`, "openai-service");
      
      // Em caso de erro, retornar uma URL padrão em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        return "https://via.placeholder.com/1024x1024.png?text=Erro+na+Geração+de+Imagem";
      }
      
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
