
import { useState } from 'react';
import { toast } from 'sonner';
import { ChatMessage, Query, SessionResult } from '@/pages/Index';

interface UseOpenAIProps {
  apiKey: string;
}

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useOpenAI = ({ apiKey }: UseOpenAIProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processData = async (chatData: ChatMessage[], queryData: Query[]) => {
    if (!chatData.length || !queryData.length || !apiKey) {
      toast.error("Please provide all required inputs before processing");
      return null;
    }

    setIsProcessing(true);
    try {
      // Group chat data by session ID
      const sessionGroups = chatData.reduce((groups, message) => {
        const { sessionId } = message;
        if (!groups[sessionId]) {
          groups[sessionId] = [];
        }
        groups[sessionId].push(message);
        return groups;
      }, {} as Record<string, ChatMessage[]>);

      // Create a base result object with session IDs
      const sessionResults: SessionResult[] = Object.keys(sessionGroups).map(sessionId => {
        // Find the earliest message date for each session
        const sessionMessages = sessionGroups[sessionId];
        const dates = sessionMessages.map(msg => msg.messageDate);
        const startDate = dates.length > 0 ? dates[0] : '';
        
        return {
          sessionId,
          "Start date": startDate // Add start date to the results
        };
      });

      // Process each session sequentially with delay between sessions
      const processedResults = [];
      for (const sessionResult of sessionResults) {
        const sessionId = sessionResult.sessionId;
        const sessionMessages = sessionGroups[sessionId];
        
        // Format the conversation for the prompt
        const conversationText = sessionMessages
          .map(msg => `${msg.messageType}: ${msg.messageContent} (Date: ${msg.messageDate})`)
          .join("\n");

        // Process each query for this session
        for (const query of queryData) {
          try {
            // Add delay between API calls to respect rate limits
            if (processedResults.length > 0 || (processedResults.length === 0 && query !== queryData[0])) {
              await delay(1000); // 1 second delay between calls
            }
            
            // Standardize output format instruction
            const outputFormatInstruction = query.outputFormat?.trim() 
              ? `${query.outputFormat}` 
              : "Provide a plain, direct answer with no bullet points, prefixes, or formatting.";
            
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content: `You are an assistant that analyzes chat transcripts. Your task is to answer the following query about a chat transcript: "${query.queryDescription}". 

IMPORTANT: The session ID for this conversation is "${sessionId}". This is a unique identifier provided in the data and should be preserved exactly as is. Do not generate new session IDs or modify the provided session ID in any way.

You MUST format your response exactly as specified: ${outputFormatInstruction}. Do not include any additional text, bullet points, numbers, or prefixes in your response.`
                  },
                  {
                    role: "user",
                    content: `Based on the following chat transcript for session ID "${sessionId}", answer the query "${query.queryDescription}":\n\n${conversationText}`
                  }
                ],
                temperature: 0.1,
                max_tokens: 100,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error?.message || `API call failed: ${response.status}`;
              
              if (response.status === 429) {
                throw new Error(`OpenAI API rate limit exceeded: ${errorMessage}`);
              } else {
                throw new Error(errorMessage);
              }
            }

            const result = await response.json();
            const queryResult = result.choices[0].message.content.trim();
            sessionResult[query.queryName] = queryResult;
          } catch (error) {
            console.error(`Error processing query "${query.queryName}" for session ${sessionId}:`, error);
            sessionResult[query.queryName] = error instanceof Error ? error.message : "Error processing query";
            
            if (error instanceof Error && error.message.includes("rate limit") && query === queryData[0]) {
              toast.error("OpenAI API rate limit exceeded. Please wait a moment and try again, or use a different API key.");
            }
          }
        }
        
        processedResults.push(sessionResult);
      }

      toast.success("Data processing complete!");
      return processedResults;
    } catch (error) {
      console.error("Error processing data:", error);
      const errorMessage = error instanceof Error ? error.message : "Error processing data";
      toast.error(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processData
  };
};
