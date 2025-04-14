
import { toast } from "sonner";
import { ChatMessage, Query } from "@/pages/Index";

export const parseChatCSV = (csv: string): ChatMessage[] => {
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map(header => header.trim().toLowerCase());
  
  const requiredHeaders = ["message type", "message content", "session id", "message date"];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  
  if (missingHeaders.length > 0) {
    toast.error(`Chat CSV is missing required headers: ${missingHeaders.join(", ")}`);
    return [];
  }
  
  return parseCSVLines(lines, headers);
};

export const parseQueryCSV = (csv: string): Query[] => {
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map(header => header.trim().toLowerCase());
  
  const requiredHeaders = ["query name", "query description"];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  
  if (missingHeaders.length > 0) {
    toast.error(`Query CSV is missing required headers: ${missingHeaders.join(", ")}`);
    return [];
  }
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const queryNameIndex = headers.indexOf("query name");
      const queryDescriptionIndex = headers.indexOf("query description");
      
      return {
        queryName: values[queryNameIndex].trim().replace(/"/g, ''),
        queryDescription: values[queryDescriptionIndex].trim().replace(/"/g, '')
      };
    });
};

const parseCSVLines = (lines: string[], headers: string[]): ChatMessage[] => {
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const messageTypeIndex = headers.indexOf("message type");
      const messageContentIndex = headers.indexOf("message content");
      const sessionIdIndex = headers.indexOf("session id");
      const messageDateIndex = headers.indexOf("message date");
      
      return {
        messageType: values[messageTypeIndex].trim().replace(/"/g, ''),
        messageContent: values[messageContentIndex].trim().replace(/"/g, ''),
        sessionId: values[sessionIdIndex].trim().replace(/"/g, ''),
        messageDate: values[messageDateIndex].trim().replace(/"/g, '')
      };
    });
};

const parseCSVLine = (line: string): string[] => {
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
