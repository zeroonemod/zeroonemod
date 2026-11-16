interface WordmarkProps {
  className?: string;
}

/** The ZEROONEMOD logo exactly as supplied. Never replace it with text or an icon. */
export function Wordmark({ className = 'h-6' }: WordmarkProps) {
  return (
    <img
      src="/logo.png"
      alt="ZEROONEMOD"
      width={399}
      height={51}
      decoding="async"
      draggable={false}
      className={`${className} w-auto select-none self-start`}
    />
  );
}
