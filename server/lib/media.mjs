import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ffmpeg-static ships a binary per platform; unavailable in some restricted envs
let ffmpegPath = null;
try {
  ({ default: ffmpegPath } = await import('ffmpeg-static'));
} catch {
  ffmpegPath = process.env.FFMPEG_PATH ?? null;
}

/** sharp resize limits */
const IMAGE_MAX_DIMENSION = 1920;
const IMAGE_QUALITY = 80;
const THUMB_WIDTH = 480;
const THUMB_QUALITY = 75;

// ── Images ───────────────────────────────────────────────────────────────────

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function isImageMime(mimetype) {
  return IMAGE_MIMES.has(mimetype);
}

export function isVideoMime(mimetype) {
  return mimetype === 'video/mp4' || mimetype === 'video/webm';
}

/**
 * Resize/compress an image upload into optimized `.webp` + small thumb.
 * Returns relative URLs (under /uploads).
 */
export async function processImageUpload(absolutePath, originalName, uploadsDir) {
  const base = path.basename(absolutePath, path.extname(absolutePath));
  const optimizedName = `${base}-optimized.webp`;
  const thumbName = `${base}-thumb.webp`;
  const optimizedPath = path.join(uploadsDir, optimizedName);
  const thumbPath = path.join(uploadsDir, thumbName);

  try {
    await sharp(absolutePath)
      .rotate() // auto-rotate based on EXIF
      .resize({
        width: IMAGE_MAX_DIMENSION,
        height: IMAGE_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_QUALITY })
      .toFile(optimizedPath);

    await sharp(absolutePath)
      .resize({ width: THUMB_WIDTH })
      .webp({ quality: THUMB_QUALITY })
      .toFile(thumbPath);

    fs.unlinkSync(absolutePath);

    return {
      url: `/uploads/${optimizedName}`,
      thumbUrl: `/uploads/${thumbName}`,
      mime: 'image/webp',
    };
  } catch (err) {
    console.warn(`[media] sharp failed for ${originalName}:`, err.message);
    const fallbackName = `${base}.webp`;
    try {
      await sharp(absolutePath).webp({ quality: 85 }).toFile(path.join(uploadsDir, fallbackName));
      fs.unlinkSync(absolutePath);
      return { url: `/uploads/${fallbackName}`, thumbUrl: null, mime: 'image/webp' };
    } catch (fallbackError) {
      try { fs.unlinkSync(absolutePath); } catch { /* already removed */ }
      throw new Error(`Invalid image: ${fallbackError.message}`);
    }
  }
}

// ── Videos ───────────────────────────────────────────────────────────────────

function runFfmpeg(args) {
  if (!ffmpegPath) return Promise.reject(new Error('ffmpeg not available'));
  return execFileAsync(ffmpegPath, args, { timeout: 60_000 });
}

/** Synchronously grab ffmpeg binary version for probing. */
export async function ffmpegAvailable() {
  if (!ffmpegPath) return false;
  try {
    await execFileAsync(ffmpegPath, ['-version'], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract a JPEG poster frame from the video and transcode to WebM (VP9).
 * Best-effort — failures are caught so the original MP4 upload still succeeds.
 */
export async function processVideoUpload(absolutePath, _originalName, uploadsDir) {
  const base = path.basename(absolutePath, path.extname(absolutePath));
  const posterName = `${base}-poster.jpg`;
  const webmName = `${base}.webm`;
  const posterPath = path.join(uploadsDir, posterName);
  const webmPath = path.join(uploadsDir, webmName);

  const result = {
    url: `/uploads/${path.basename(absolutePath)}`,
    posterUrl: null,
    webmUrl: null,
  };

  if (!(await ffmpegAvailable())) return result;

  try {
    await runFfmpeg([
      '-y', '-i', absolutePath,
      '-frames:v', '1', '-q:v', '3',
      '-vf', 'scale=640:-2',
      posterPath,
    ]);
    if (fs.existsSync(posterPath)) result.posterUrl = `/uploads/${posterName}`;
  } catch (err) {
    console.warn('[media] poster generation failed:', err.message);
  }

  try {
    const DUR_LIMIT_S = 5 * 60;
    const args = [
      '-y', '-i', absolutePath,
      '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0',
      '-c:a', 'libopus',
      '-vf', "scale='min(1280,iw)':-2",
      '-t', String(DUR_LIMIT_S),
      webmPath,
    ];
    await runFfmpeg(args);
    if (fs.existsSync(webmPath)) result.webmUrl = `/uploads/${webmName}`;
  } catch (err) {
    console.warn('[media] webm transcode failed:', err.message);
  }

  return result;
}
