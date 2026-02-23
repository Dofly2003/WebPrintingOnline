const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const SERVER_URL = "http://127.0.0.1:3000";
const CHECK_INTERVAL = 5000; // cek setiap 5 detik

async function checkPrintJob() {
  try {
    const res = await axios.get(`${SERVER_URL}/get-print-job`);

    if (res.data.status === "empty") {
      return;
    }

    if (res.data.status === "success") {
      const job = res.data;

      console.log("📥 JOB DITERIMA:", job);

      const fileUrl = job.file;
      const fileName = path.basename(fileUrl);
      const downloadPath = path.join(__dirname, "downloads");

      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath);
      }

      const filePath = path.join(downloadPath, fileName);

      // DOWNLOAD FILE
      const writer = fs.createWriteStream(filePath);
      const response = await axios({
        url: fileUrl,
        method: "GET",
        responseType: "stream"
      });

      response.data.pipe(writer);

      writer.on("finish", () => {
        console.log("📂 FILE SIAP PRINT:", filePath);

        // PRINT FILE
        const printCommand = `lp -n ${job.copies} "${filePath}"`;

        exec(printCommand, async (error, stdout, stderr) => {
          if (error) {
            console.error("❌ PRINT ERROR:", error.message);
            return;
          }

          console.log("🖨️ PRINT SUCCESS:", stdout);

          // UPDATE STATUS KE SERVER
          await axios.post(`${SERVER_URL}/update-status`, {
            id: job.id,
            status: "printed"
          });

          console.log("✅ STATUS UPDATED");
        });
      });
    }
  } catch (err) {
    console.error("❌ LISTENER ERROR:", err.message);
  }
}

// Loop terus
setInterval(checkPrintJob, CHECK_INTERVAL);

console.log("🖨️ Print Listener aktif...");