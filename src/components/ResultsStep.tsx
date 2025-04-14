
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionResult } from "@/pages/Index";
import { Download, Search } from "lucide-react";

interface ResultsStepProps {
  results: SessionResult[];
}

const ResultsStep = ({ results }: ResultsStepProps) => {
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="space-y-6">
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
                    <TableRow key={result.sessionId || i}>
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
    </div>
  );
};

export default ResultsStep;
