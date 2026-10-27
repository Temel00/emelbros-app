export const PHOTO_MAX_WIDTH = 1080;
export const PHOTO_MAX_HEIGHT = 1920;
export const PHOTO_QUALITY = 0.8;
export const BLUR_SIZE = 16;
export const BLUR_QUALITY = 0.5;

/**
 * Scales `width` x `height` down to fit within `maxWidth` x `maxHeight`,
 * keeping the aspect ratio. Never upscales; dimensions are whole pixels >= 1.
 */
export function fitWithin(
  width: number,
  height: number,
  maxWidth = PHOTO_MAX_WIDTH,
  maxHeight = PHOTO_MAX_HEIGHT,
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type ResizedPhoto = { blob: Blob; blurDataUrl: string };

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the photo")),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Decodes a picked image (EXIF orientation applied by `createImageBitmap`),
 * re-encodes it as a JPEG fitting 1080x1920 (which also drops EXIF/GPS), and
 * builds a tiny JPEG data URL for the `next/image` blur placeholder.
 */
export async function resizePhoto(file: File): Promise<ResizedPhoto> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the photo");
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await toBlob(canvas, PHOTO_QUALITY);

    const blurSize = fitWithin(size.width, size.height, BLUR_SIZE, BLUR_SIZE);
    const blur = document.createElement("canvas");
    blur.width = blurSize.width;
    blur.height = blurSize.height;
    const blurCtx = blur.getContext("2d");
    if (!blurCtx) throw new Error("Could not process the photo");
    blurCtx.drawImage(canvas, 0, 0, blurSize.width, blurSize.height);

    return { blob, blurDataUrl: blur.toDataURL("image/jpeg", BLUR_QUALITY) };
  } finally {
    bitmap.close();
  }
}
