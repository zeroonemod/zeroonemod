import { useState } from 'react';
import logoUrl from '@/assets/logo.png';

interface WordmarkProps {
  className?: string;
}

/**
 * The ZEROONEMOD logo exactly as supplied. Never replaced with text or an icon:
 * if the image cannot load, an empty space of the same size is kept instead of
 * the browser's broken-image icon or alt text.
 */
export function Wordmark({ className = 'h-6' }: WordmarkProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span role="img" aria-label="ZEROONEMOD" className={`${className} inline-block aspect-[399/51] shrink-0 self-start`} />;
  }

  return (
    <img
      src={logoUrl}
      alt="ZEROONEMOD"
      width={399}
      height={51}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} w-auto shrink-0 select-none self-start object-contain`}
    />
  );
}
