/**
 * Image preprocessing utilities for OCR and defect detection
 */

/**
 * Resize image to max dimensions while maintaining aspect ratio
 */
export async function resizeImage(
  imageBlob: Blob,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const img = new Image();
  const imgUrl = URL.createObjectURL(imageBlob);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });

  // Calculate new dimensions maintaining aspect ratio
  // Use faster downscaling for better performance
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  // Use faster interpolation for resizing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low'; // Faster than 'high'

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(imgUrl);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to resize image'));
        }
      },
      'image/jpeg',
      0.9
    );
  });
}

export async function preprocessForOCR(imageBlob: Blob): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const img = new Image();
  const imgUrl = URL.createObjectURL(imageBlob);
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });

  // Scale up if image is small (better OCR accuracy) - but not too large
  const minDimension = Math.min(img.width, img.height);
  let scale = 1;
  // Scale to at least 1500px for better OCR, but cap at 2500px to avoid memory issues
  if (minDimension < 1500) {
    scale = Math.min(1500 / minDimension, 2500 / Math.max(img.width, img.height));
  }
  
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  
  // Use high-quality rendering for OCR
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw original image scaled up
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Step 1: Convert to grayscale and calculate histogram for adaptive enhancement
  const histogram = new Array(256).fill(0);
  const grayValues: number[] = [];
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    grayValues.push(gray);
    histogram[gray]++;
  }
  
  // Find min and max for contrast stretching
  let min = 255;
  let max = 0;
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > 0) {
      min = Math.min(min, i);
      max = Math.max(max, i);
    }
  }
  
  // Step 2: Adaptive contrast enhancement with histogram stretching
  const contrastFactor = 255 / Math.max(1, max - min);
  for (let i = 0; i < data.length; i += 4) {
    const gray = grayValues[i / 4];
    // Stretch histogram and enhance contrast
    let enhanced = ((gray - min) * contrastFactor);
    // Additional boost for mid-tones (where text usually is)
    if (enhanced > 50 && enhanced < 200) {
      enhanced = enhanced * 1.2;
    }
    enhanced = Math.min(255, Math.max(0, enhanced));
    
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }
  
  // Step 3: Apply sharpening filter (stronger for better text edges)
  const sharpened = sharpenImage(new ImageData(data, canvas.width, canvas.height));
  
  // Step 4: Apply slight denoising (reduce speckles while preserving edges)
  const denoised = denoiseImage(sharpened);
  
  // Put processed image back
  ctx.putImageData(denoised, 0, 0);
  
  // Convert to blob URL for OCR
  const processedUrl = await new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(imgUrl);
      }
    }, 'image/png');
  });
  
  URL.revokeObjectURL(imgUrl);
  return processedUrl;
}

/**
 * Simple denoising filter to reduce speckles while preserving edges
 */
function denoiseImage(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  // Median filter for denoising (preserves edges better than mean)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const neighbors: number[] = [];
      
      // Collect 3x3 neighborhood
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(imageData.data[nIdx]);
        }
      }
      
      // Use median (middle value) - better at preserving edges
      neighbors.sort((a, b) => a - b);
      const median = neighbors[4]; // Middle of 9 values
      
      data[idx] = median;
      data[idx + 1] = median;
      data[idx + 2] = median;
    }
  }
  
  return new ImageData(data, width, height);
}

function sharpenImage(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  // Unsharp masking for better text edge enhancement
  // First, create a blurred version
  const blurred = new Uint8ClampedArray(data.length);
  const blurKernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const blurSum = 16;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          sum += imageData.data[idx] * blurKernel[kernelIdx];
        }
      }
      const idx = (y * width + x) * 4;
      blurred[idx] = sum / blurSum;
      blurred[idx + 1] = sum / blurSum;
      blurred[idx + 2] = sum / blurSum;
    }
  }
  
  // Unsharp masking: original + (original - blurred) * amount
  const amount = 1.5; // Sharpening strength
  for (let i = 0; i < data.length; i += 4) {
    const original = imageData.data[i];
    const blur = blurred[i];
    const sharpened = original + (original - blur) * amount;
    const value = Math.min(255, Math.max(0, Math.round(sharpened)));
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  
  return new ImageData(data, width, height);
}

export async function preprocessForDefectDetection(imageBlob: Blob): Promise<ImageData> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const img = new Image();
  const imgUrl = URL.createObjectURL(imageBlob);
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Enhance contrast for better defect detection
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    // Enhance contrast (more aggressive for defect detection)
    const enhanced = Math.min(255, Math.max(0, (gray - 40) * 1.8 + 40));
    
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }
  
  URL.revokeObjectURL(imgUrl);
  return new ImageData(data, canvas.width, canvas.height);
}

