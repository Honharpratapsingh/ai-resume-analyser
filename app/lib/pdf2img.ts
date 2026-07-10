interface ConvertResult {
  imageFile: File | null;
  error?: string;
}

/**
 * Renders the first page of a PDF file onto a canvas and returns it
 * as a PNG File object. Runs entirely client-side.
 *
 * pdfjs-dist is dynamically imported to avoid SSR crashes — the library
 * uses browser-only APIs (DOMMatrix) that don't exist in Node.js.
 */
export async function convertPdfToImage(file: File): Promise<ConvertResult> {
  try {
    // Dynamic import — only loads in the browser, never during SSR
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    // Read the File as an ArrayBuffer for pdfjs
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
      return { imageFile: null, error: "The PDF has no pages." };
    }

    // Render only the first page
    const page = await pdf.getPage(1);

    // High scale for good image quality
    const scale = 4;
    const viewport = page.getViewport({ scale });

    // Create an off-screen canvas
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (!context) {
      return { imageFile: null, error: "Failed to create canvas context." };
    }

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    // Convert canvas to PNG Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });

    if (!blob) {
      return { imageFile: null, error: "Failed to convert page to image." };
    }

    // Derive the output filename from the original PDF name
    const baseName = file.name.replace(/\.pdf$/i, "");
    const imageFile = new File([blob], `${baseName}.png`, {
      type: "image/png",
    });

    return { imageFile };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to process the PDF file.";
    return { imageFile: null, error: message };
  }
}
