export const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });
  
  export function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
  }
  
  /**
   * Returns the new bounding area of a rotated rectangle.
   */
  export function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation);
  
    return {
      width:
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  }
  
  /**
   * This function was adapted from the one in the react-easy-crop's docs.
   */
  export async function getCroppedImg(
    imageSrc,
    pixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false },
    maxWidth = 1024, // Optimized max width
    maxHeight = 1024, // Optimized max height
    quality = 0.6 // Optimized JPEG quality (reduces file size ~50-70%)
  ) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
  
    if (!ctx) {
      return null;
    }
  
    const rotRad = getRadianAngle(rotation);
  
    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );
  
    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;
  
    // translate canvas context to a central point to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);
  
    // draw rotated image
    ctx.drawImage(image, 0, 0);
  
    // croppedAreaPixels values are bounding box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height
    );
  
    // Determine new dimensions if resizing is needed
    let targetWidth = pixelCrop.width;
    let targetHeight = pixelCrop.height;
  
    if (maxWidth && targetWidth > maxWidth) {
      targetHeight = (maxWidth / targetWidth) * targetHeight;
      targetWidth = maxWidth;
    }
    if (maxHeight && targetHeight > maxHeight) {
      targetWidth = (maxHeight / targetHeight) * targetWidth;
      targetHeight = maxHeight;
    }
  
    // Use a secondary canvas for high-quality resizing
    const targetCanvas = document.createElement('canvas');
    const targetCtx = targetCanvas.getContext('2d');
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
  
    // To resize with good quality, we first draw the cropped data to a temp canvas at original size
    // Then we draw from that temp canvas to the target canvas with scaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = pixelCrop.width;
    tempCanvas.height = pixelCrop.height;
    tempCtx.putImageData(data, 0, 0);
  
    targetCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
  
    // As a blob
    return new Promise((resolve) => {
      targetCanvas.toBlob((file) => {
        resolve(file);
      }, 'image/jpeg', quality);
    });
  }
  
  export async function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.6) {
    const imageSrc = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });

    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    let width = image.width;
    let height = image.height;

    // Resize logic
    if (width > height) {
        if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
        }
    } else {
        if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
        }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });
            resolve(compressedFile);
        }, 'image/jpeg', quality);
    });
  }
