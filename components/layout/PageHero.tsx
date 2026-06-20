type PageHeroProps = {
  title: string;
  /** Texte additionnel masqué visuellement mais lu par les moteurs de recherche. */
  srTitle?: string;
  backgroundImage?: string;
};

export default function PageHero({ title, srTitle, backgroundImage }: PageHeroProps) {
  const bg = backgroundImage || 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1600&q=80';

  return (
    <div className="relative h-52 md:h-64 overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.5), rgba(10,10,10,0.75))' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center gap-3 pt-20">
        {/* Top star */}
        <div className="text-yellow-400 text-xs tracking-[0.3em]">★</div>
        {/* Gold line */}
        <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #D4A017, transparent)' }} />

        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[0.25em] uppercase text-white">
          {title}
          {srTitle && <span className="sr-only"> {srTitle}</span>}
        </h1>

        {/* Bottom decoration */}
        <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #D4A017, transparent)' }} />
        <div className="text-yellow-400 text-xs tracking-[0.3em]">★</div>
      </div>
    </div>
  );
}
