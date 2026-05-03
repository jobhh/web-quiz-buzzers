import type { ButtonHTMLAttributes } from "react";

type Variant = "pink" | "cyan" | "gold";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const VARIANT_BG: Record<Variant, string> = {
  pink: "bg-neon-pink hover:bg-pink-400",
  cyan: "bg-neon-cyan hover:bg-cyan-300",
  gold: "bg-neon-gold hover:bg-yellow-300",
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-5 py-2 text-base",
  lg: "px-7 py-3 text-xl",
};

export function NeonButton({
  variant = "pink",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`${VARIANT_BG[variant]} ${SIZE[size]} text-black font-display tracking-widest uppercase rounded shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
