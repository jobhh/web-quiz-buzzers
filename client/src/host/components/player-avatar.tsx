import type { Player } from "@shared/game-state";

// Picks a stable color per playerId. Cheap hash → palette index.
const PALETTE = [
  "bg-pink-500",
  "bg-cyan-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-orange-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-red-400",
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
      ? "w-24 h-24 text-3xl"
      : size === "sm"
      ? "w-8 h-8 text-xs"
      : "w-12 h-12 text-base";
  return (
    <div
      className={`${sizeClasses} ${colorFor(
        player.id,
      )} rounded-full flex items-center justify-center font-black text-black ring-offset-2 ring-offset-black ${
        highlight ? "ring-4 ring-pink-400 animate-pulse" : ""
      }`}
      title={player.name}
    >
      {initials}
    </div>
  );
}
