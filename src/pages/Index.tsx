import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadStep from "@/components/UploadStep";
import APIKeyStep from "@/components/APIKeyStep";
import ResultsStep from "@/components/ResultsStep";
import { toast } from "sonner";
import { useOpenAI } from "@/hooks/useOpenAI";

export interface ChatMessage {
  messageType: string;
  messageContent: string;
  sessionId: string;
  messageDate: string;
}

export interface Query {
  queryName: string;
  queryDescription: string;
  outputFormat: string;
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
  
  const { isProcessing, processData } = useOpenAI({ apiKey });

  const handleNext = async () => {
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
      const processedResults = await processData(chatData, queryData);
      if (processedResults) {
        setResults(processedResults);
        setActiveTab("results");
      }
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
