interface WordmarkProps {
  className?: string;
}

export function Wordmark({ className = 'h-6' }: WordmarkProps) {
  return (
    <img
      src="/WhatsApp_Image_2026-11-11_at_5.40.22_PM-removebg-preview.png"
      alt="ZEROONEMOD"
      width={96}
      height={24}
      decoding="async"
      className={`${className} w-auto select-none self-start`}
    />
  );
}
