import { useEffect, useRef } from "react";
import type { QuestionPublic } from "@shared/game-state";

interface Props {
  media: QuestionPublic["media"];
  packId?: string;
}

// Resolves a pack media src into a URL (relative to /media/{packId}/...).
function mediaUrl(src: string, packId?: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  if (packId) return `/media/${packId}/${src}`;
  return `/media/${src}`;
}

export function MediaPlayer({ media, packId }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (media?.type === "audio" && audioRef.current) {
      // Auto-play once on mount; ignore promise rejection (autoplay policies).
      audioRef.current.play().catch(() => {});
    }
  }, [media?.src, media?.type]);

  if (!media) return null;
  const url = mediaUrl(media.src, packId);
  if (media.type === "image") {
    return (
      <img
        src={url}
        alt=""
        className="max-h-72 max-w-full mx-auto rounded shadow-lg shadow-pink-500/30"
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
    );
  }
  return (
    <audio
      ref={audioRef}
      src={url}
      controls
      className="w-full max-w-md mx-auto"
      onError={(e) => ((e.target as HTMLAudioElement).style.display = "none")}
    />
  );
}
