
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionResult, TranslationData } from "@/pages/Index";
import { Download, Search, Language } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResultsStepProps {
  results: SessionResult[];
  translationData?: TranslationData;
}

const ResultsStep = ({ results, translationData = {} }: ResultsStepProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("results");
  
  const hasTranslations = Object.keys(translationData).length > 0;

  if (!results.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No results available. Please process your data first.</p>
      </div>
    );
  }

  // Get all unique keys except sessionId for table headers
  const allKeys = Array.from(
    new Set(
      results.flatMap(result => Object.keys(result)).filter(key => key !== "sessionId")
    )
  );

  // Filter results based on search term
  const filteredResults = results.filter(result => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in session ID
    if (result.sessionId.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in all other fields
    return Object.entries(result).some(([key, value]) => {
      if (key === "sessionId") return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  const downloadCsv = () => {
    // Create CSV header
    const headers = ["Session ID", ...allKeys];
    const csvContent = [
      headers.join(","),
      ...filteredResults.map(result => {
        return [
          `"${result.sessionId}"`,
          ...allKeys.map(key => {
            const value = result[key] || "";
            // Wrap in quotes and escape any quotes in the content
            return `"${String(value).replace(/"/g, '""')}"`;
          })
        ].join(",");
      })
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "chat_analysis_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTranslationsCsv = () => {
    if (!hasTranslations) return;

    const headers = ["Session ID", "Message Date", "Participant", "Original Content", "Translated Content"];
    
    // Flatten translations into rows
    const rows: string[][] = [];
    
    Object.entries(translationData).forEach(([sessionId, data]) => {
      data.translatedMessages.forEach((message, index) => {
        const originalMessage = data.originalMessages[index] || message;
        rows.push([
          sessionId,
          message.messageDate || "",
          message.participantIdentifier || "",
          originalMessage.messageContent || "",
          message.translatedContent || ""
        ]);
      });
    });
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => {
        return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
      })
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "translations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sessionsWithTranslations = Object.keys(translationData).length;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="results">Analysis Results</TabsTrigger>
          {hasTranslations && (
            <TabsTrigger value="translations">
              <Language className="h-4 w-4 mr-1" />
              Translations ({sessionsWithTranslations})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Analysis Results</CardTitle>
                  <CardDescription>
                    Query results for {results.length} chat sessions
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Search results..."
                      className="pl-8 w-full md:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={downloadCsv}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-3 py-2 text-sm font-medium flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead className="font-semibold w-32">Session ID</TableHead>
                      {allKeys.map(key => (
                        <TableHead key={key} className="font-semibold">
                          {key}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result, i) => (
                        <TableRow key={result.sessionId || i} className={translationData[result.sessionId] ? "bg-blue-50" : ""}>
                          <TableCell className="font-medium">{result.sessionId}</TableCell>
                          {allKeys.map(key => (
                            <TableCell key={key}>
                              {result[key] !== undefined ? String(result[key]) : "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={allKeys.length + 1} className="h-24 text-center">
                          No results match your search
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {hasTranslations && (
          <TabsContent value="translations">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Message Translations</CardTitle>
                    <CardDescription>
                      Translations for messages in non-English languages
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={downloadTranslationsCsv}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-3 py-2 text-sm font-medium flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export Translations
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                      <TableRow>
                        <TableHead className="font-semibold">Session ID</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Participant</TableHead>
                        <TableHead className="font-semibold">Original Message</TableHead>
                        <TableHead className="font-semibold">English Translation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(translationData).length > 0 ? (
                        Object.entries(translationData).flatMap(([sessionId, data]) => 
                          data.translatedMessages.map((message, index) => {
                            const originalMessage = data.originalMessages[index] || message;
                            // Skip if the message is the same (already English)
                            const isTranslated = message.translatedContent !== originalMessage.messageContent;
                            
                            return (
                              <TableRow key={`${sessionId}-${index}`} className={isTranslated ? "bg-blue-50" : ""}>
                                <TableCell>{sessionId}</TableCell>
                                <TableCell>{message.messageDate}</TableCell>
                                <TableCell>{message.participantIdentifier}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{originalMessage.messageContent}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {message.translatedContent || originalMessage.messageContent}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No translations available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ResultsStep;
