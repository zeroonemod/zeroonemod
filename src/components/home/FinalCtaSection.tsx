import { ButtonLink } from '@/components/ui/Button';

export function FinalCtaSection() {
  return (
    <section className="border-t border-white/[0.06] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-5 text-center sm:px-8">
        <h2 className="text-3xl font-bold leading-[1.2] sm:text-4xl">Ready to submit your file?</h2>
        <p className="max-w-xl text-base leading-[1.5] text-neutral-400">
          Start the guided form, add your original file and we will take it from there.
        </p>
        <ButtonLink to="/submit" size="lg">
          Submit a file
        </ButtonLink>
      </div>
    </section>
  );
}
