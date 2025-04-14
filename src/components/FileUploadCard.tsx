
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpIcon, FileCheckIcon } from "lucide-react";

interface FileUploadCardProps {
  title: string;
  description: string;
  isDragging: boolean;
  hasData: boolean;
  dataLoadedMessage?: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputId: string;
}

const FileUploadCard = ({
  title,
  description,
  isDragging,
  hasData,
  dataLoadedMessage,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  inputId
}: FileUploadCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : hasData ? 'border-green-500 bg-green-50' : 'border-gray-300'
          } transition-colors duration-200 cursor-pointer`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {hasData ? (
            <div className="flex flex-col items-center text-green-600">
              <FileCheckIcon className="w-12 h-12 mb-2" />
              <p className="font-medium">{dataLoadedMessage}</p>
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
            id={inputId}
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadCard;
