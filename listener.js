const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { print } = require("pdf-to-printer");

const SERVER = "http://localhost:3000";
const TEMP_DIR = path.join(__dirname, "temp");
const CHECK_INTERVAL = 5000; // 5 detik

// Pastikan folder temp ada
fs.ensureDirSync(TEMP_DIR);

console.log("🖨 Print Listener Running...");
console.log("Terhubung ke:", SERVER);

async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function checkPrintJob() {
  try {
    console.log("🔎 Checking job...");

    const res = await axios.get(`${SERVER}/get-print-job`);

    if (res.data.status !== "success") {
      console.log("📭 Tidak ada job");
      return;
    }

    const { id, file, copies, colorMode } = res.data;

    console.log("📥 Job ditemukan:", id);

    const filePath = path.join(TEMP_DIR, `${id}.pdf`);

    console.log("⬇ Downloading file...");
    await downloadFile(file, filePath);

    console.log("🖨 Printing...");

    await print(filePath, {
      copies: parseInt(copies) || 1,
      printDialog: false,
      win32: [
        "-print-settings",
        colorMode === "bw" ? "monochrome" : "color"
      ]
    });

    console.log("✅ Print berhasil!");

    await axios.post(`${SERVER}/update-status`, {
      id: id,
    });

    console.log("🔄 Status updated");

    await fs.remove(filePath);
    console.log("🗑 File temp dihapus");

  } catch (error) {
    console.log("❌ Listener error:", error.message);
  }
}

setInterval(checkPrintJob, CHECK_INTERVAL);