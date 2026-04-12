type Props = {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
};

export default function SectionTitle({ children, dark = false, className = '' }: Props) {
  const textColor = dark ? 'text-yellow-400' : 'text-gray-900';
  const lineColor = 'linear-gradient(90deg, transparent, #D4A017, transparent)';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex items-center gap-4 w-full justify-center">
        <div className="h-px flex-1 max-w-24" style={{ background: lineColor }} />
        <span className="text-yellow-400 text-xs">←</span>
        <h2 className={`font-display text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase ${textColor}`}>
          {children}
        </h2>
        <span className="text-yellow-400 text-xs">→</span>
        <div className="h-px flex-1 max-w-24" style={{ background: lineColor }} />
      </div>
    </div>
  );
}
