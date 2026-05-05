interface Props {
  className?: string;
}

// Diagonal highlight bar that sweeps across a parent container. Place inside
// a `relative overflow-hidden` element; the parent's contents stay above.
export function ScanSweep({ className = "" }: Props) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div className="scan-sweep-bar animate-scan-sweep" />
    </div>
  );
}
