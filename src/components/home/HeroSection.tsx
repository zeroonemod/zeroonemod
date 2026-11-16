import { ButtonLink, buttonClasses } from '@/components/ui/Button';
import { UploadCard } from '@/components/home/UploadCard';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-500/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-5 pb-16 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-28">
        <h1 className="text-4xl font-bold leading-[1.2] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Engineering-led ECU &amp; TCU File Services.
        </h1>

        <p className="max-w-2xl text-base leading-[1.5] text-neutral-400 sm:text-lg">
          Professional remote ECU and TCU file editing, handled individually by an engineering team. Send us your
          original file, we review it against your vehicle, and you receive the completed file through a secure
          download link.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <ButtonLink to="/submit" size="lg" className="w-full sm:w-auto">
            Submit a file
          </ButtonLink>
          <a href="#services" className={buttonClasses('secondary', 'lg', 'w-full sm:w-auto')}>
            Explore our services
          </a>
        </div>

        <div id="upload" className="mt-8 flex w-full justify-center scroll-mt-24">
          <UploadCard />
        </div>
      </div>
    </section>
  );
}
