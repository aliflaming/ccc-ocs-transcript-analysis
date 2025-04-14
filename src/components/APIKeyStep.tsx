
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon, KeyIcon } from "lucide-react";

interface APIKeyStepProps {
  apiKey: string;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
}

const APIKeyStep = ({ apiKey, setApiKey }: APIKeyStepProps) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OpenAI API Key</CardTitle>
          <CardDescription>
            Enter your OpenAI API key to process the queries. Your key is only used for processing and is not stored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <KeyIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOffIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              <p>This API key will be used to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Process each query against your chat transcript data</li>
                <li>Generate insights for each session based on your query definitions</li>
                <li>Your API key is never stored permanently</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIKeyStep;
