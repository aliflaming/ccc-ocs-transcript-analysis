
import { useState } from 'react';
import { toast } from 'sonner';
import { ChatMessage, Query, SessionResult } from '@/pages/Index';

interface UseOpenAIProps {
  apiKey: string;
}

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sanitize strings to remove non-ISO-8859-1 characters
const sanitizeString = (str: string): string => {
  if (!str) return '';
  // Replace non-ISO-8859-1 characters with spaces or approximations
  return str
    .replace(/[^\x00-\xFF]/g, ' ') // Replace non-ISO-8859-1 chars with space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Remove control characters
};

export const useOpenAI = ({ apiKey }: UseOpenAIProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processData = async (chatData: ChatMessage[], queryData: Query[]) => {
    if (!chatData.length || !queryData.length || !apiKey) {
      toast.error("Please provide all required inputs before processing");
      return null;
    }

    setIsProcessing(true);
    try {
      // Sanitize API key to ensure it contains only valid characters
      const sanitizedApiKey = sanitizeString(apiKey);
      
      // Group chat data by session ID to reduce memory usage and processing time
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
          sessionId: sanitizeString(sessionId),
          "Start date": sanitizeString(startDate) // Add start date to the results
        };
      });
      
      // Create a queue for tracking active API requests to prevent rate limiting
      let activeRequests = 0;
      const maxConcurrentRequests = 3;
      const maxQueueWaitTime = 10000; // 10 seconds
      
      // Process each session
      const processedResults = [];
      let consecutiveApiCalls = 0;
      const baseDelayMs = 800;
      
      for (const sessionResult of sessionResults) {
        const sessionId = sessionResult.sessionId;
        const sessionMessages = sessionGroups[sessionId];
        
        // Process all queries
        const queriesPromises = queryData.map(async (query) => {
          // Wait for a slot in the concurrency queue
          const queueStartTime = Date.now();
          while (activeRequests >= maxConcurrentRequests) {
            // Check if we've been waiting too long
            if (Date.now() - queueStartTime > maxQueueWaitTime) {
              console.warn(`Queue wait timeout for query ${query.queryName}`);
              return; // Skip this query after timeout
            }
            await delay(100); // Short delay to check again
          }
          
          activeRequests++;
          try {
            // First try direct column extraction for specific query types
            if (isColumnExtractionQuery(query)) {
              const columnName = extractColumnName(query);
              
              if (columnName && tryDirectColumnExtraction(sessionResult, columnName, sessionMessages, query)) {
                // If we successfully extracted the column value, continue to next query
                return;
              }
            }
            
            // Format conversation text with necessary fields only to reduce payload size
            const conversationText = formatConversationTextOptimized(sessionMessages);
            
            // Add adaptive delay between API calls to prevent rate limiting
            const currentDelay = baseDelayMs * Math.min(consecutiveApiCalls, 3);
            await delay(currentDelay);
            consecutiveApiCalls++;
            
            // Reset consecutive call counter periodically
            if (consecutiveApiCalls > 5) {
              await delay(1500);
              consecutiveApiCalls = 0;
            }
            
            // Call OpenAI API with optimized settings
            const queryResult = await callOpenAIAPI(
              sanitizedApiKey, 
              sessionId, 
              query, 
              conversationText
            );
            
            sessionResult[query.queryName] = queryResult;
          } catch (error) {
            handleQueryError(error, sessionResult, query, sessionId);
            
            // If we hit a rate limit error, increase the delay significantly and reset counter
            if (error instanceof Error && error.message.includes("rate limit")) {
              await delay(6000);
              consecutiveApiCalls = 0;
            }
          } finally {
            activeRequests--;
          }
        });
        
        // Wait for all queries to complete for this session before moving to next session
        // This prevents overloading the API with too many concurrent requests
        await Promise.all(queriesPromises);
        
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
    const description = query.queryDescription?.toLowerCase() || '';
    const name = query.queryName?.toLowerCase() || '';
    
    return description.includes("extract column") || 
           description.includes("get column") ||
           description.includes("pull column") ||
           name.includes("participant identifier") ||
           description.includes("participant identifier");
  };
  
  // Helper function to extract column name from query
  const extractColumnName = (query: Query): string => {
    if (!query.queryDescription) return '';
    
    // Try to extract column name from quoted text in query description
    const matches = query.queryDescription.match(/['"]([^'"]+)['"]/);
    if (matches && matches[1]) {
      return matches[1].toLowerCase();
    } 
    
    // Special case for participant identifier
    if ((query.queryName?.toLowerCase() || '').includes("participant identifier") || 
        (query.queryDescription?.toLowerCase() || '').includes("participant identifier")) {
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
    // Check if the messages have this column first
    const firstMessage = messages[0];
    if (!firstMessage) return false;
    
    // Check for direct match on column name (case insensitive)
    const matchingKey = Object.keys(firstMessage).find(
      k => k.toLowerCase() === columnName.toLowerCase()
    );
    
    if (matchingKey) {
      // Use the first non-empty value from messages
      for (const message of messages) {
        if (message[matchingKey] && message[matchingKey].trim() !== '') {
          sessionResult[query.queryName] = sanitizeString(message[matchingKey]);
          return true;
        }
      }
    }
    
    // Special case for participant identifier that might be stored differently
    if (columnName === "participant identifier") {
      for (const message of messages) {
        if (message.participantIdentifier && message.participantIdentifier.trim() !== '') {
          sessionResult[query.queryName] = sanitizeString(message.participantIdentifier);
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Helper function to format conversation text with only necessary fields to reduce payload
  const formatConversationTextOptimized = (messages: ChatMessage[]): string => {
    return messages.slice(0, 30)
      .map(msg => { 
        const essentialFields = [
          `messageType: ${sanitizeString(msg.messageType || '')}`,
          `messageContent: ${sanitizeString(msg.messageContent || '').substring(0, 200)}`, // Limit length
          `participantIdentifier: ${sanitizeString(msg.participantIdentifier || '')}`,
          `messageDate: ${sanitizeString(msg.messageDate || '')}`
        ];
        
        return essentialFields.join(", ");
      }).join("\n");
  };
  
  // Helper function to call OpenAI API with optimized settings
  const callOpenAIAPI = async (
    apiKey: string, 
    sessionId: string, 
    query: Query, 
    conversationText: string
  ): Promise<string> => {
    // Truncate conversation text if it's too long
    const maxConversationLength = 8000;
    const truncatedText = conversationText.length > maxConversationLength
      ? conversationText.substring(0, maxConversationLength) + "... (conversation truncated for performance)"
      : conversationText;
    
    const outputFormatInstruction = query.outputFormat?.trim() 
      ? sanitizeString(query.outputFormat)
      : "Provide a plain, direct answer with no bullet points, prefixes, or formatting.";
    
    // Sanitize query values to prevent encoding issues
    const sanitizedQueryDesc = sanitizeString(query.queryDescription || '');
    const sanitizedSessionId = sanitizeString(sessionId);
    
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
              content: `You are an assistant that analyzes chat transcripts. Your task is to answer the following query about a chat transcript: "${sanitizedQueryDesc}". 

IMPORTANT: The session ID for this conversation is "${sanitizedSessionId}". This is a unique identifier provided in the data and should be preserved exactly as is. Do not generate new session IDs or modify the provided session ID in any way.

You MUST format your response exactly as specified: ${outputFormatInstruction}. Do not include any additional text, bullet points, numbers, or prefixes in your response.`
            },
            {
              role: "user",
              content: `Based on the following chat transcript for session ID "${sanitizedSessionId}", answer the query "${sanitizedQueryDesc}":\n\n${truncatedText}`
            }
          ],
          temperature: 0.1,
          max_tokens: 80
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API call failed: ${response.status}`;
        
        if (response.status === 429) {
          throw new Error(`OpenAI API rate limit exceeded: ${sanitizeString(errorMessage)}`);
        } else if (response.status === 503 || response.status === 504) {
          throw new Error(`OpenAI API service unavailable: ${sanitizeString(errorMessage)}`);
        } else {
          throw new Error(sanitizeString(errorMessage));
        }
      }

      const result = await response.json();
      return sanitizeString(result.choices[0].message.content.trim());
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
    
    // Set a more user-friendly error message in the results
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        sessionResult[query.queryName] = "API rate limit exceeded";
        toast.error("OpenAI API rate limit exceeded. Retrying with increased delay.", {
          id: "rate-limit-error",
          duration: 3000,
        });
      } else if (error.message.includes("service unavailable")) {
        sessionResult[query.queryName] = "API service unavailable";
      } else {
        sessionResult[query.queryName] = "Error: " + sanitizeString(error.message.substring(0, 50));
      }
    } else {
      sessionResult[query.queryName] = "Unknown error";
    }
  };

  return {
    isProcessing,
    processData
  };
};
