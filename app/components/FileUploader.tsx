import { useCallback, useRef, useState } from "react";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File size must be under 20 MB.");
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleRemove = () => {
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);

    // Reset the hidden input so the same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // -- Drag events ----------------------------------------------------------
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelect(file);
  };

  // -- Click-to-browse ------------------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // -- Render: selected file ------------------------------------------------
  if (selectedFile) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="uploader-selected-file">
          <div className="flex items-center gap-3">
            <img
              src="/images/pdf.png"
              alt="PDF icon"
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col">
              <p className="text-sm font-medium truncate max-w-[240px]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-dark-200">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
            aria-label="Remove file"
          >
            <img src="/icons/cross.svg" alt="Remove" className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // -- Render: drag-and-drop zone -------------------------------------------
  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        className={`uplader-drag-area flex flex-col items-center justify-center gap-4 ${
          isDragging ? "gradient-hover ring-2 ring-blue-300" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
      >
        <img
          src="/images/pdf.png"
          alt="Upload PDF"
          className="w-14 h-14 object-contain opacity-70"
        />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium">
            <span className="text-blue-600 underline">Click to upload</span>
            {" "}or drag and drop
          </p>
          <p className="text-xs text-dark-200">PDF only · max 20 MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <img src="/icons/warning.svg" alt="Error" className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
