/** Parse the video ID out of any YouTube URL format. */
export function parseYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,15})/) ??
    (/^[\w-]{6,15}$/.test(url.trim()) ? [null, url.trim()] : null);
  return m?.[1] ?? null;
}

export function youtubeThumbnail(url: string | null | undefined): string | null {
  const id = parseYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = parseYoutubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
}

/** Display thumbnail for any portfolio item — respects uploaded image, YouTube, then direct video. */
export function portfolioItemThumbnail(item: {
  image?: string | null;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
}): string | null {
  if (item.image) return item.image;
  if (item.youtubeUrl) return youtubeThumbnail(item.youtubeUrl);
  return null; // raw videoUrl items render a <video> element, no thumb needed
}

export function isVideoItem(item: { videoUrl?: string | null; youtubeUrl?: string | null }): boolean {
  return Boolean(item.videoUrl ?? item.youtubeUrl);
}
