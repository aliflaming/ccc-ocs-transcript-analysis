
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadStep from "@/components/UploadStep";
import APIKeyStep from "@/components/APIKeyStep";
import ResultsStep from "@/components/ResultsStep";
import { toast } from "sonner";

export interface ChatMessage {
  messageType: string;
  messageContent: string;
  sessionId: string;
  messageDate: string;
}

export interface Query {
  queryName: string;
  queryDescription: string;
}

export interface SessionResult {
  sessionId: string;
  [key: string]: any;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [apiKey, setApiKey] = useState("");
  const [chatData, setChatData] = useState<ChatMessage[]>([]);
  const [queryData, setQueryData] = useState<Query[]>([]);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processData = async () => {
    if (!chatData.length || !queryData.length || !apiKey) {
      toast.error("Please provide all required inputs before processing");
      return;
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
      const sessionResults: SessionResult[] = Object.keys(sessionGroups).map(sessionId => ({
        sessionId
      }));

      // Process each query using OpenAI
      const processedResults = await Promise.all(
        sessionResults.map(async (sessionResult) => {
          const sessionId = sessionResult.sessionId;
          const sessionMessages = sessionGroups[sessionId];
          
          // Format the conversation for the prompt
          const conversationText = sessionMessages
            .map(msg => `${msg.messageType}: ${msg.messageContent}`)
            .join("\n");

          // Process each query for this session
          for (const query of queryData) {
            try {
              // Prepare the API call
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
                      content: `You are an assistant that analyzes chat transcripts. Your task is to answer the following query about a chat transcript: "${query.queryDescription}". Provide a concise response that can be used in a table. If the query asks for a numeric value, just return the number without any text. If it asks for a category or text, provide a very brief response (1-5 words maximum).`
                    },
                    {
                      role: "user",
                      content: `Based on the following chat transcript, answer the query "${query.queryDescription}":\n\n${conversationText}`
                    }
                  ],
                  temperature: 0.1,
                  max_tokens: 100,
                }),
              });

              if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
              }

              const result = await response.json();
              const queryResult = result.choices[0].message.content.trim();
              
              // Add the query result to the session result
              sessionResult[query.queryName] = queryResult;
            } catch (error) {
              console.error(`Error processing query "${query.queryName}" for session ${sessionId}:`, error);
              sessionResult[query.queryName] = "Error processing query";
            }
          }

          return sessionResult;
        })
      );

      setResults(processedResults);
      setActiveTab("results");
      toast.success("Data processing complete!");
    } catch (error) {
      console.error("Error processing data:", error);
      toast.error("Error processing data. Check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (activeTab === "upload" && (chatData.length === 0 || queryData.length === 0)) {
      toast.error("Please upload both required CSV files");
      return;
    }
    
    if (activeTab === "upload") {
      setActiveTab("apikey");
    } else if (activeTab === "apikey") {
      if (!apiKey) {
        toast.error("Please enter an OpenAI API key");
        return;
      }
      processData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container py-8 px-4 mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Chat Transcript Insights</h1>
          <p className="text-gray-600">Analyze conversation data with custom queries</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="upload">1. Upload Files</TabsTrigger>
              <TabsTrigger value="apikey">2. API Key</TabsTrigger>
              <TabsTrigger value="results" disabled={results.length === 0}>
                3. Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <UploadStep 
                setChatData={setChatData} 
                setQueryData={setQueryData}
                chatData={chatData}
                queryData={queryData}
              />
            </TabsContent>

            <TabsContent value="apikey">
              <APIKeyStep apiKey={apiKey} setApiKey={setApiKey} />
            </TabsContent>

            <TabsContent value="results">
              <ResultsStep results={results} />
            </TabsContent>

            {activeTab !== "results" && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleNext}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    activeTab === "upload" ? "Next" : "Process Data"
                  )}
                </button>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
