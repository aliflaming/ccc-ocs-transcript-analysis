
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
        
        for (const query of queryData) {
          // First try direct column extraction for specific query types
          if (isColumnExtractionQuery(query)) {
            const columnName = extractColumnName(query);
            
            if (columnName && tryDirectColumnExtraction(sessionResult, columnName, sessionMessages, query)) {
              // If we successfully extracted the column value, continue to next query
              continue;
            }
          }
            
          // If direct extraction didn't work or wasn't applicable, use OpenAI API
          try {
            // Format conversation text with all available fields
            const conversationText = formatConversationText(sessionMessages);
            
            // Add delay between API calls to prevent rate limiting
            await delay(1000);
            
            // Call OpenAI API
            const queryResult = await callOpenAIAPI(
              apiKey, 
              sessionId, 
              query, 
              conversationText
            );
            
            sessionResult[query.queryName] = queryResult;
          } catch (error) {
            handleQueryError(error, sessionResult, query, sessionId);
            
            // If we hit a rate limit error, increase the delay and continue
            if (error instanceof Error && error.message.includes("rate limit")) {
              await delay(2000); // Additional delay for rate limiting
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

  // Helper function to determine if a query is requesting column extraction
  const isColumnExtractionQuery = (query: Query): boolean => {
    const description = query.queryDescription.toLowerCase();
    const name = query.queryName.toLowerCase();
    
    return description.includes("extract column") || 
           description.includes("get column") ||
           description.includes("pull column") ||
           name.includes("participant identifier") ||
           description.includes("participant identifier");
  };
  
  // Helper function to extract column name from query
  const extractColumnName = (query: Query): string => {
    // Try to extract column name from quoted text in query description
    const matches = query.queryDescription.match(/['"]([^'"]+)['"]/);
    if (matches && matches[1]) {
      return matches[1].toLowerCase();
    } 
    
    // Special case for participant identifier
    if (query.queryName.toLowerCase().includes("participant identifier") || 
        query.queryDescription.toLowerCase().includes("participant identifier")) {
      return "participant identifier";
    }
    
    return "";
  };
  
  // Helper function to try direct column extraction
  const tryDirectColumnExtraction = (
    sessionResult: SessionResult, 
    columnName: string, 
    messages: ChatMessage[], 
    query: Query
  ): boolean => {
    // Try to find the value directly from the messages
    for (const message of messages) {
      // Check all keys in lowercase for case-insensitive matching
      const messageKeys = Object.keys(message).map(k => k.toLowerCase());
      
      // Direct match on column name
      if (messageKeys.includes(columnName)) {
        const actualKey = Object.keys(message).find(k => k.toLowerCase() === columnName);
        if (actualKey && message[actualKey]) {
          sessionResult[query.queryName] = message[actualKey];
          return true;
        }
      } 
      
      // Special case for participant identifier
      if (columnName === "participant identifier" && message.messageType) {
        sessionResult[query.queryName] = message.messageType;
        return true;
      }
    }
    
    return false;
  };
  
  // Helper function to format conversation text
  const formatConversationText = (messages: ChatMessage[]): string => {
    return messages.map(msg => {
      // Include all available fields in the conversation text
      return Object.entries(msg)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }).join("\n");
  };
  
  // Helper function to call OpenAI API
  const callOpenAIAPI = async (
    apiKey: string, 
    sessionId: string, 
    query: Query, 
    conversationText: string
  ): Promise<string> => {
    // Standardize output format instruction
    const outputFormatInstruction = query.outputFormat?.trim() 
      ? `${query.outputFormat}` 
      : "Provide a plain, direct answer with no bullet points, prefixes, or formatting.";
    
    try {
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
      return result.choices[0].message.content.trim();
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  };
  
  // Helper function to handle query errors
  const handleQueryError = (
    error: unknown, 
    sessionResult: SessionResult, 
    query: Query, 
    sessionId: string
  ): void => {
    console.error(`Error processing query "${query.queryName}" for session ${sessionId}:`, error);
    sessionResult[query.queryName] = error instanceof Error ? error.message : "Error processing query";
    
    if (error instanceof Error && error.message.includes("rate limit")) {
      toast.error("OpenAI API rate limit exceeded. Please wait a moment and try again, or use a different API key.");
    }
  };

  return {
    isProcessing,
    processData
  };
};
