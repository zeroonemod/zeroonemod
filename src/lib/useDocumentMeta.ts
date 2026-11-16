import { useEffect } from 'react';

interface DocumentMeta {
  title: string;
  description: string;
}

export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    document.title = title;
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (tag) tag.content = description;
  }, [title, description]);
}
