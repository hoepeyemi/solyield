import OpenAI from 'openai';
import { YieldOpportunity } from '@shared/schema';
import { storage } from '../storage';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TransactionIntent {
  action: 'invest' | 'withdraw' | 'none';
  protocol?: string;
  amount?: number;
  opportunityId?: number;
}

export class OpenAIService {
  private openai: OpenAI | null;
  private userChats: Map<string, ChatMessage[]>;
  
  constructor() {
    this.userChats = new Map();
    
    // Handle missing API key gracefully
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn("OPENAI_API_KEY not provided. AI chatbot functionality will be limited.");
        this.openai = null;
      } else {
    this.openai = new OpenAI({
          apiKey: apiKey
        });
      }
    } catch (error) {
      console.error("Error initializing OpenAI client:", error);
      this.openai = null;
    }
  }
  
  /**
   * Process a user message and generate a response using OpenAI
   */
  async processMessage(sessionId: string, message: string): Promise<{
    response: string;
    transactionIntent: TransactionIntent;
  }> {
    try {
      // Get or initialize chat history
      let chatHistory = this.userChats.get(sessionId) || [];
      
      // Add system message if this is a new conversation
      if (chatHistory.length === 0) {
        chatHistory.push({
          role: 'system',
          content: this.getSystemPrompt()
        });
      }
      
      // Add user message to history
      chatHistory.push({ role: 'user', content: message });
      
      // Get yield opportunities to provide context
      const yieldOpportunities = await storage.getYieldOpportunities();
      const yieldContext = this.formatYieldOpportunities(yieldOpportunities);
      
      // Add yield context to the latest message
      const contextualMessage = `${message}\n\nHere are the current yield opportunities:\n${yieldContext}`;
      const messages = [
        ...chatHistory.slice(0, -1),
        { role: 'user', content: contextualMessage }
      ];
      
      let response: string;
      let transactionIntent: TransactionIntent = { action: 'none' };
      
      try {
        // If OpenAI client is available, use it
        if (this.openai) {
          // Call OpenAI API
          const completion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
        messages: messages as any,
        temperature: 0.7,
            max_tokens: 500
          });
          
          response = completion.choices[0].message.content || "I'm sorry, I couldn't process your request.";
          
          // Extract transaction intent
          transactionIntent = await this.extractTransactionIntent(message, yieldOpportunities);
        } else {
          // Fallback response when OpenAI is not available
          response = "I'm sorry, but the AI chat service is currently unavailable. Please try again later or contact support for assistance.";
        }
      } catch (error) {
        console.error('Error processing message:', error);
        response = "I'm sorry, I encountered an error processing your request. Please try again later.";
      }
      
      // Add assistant response to history
      chatHistory.push({ role: 'assistant', content: response });
      
      // Update chat history (limit to last 10 messages to save memory)
      if (chatHistory.length > 10) {
        chatHistory = [chatHistory[0], ...chatHistory.slice(chatHistory.length - 9)];
      }
      
      // Save updated chat history
      this.userChats.set(sessionId, chatHistory);
      
      return {
        response: response,
        transactionIntent
      };
    } catch (error) {
      console.error('Error processing chat message:', error);
      return {
        response: 'Sorry, I encountered an error processing your request. Please try again.',
        transactionIntent: { action: 'none' }
      };
    }
  }
  
  /**
   * Clear chat history for a session
   */
  clearChatHistory(sessionId: string): void {
    this.userChats.delete(sessionId);
  }
  
  /**
   * Format yield opportunities as text for context
   */
  private formatYieldOpportunities(opportunities: YieldOpportunity[]): string {
    if (opportunities.length === 0) return "No yield opportunities available at the moment.";
    
    return "Available yield opportunities:\n" + 
      opportunities.map(opp => `- ${opp.name} (${opp.protocol}): ${opp.apy}% APY, Risk: ${opp.riskLevel}`).join("\n");
  }
  
  /**
   * Extract transaction intent from user message
   */
  private async extractTransactionIntent(
    message: string, 
    opportunities: YieldOpportunity[]
  ): Promise<TransactionIntent> {
    if (!this.openai) {
      return { action: 'none' };
    }
    
    try {
      // Default intent
      const defaultIntent: TransactionIntent = { action: 'none' };
      
      // If no opportunities or message is too short, return default
      if (opportunities.length === 0 || message.length < 10) {
        return defaultIntent;
      }
      
      // Call OpenAI to extract intent
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a transaction intent extractor. Extract investment or withdrawal intent from the user message. " +
                     "Return a JSON object with 'action' (invest, withdraw, or none), 'protocol' (optional), 'amount' (optional), and 'opportunityId' (optional)."
          },
          {
            role: "user",
            content: `Extract transaction intent from this message: "${message}". Available opportunities: ${JSON.stringify(opportunities)}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      const result = completion.choices[0].message.content;
      
      if (result) {
        try {
          const parsedResult = JSON.parse(result);
          return {
            action: parsedResult.action || 'none',
            protocol: parsedResult.protocol,
            amount: parsedResult.amount ? Number(parsedResult.amount) : undefined,
            opportunityId: parsedResult.opportunityId ? Number(parsedResult.opportunityId) : undefined
          };
        } catch (e) {
          console.error('Error parsing intent extraction result:', e);
        }
      }
      
      return defaultIntent;
    } catch (error) {
      console.error('Error extracting transaction intent:', error);
      return { action: 'none' };
    }
  }
  
  /**
   * Get system prompt for the chatbot
   */
  private getSystemPrompt(): string {
    return `
You are SolSeeker, an AI assistant for a Solana-based yield aggregator platform called Sol YieldHunter. 
Your primary role is to help users find the best yield opportunities on Solana, explain DeFi concepts, 
and assist with investment decisions.

When users ask about investing or withdrawing, provide helpful information but don't execute transactions directly.
Instead, explain the process and benefits/risks.

Key features of Sol YieldHunter:
1. Aggregates yield opportunities across Solana protocols like Raydium, Marinade, Orca, and Solend
2. Allows users to invest directly through the platform
3. Provides risk assessments for each opportunity
4. Offers auto-compounding features for maximizing returns
5. Sends alerts for high-APY opportunities

Be helpful, concise, and focus on providing accurate information about Solana DeFi.
`;
  }
}

export const openAIService = new OpenAIService();