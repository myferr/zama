import { useState } from "preact/hooks";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ThinkingProps {
  content: string;
}

export default function Thinking({ content }: ThinkingProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 p-2 border rounded-lg bg-gray-100 dark:bg-gray-800">
      <div
        className="flex items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 mr-2" />
        ) : (
          <ChevronRight className="w-4 h-4 mr-2" />
        )}
        <span className="font-semibold animate-pulse">Thinking...</span>
      </div>
      {isOpen && (
        <div className="mt-2 p-2 border-t">
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
        </div>
      )}
    </div>
  );
}
