import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SubmissionFilesValue {
  files: File[];
  addFiles: (incoming: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
}

const SubmissionFilesContext = createContext<SubmissionFilesValue | null>(null);

export function SubmissionFilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((current) => [...current, ...incoming]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  const value = useMemo(
    () => ({ files, addFiles, removeFile, clearFiles }),
    [files, addFiles, removeFile, clearFiles],
  );

  return <SubmissionFilesContext.Provider value={value}>{children}</SubmissionFilesContext.Provider>;
}

export function useSubmissionFiles(): SubmissionFilesValue {
  const context = useContext(SubmissionFilesContext);
  if (!context) throw new Error('useSubmissionFiles must be used inside SubmissionFilesProvider');
  return context;
}
