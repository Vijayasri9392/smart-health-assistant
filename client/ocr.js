// async function extractReport() {
//   let file = document.getElementById("reportUpload").files[0];
//   if (!file) return;

//   document.getElementById("ocrResult").innerText = "Processing report...";

//   const { data: { text } } = await Tesseract.recognize(file, 'eng');
//   document.getElementById("ocrResult").innerText = "Extracted text: " + text;
// }


// Tesseract.js OCR for client-side (optional)
async function analyzeOCR(imageFile) {
    // Implementation for browser-based OCR
    console.log('OCR processing:', imageFile.name);
}
