
import { ChatMessage, Query } from "@/pages/Index";
import { useFileUpload } from "@/hooks/useFileUpload";
import FileUploadCard from "./FileUploadCard";

interface UploadStepProps {
  setChatData: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setQueryData: React.Dispatch<React.SetStateAction<Query[]>>;
  chatData: ChatMessage[];
  queryData: Query[];
}

const UploadStep = ({ setChatData, setQueryData, chatData, queryData }: UploadStepProps) => {
  const {
    chatFileDragging,
    queryFileDragging,
    setChatFileDragging,
    setQueryFileDragging,
    handleChatFileUpload,
    handleQueryFileUpload
  } = useFileUpload({ setChatData, setQueryData });

  return (
    <div className="space-y-6">
      <FileUploadCard
        title="Upload Chat Transcript CSV"
        description="Upload a CSV file containing chat transcript data with Message Type, Message Content, Session ID, and Message date columns."
        isDragging={chatFileDragging}
        hasData={chatData.length > 0}
        dataLoadedMessage={`${chatData.length} messages from ${new Set(chatData.map(d => d.sessionId)).size} sessions loaded`}
        onDragOver={(e) => {
          e.preventDefault();
          setChatFileDragging(true);
        }}
        onDragLeave={() => setChatFileDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setChatFileDragging(false);
          handleChatFileUpload(e.dataTransfer.files[0]);
        }}
        onFileChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleChatFileUpload(file);
        }}
        inputId="chat-file-upload"
      />

      <FileUploadCard
        title="Upload Query Definition CSV"
        description="Upload a CSV file defining the queries to run on the chat data with Query name and Query description columns."
        isDragging={queryFileDragging}
        hasData={queryData.length > 0}
        dataLoadedMessage={`${queryData.length} queries loaded`}
        onDragOver={(e) => {
          e.preventDefault();
          setQueryFileDragging(true);
        }}
        onDragLeave={() => setQueryFileDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setQueryFileDragging(false);
          handleQueryFileUpload(e.dataTransfer.files[0]);
        }}
        onFileChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleQueryFileUpload(file);
        }}
        inputId="query-file-upload"
      />
    </div>
  );
};

export default UploadStep;
