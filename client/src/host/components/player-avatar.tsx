import type { Player } from "@shared/game-state";

const PALETTE = [
  "from-pink-400 to-pink-600",
  "from-cyan-300 to-cyan-500",
  "from-yellow-300 to-yellow-500",
  "from-green-400 to-green-600",
  "from-orange-400 to-orange-600",
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-red-400 to-red-600",
];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

interface Props {
  player: Player;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
}

export function PlayerAvatar({ player, size = "md", highlight = false }: Props) {
  const initials = player.name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "?";
  const sizeClasses =
    size === "lg"
      ? "w-32 h-32 text-5xl"
      : size === "sm"
      ? "w-9 h-9 text-xs"
      : "w-14 h-14 text-lg";
  return (
    <div
      className={`relative ${sizeClasses} rounded-full font-display text-black ring-offset-2 ring-offset-black ${
        highlight ? "ring-4 ring-neon-pink shadow-neon" : "ring-2 ring-black/40"
      }`}
      title={player.name}
    >
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${colorFor(
          player.id,
        )} flex items-center justify-center font-black tracking-tight`}
      >
        {initials}
      </div>
      {highlight && (
        <div className="absolute inset-0 rounded-full pointer-events-none animate-glow-pulse" />
      )}
    </div>
  );
}
