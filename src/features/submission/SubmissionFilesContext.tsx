import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export const MAX_HARDWARE_PHOTOS = 5;

interface SubmissionFilesValue {
  /** Original ECU/TCU files. */
  files: File[];
  addFiles: (incoming: File[]) => void;
  removeFile: (index: number) => void;
  /** Optional photos of the ECU/TCU label. */
  photos: File[];
  addPhotos: (incoming: File[]) => void;
  removePhoto: (index: number) => void;
  clearFiles: () => void;
}

const SubmissionFilesContext = createContext<SubmissionFilesValue | null>(null);

/** Keeps the selected files on the device until the submission is sent. */
export function SubmissionFilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  const addFiles = useCallback((incoming: File[]) => setFiles((current) => [...current, ...incoming]), []);
  const removeFile = useCallback((index: number) => setFiles((current) => current.filter((_, i) => i !== index)), []);
  const addPhotos = useCallback(
    (incoming: File[]) => setPhotos((current) => [...current, ...incoming.filter((f) => f.type.startsWith('image/'))].slice(0, MAX_HARDWARE_PHOTOS)),
    [],
  );
  const removePhoto = useCallback((index: number) => setPhotos((current) => current.filter((_, i) => i !== index)), []);
  const clearFiles = useCallback(() => {
    setFiles([]);
    setPhotos([]);
  }, []);

  const value = useMemo(
    () => ({ files, addFiles, removeFile, photos, addPhotos, removePhoto, clearFiles }),
    [files, addFiles, removeFile, photos, addPhotos, removePhoto, clearFiles],
  );

  return <SubmissionFilesContext.Provider value={value}>{children}</SubmissionFilesContext.Provider>;
}

export function useSubmissionFiles(): SubmissionFilesValue {
  const context = useContext(SubmissionFilesContext);
  if (!context) throw new Error('useSubmissionFiles must be used inside SubmissionFilesProvider');
  return context;
}
