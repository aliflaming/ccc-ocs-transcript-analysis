
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ChatMessage, Query } from "@/pages/Index";
import { parseChatCSV, parseQueryCSV } from "@/utils/csvParser";

interface UseFileUploadProps {
  setChatData: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setQueryData: React.Dispatch<React.SetStateAction<Query[]>>;
}

export const useFileUpload = ({ setChatData, setQueryData }: UseFileUploadProps) => {
  const [chatFileDragging, setChatFileDragging] = useState(false);
  const [queryFileDragging, setQueryFileDragging] = useState(false);

  const handleChatFileUpload = useCallback((file: File) => {
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

  const handleQueryFileUpload = useCallback((file: File) => {
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

  return {
    chatFileDragging,
    queryFileDragging,
    setChatFileDragging,
    setQueryFileDragging,
    handleChatFileUpload,
    handleQueryFileUpload
  };
};
