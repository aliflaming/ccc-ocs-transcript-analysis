
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage, Query } from "@/pages/Index";
import { toast } from "sonner";
import { FileUpIcon, FileCheckIcon } from "lucide-react";

interface UploadStepProps {
  setChatData: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setQueryData: React.Dispatch<React.SetStateAction<Query[]>>;
  chatData: ChatMessage[];
  queryData: Query[];
}

const UploadStep = ({ setChatData, setQueryData, chatData, queryData }: UploadStepProps) => {
  const [chatFileDragging, setChatFileDragging] = useState(false);
  const [queryFileDragging, setQueryFileDragging] = useState(false);

  const parseChatCSV = (csv: string) => {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map(header => header.trim().toLowerCase());
    
    // Check if the CSV has the required headers (now case-insensitive)
    const requiredHeaders = ["message type", "message content", "session id", "message date"];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      toast.error(`Chat CSV is missing required headers: ${missingHeaders.join(", ")}`);
      return [];
    }
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      // Handle commas in quoted strings
      const values = [];
      let insideQuotes = false;
      let currentValue = "";
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue);
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue); // Don't forget the last value
      
      // Use index finding with lowercase headers
      const messageTypeIndex = headers.indexOf("message type");
      const messageContentIndex = headers.indexOf("message content");
      const sessionIdIndex = headers.indexOf("session id");
      const messageDateIndex = headers.indexOf("message date");
      
      result.push({
        messageType: values[messageTypeIndex].trim().replace(/"/g, ''),
        messageContent: values[messageContentIndex].trim().replace(/"/g, ''),
        sessionId: values[sessionIdIndex].trim().replace(/"/g, ''),
        messageDate: values[messageDateIndex].trim().replace(/"/g, '')
      });
    }
    
    return result;
  };

  const parseQueryCSV = (csv: string) => {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map(header => header.trim());
    
    // Check if the CSV has the required headers
    const requiredHeaders = ["Query name", "Query description"];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      toast.error(`Query CSV is missing required headers: ${missingHeaders.join(", ")}`);
      return [];
    }
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      // Handle commas in quoted strings
      const values = [];
      let insideQuotes = false;
      let currentValue = "";
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue);
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue); // Don't forget the last value
      
      const queryNameIndex = headers.indexOf("Query name");
      const queryDescriptionIndex = headers.indexOf("Query description");
      
      result.push({
        queryName: values[queryNameIndex].trim().replace(/"/g, ''),
        queryDescription: values[queryDescriptionIndex].trim().replace(/"/g, '')
      });
    }
    
    return result;
  };

  const handleChatFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const parsed = parseChatCSV(csvText);
        if (parsed.length > 0) {
          setChatData(parsed);
          toast.success(`Chat data loaded: ${parsed.length} messages from ${new Set(parsed.map(d => d.sessionId)).size} sessions`);
        }
      } catch (error) {
        console.error("Error parsing chat CSV:", error);
        toast.error("Failed to parse chat CSV file");
      }
    };
    reader.readAsText(file);
  }, [setChatData]);

  const handleQueryFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const parsed = parseQueryCSV(csvText);
        if (parsed.length > 0) {
          setQueryData(parsed);
          toast.success(`Query data loaded: ${parsed.length} queries`);
        }
      } catch (error) {
        console.error("Error parsing query CSV:", error);
        toast.error("Failed to parse query CSV file");
      }
    };
    reader.readAsText(file);
  }, [setQueryData]);

  const handleChatDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setChatFileDragging(true);
  }, []);

  const handleChatDragLeave = useCallback(() => {
    setChatFileDragging(false);
  }, []);

  const handleChatDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setChatFileDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const parsed = parseChatCSV(csvText);
        if (parsed.length > 0) {
          setChatData(parsed);
          toast.success(`Chat data loaded: ${parsed.length} messages from ${new Set(parsed.map(d => d.sessionId)).size} sessions`);
        }
      } catch (error) {
        console.error("Error parsing chat CSV:", error);
        toast.error("Failed to parse chat CSV file");
      }
    };
    reader.readAsText(file);
  }, [setChatData]);

  const handleQueryDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setQueryFileDragging(true);
  }, []);

  const handleQueryDragLeave = useCallback(() => {
    setQueryFileDragging(false);
  }, []);

  const handleQueryDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setQueryFileDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const parsed = parseQueryCSV(csvText);
        if (parsed.length > 0) {
          setQueryData(parsed);
          toast.success(`Query data loaded: ${parsed.length} queries`);
        }
      } catch (error) {
        console.error("Error parsing query CSV:", error);
        toast.error("Failed to parse query CSV file");
      }
    };
    reader.readAsText(file);
  }, [setQueryData]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Chat Transcript CSV</CardTitle>
          <CardDescription>
            Upload a CSV file containing chat transcript data with Message Type, Message Content, Session ID, and Message date columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              chatFileDragging ? 'border-blue-500 bg-blue-50' : chatData.length > 0 ? 'border-green-500 bg-green-50' : 'border-gray-300'
            } transition-colors duration-200 cursor-pointer`}
            onDragOver={handleChatDragOver}
            onDragLeave={handleChatDragLeave}
            onDrop={handleChatDrop}
            onClick={() => document.getElementById("chat-file-upload")?.click()}
          >
            {chatData.length > 0 ? (
              <div className="flex flex-col items-center text-green-600">
                <FileCheckIcon className="w-12 h-12 mb-2" />
                <p className="font-medium">
                  {chatData.length} messages from {new Set(chatData.map(d => d.sessionId)).size} sessions loaded
                </p>
                <p className="text-sm mt-2">Click or drag to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <FileUpIcon className="w-12 h-12 mb-2" />
                <p className="font-medium">Click to browse or drag and drop</p>
                <p className="text-sm mt-2">.CSV files only</p>
              </div>
            )}
            <input
              id="chat-file-upload"
              type="file"
              accept=".csv"
              onChange={handleChatFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Query Definition CSV</CardTitle>
          <CardDescription>
            Upload a CSV file defining the queries to run on the chat data with Query name and Query description columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              queryFileDragging ? 'border-blue-500 bg-blue-50' : queryData.length > 0 ? 'border-green-500 bg-green-50' : 'border-gray-300'
            } transition-colors duration-200 cursor-pointer`}
            onDragOver={handleQueryDragOver}
            onDragLeave={handleQueryDragLeave}
            onDrop={handleQueryDrop}
            onClick={() => document.getElementById("query-file-upload")?.click()}
          >
            {queryData.length > 0 ? (
              <div className="flex flex-col items-center text-green-600">
                <FileCheckIcon className="w-12 h-12 mb-2" />
                <p className="font-medium">{queryData.length} queries loaded</p>
                <p className="text-sm mt-2">Click or drag to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <FileUpIcon className="w-12 h-12 mb-2" />
                <p className="font-medium">Click to browse or drag and drop</p>
                <p className="text-sm mt-2">.CSV files only</p>
              </div>
            )}
            <input
              id="query-file-upload"
              type="file"
              accept=".csv"
              onChange={handleQueryFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadStep;
