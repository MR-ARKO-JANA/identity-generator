self.addEventListener("message", async (e) => {
  const { id, blob } = e.data;
  try {
    // Attempt importing heic2any inside Web Worker context
    if (typeof self.heic2any === "undefined") {
      try {
        importScripts("/heic2any.min.js");
      } catch (localErr) {
        try {
          importScripts("https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js");
        } catch (cdnErr) {
          console.warn("Could not load heic2any in worker", cdnErr);
        }
      }
    }

    if (typeof self.heic2any === "function") {
      const convertedBlob = await self.heic2any({
        blob: blob,
        toType: "image/jpeg",
        quality: 0.9,
      });

      const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      self.postMessage({ id, success: true, blob: resultBlob });
    } else {
      self.postMessage({ id, success: false, error: "heic2any not available in worker" });
    }
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message || "HEIC conversion failed" });
  }
});
