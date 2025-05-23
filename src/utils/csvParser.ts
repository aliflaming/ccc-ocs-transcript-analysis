
import { toast } from "sonner";
import { ChatMessage, Query } from "@/pages/Index";

export const parseChatCSV = (csv: string): ChatMessage[] => {
  try {
    // Use faster string processing method for line splitting
    const lines = csv.trim().split("\n");
    if (lines.length === 0) {
      toast.error("Chat CSV file is empty");
      return [];
    }
    
    const headers = lines[0].split(",").map(header => header?.trim()?.toLowerCase() || "");
    
    const requiredHeaders = ["message type", "message content", "session id", "message date", "participant identifier"];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      toast.error(`Chat CSV is missing required headers: ${missingHeaders.join(", ")}`);
      return [];
    }
    
    // Cap the maximum number of messages to process to prevent memory issues
    const maxMessages = 5000;
    if (lines.length > maxMessages) {
      toast.warning(`Processing only the first ${maxMessages} messages to prevent performance issues`);
    }
    
    return parseCSVLines(lines.slice(0, maxMessages + 1), headers);
  } catch (error) {
    console.error("Error parsing chat CSV:", error);
    toast.error("Failed to parse chat CSV file. Please check the file format.");
    return [];
  }
};

export const parseQueryCSV = (csv: string): Query[] => {
  try {
    const lines = csv.trim().split("\n");
    if (lines.length === 0) {
      toast.error("Query CSV file is empty");
      return [];
    }
    
    const headers = lines[0].split(",").map(header => header?.trim()?.toLowerCase() || "");
    
    const requiredHeaders = ["query name", "query description"];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      toast.error(`Query CSV is missing required headers: ${missingHeaders.join(", ")}`);
      return [];
    }
    
    // Cap the maximum number of queries to process to prevent memory issues
    const maxQueries = 50;
    if (lines.length > maxQueries) {
      toast.warning(`Processing only the first ${maxQueries} queries to prevent performance issues`);
    }
    
    return lines.slice(1, maxQueries + 1)
      .filter(line => line.trim())
      .map(line => {
        try {
          const values = parseCSVLine(line);
          if (!values || values.length <= 1) return null;
          
          const queryNameIndex = headers.indexOf("query name");
          const queryDescriptionIndex = headers.indexOf("query description");
          const outputFormatIndex = headers.indexOf("output format");
          
          if (queryNameIndex < 0 || queryDescriptionIndex < 0 || 
              queryNameIndex >= values.length || queryDescriptionIndex >= values.length) {
            return null;
          }
          
          return {
            queryName: (values[queryNameIndex] || "").trim().replace(/"/g, ''),
            queryDescription: (values[queryDescriptionIndex] || "").trim().replace(/"/g, ''),
            ...(outputFormatIndex >= 0 && outputFormatIndex < values.length ? {
              outputFormat: (values[outputFormatIndex] || "").trim().replace(/"/g, '')
            } : {})
          };
        } catch (e) {
          return null;
        }
      })
      .filter((query): query is Query => query !== null);
  } catch (error) {
    console.error("Error parsing query CSV:", error);
    toast.error("Failed to parse query CSV file. Please check the file format.");
    return [];
  }
};

const parseCSVLines = (lines: string[], headers: string[]): ChatMessage[] => {
  // Process in smaller batches to avoid blocking the main thread
  const batchSize = 500;
  let result: ChatMessage[] = [];
  
  for (let i = 1; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize)
      .filter(line => line.trim())
      .map(line => {
        try {
          const values = parseCSVLine(line);
          if (!values || values.length <= 1) return null;
          
          const messageTypeIndex = headers.indexOf("message type");
          const messageContentIndex = headers.indexOf("message content");
          const sessionIdIndex = headers.indexOf("session id");
          const messageDateIndex = headers.indexOf("message date");
          const participantIdentifierIndex = headers.indexOf("participant identifier");
          
          if (messageTypeIndex < 0 || messageContentIndex < 0 || 
              sessionIdIndex < 0 || messageDateIndex < 0 || participantIdentifierIndex < 0 ||
              messageTypeIndex >= values.length || messageContentIndex >= values.length ||
              sessionIdIndex >= values.length || messageDateIndex >= values.length || 
              participantIdentifierIndex >= values.length) {
            return null;
          }
          
          // Create a base message object with required fields
          const message: any = {
            messageType: (values[messageTypeIndex] || "").trim().replace(/"/g, ''),
            messageContent: (values[messageContentIndex] || "").trim().replace(/"/g, ''),
            sessionId: (values[sessionIdIndex] || "").trim().replace(/"/g, ''),
            messageDate: (values[messageDateIndex] || "").trim().replace(/"/g, ''),
            participantIdentifier: (values[participantIdentifierIndex] || "").trim().replace(/"/g, '')
          };
          
          // Only add additional columns if they exist and have values to reduce memory usage
          headers.forEach((header, index) => {
            if (index < values.length && header && values[index]?.trim() && 
                !["message type", "message content", "session id", "message date", "participant identifier"].includes(header)) {
              message[header] = values[index].trim().replace(/"/g, '');
            }
          });
          
          return message as ChatMessage;
        } catch (e) {
          return null;
        }
      })
      .filter((message): message is ChatMessage => message !== null);
    
    result = result.concat(batch);
  }
  
  return result;
};

const parseCSVLine = (line: string): string[] => {
  if (!line || line.trim() === "") {
    return [];
  }
  
  const values: string[] = [];
  let insideQuotes = false;
  let currentValue = "";
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue);
  
  return values;
};
