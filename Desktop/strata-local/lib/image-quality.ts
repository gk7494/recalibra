import sharp from "sharp";

export type ImageQualityStatus = "usable" | "review" | "retake";

export type ImageQualityReport = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  status: ImageQualityStatus;
  flags: string[];
};

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function clampMetric(value: number) {
  return Math.max(0, Math.min(1, value));
}

function estimateSharpness(buffer: Buffer, width: number, height: number) {
  if (width < 2 || height < 2 || buffer.length < width * height) return 0;

  let totalDelta = 0;
  let samples = 0;

  for (let y = 1; y < height; y += 1) {
    const row = y * width;
    const previousRow = (y - 1) * width;

    for (let x = 1; x < width; x += 1) {
      const current = buffer[row + x];
      const left = buffer[row + x - 1];
      const up = buffer[previousRow + x];
      totalDelta += Math.abs(current - left) + Math.abs(current - up);
      samples += 2;
    }
  }

  return clampMetric(totalDelta / samples / 42);
}

export async function inspectImageQuality(
  imagePath: string
): Promise<ImageQualityReport> {
  const image = sharp(imagePath, { failOn: "none" });
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const sample = await image
    .clone()
    .rotate()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = sample.data;
  const sampleWidth = sample.info.width;
  const sampleHeight = sample.info.height;
  const pixelCount = Math.max(1, pixels.length);

  let sum = 0;
  for (const pixel of pixels) sum += pixel;

  const mean = sum / pixelCount;

  let variance = 0;
  for (const pixel of pixels) {
    const delta = pixel - mean;
    variance += delta * delta;
  }

  const brightness = clampMetric(mean / 255);
  const contrast = clampMetric(Math.sqrt(variance / pixelCount) / 96);
  const sharpness = estimateSharpness(pixels, sampleWidth, sampleHeight);
  const flags: string[] = [];

  if (width < 800 || height < 600) {
    flags.push("Low resolution; capture closer or use a higher-resolution photo.");
  }

  if (brightness < 0.18) {
    flags.push("Underexposed photo; add light or retake from a clearer angle.");
  } else if (brightness > 0.9) {
    flags.push("Overexposed photo; reduce glare before relying on visual evidence.");
  }

  if (contrast < 0.14) {
    flags.push("Low contrast; boundaries and labels may be unreliable.");
  }

  if (sharpness < 0.12) {
    flags.push("Low sharpness; small labels, leaks, and edges need field verification.");
  }

  const status: ImageQualityStatus =
    flags.length >= 2 || (sharpness < 0.08 && contrast < 0.18)
      ? "retake"
      : flags.length
      ? "review"
      : "usable";

  return {
    width,
    height,
    brightness: roundMetric(brightness),
    contrast: roundMetric(contrast),
    sharpness: roundMetric(sharpness),
    status,
    flags,
  };
}
