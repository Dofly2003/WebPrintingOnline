const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
const PORT = 3000;
let printQueue = [];


/* ===============================
   MIDDLEWARE
================================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ===============================
   ENSURE FOLDERS EXIST
================================= */

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

if (!fs.existsSync("database.json")) {
  fs.writeFileSync("database.json", "[]");
}

/* ===============================
   LOAD DATABASE SAFE
================================= */

let db = [];

function loadDB() {
  try {
    const data = fs.readFileSync("database.json", "utf8");
    db = data ? JSON.parse(data) : [];
  } catch (err) {
    console.log("Database corrupt, reset...");
    db = [];
    saveDB();
  }
}

function saveDB() {
  fs.writeFileSync("database.json", JSON.stringify(db, null, 2));
}

loadDB();

/* ===============================
   MULTER CONFIG
================================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ===============================
   DEBUG LOGGER
================================= */

app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url}`);
  next();
});

/* ===============================
   ROUTES
================================= */

// Upload file
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    console.log("REQ FILE:", req.file);
    console.log("REQ BODY:", req.body);

    if (!req.file) {
      return res.json({
        status: "error",
        message: "File tidak diterima server"
      });
    }

    const newJob = {
      id: Date.now(),
      file: req.file.filename,
      copies: parseInt(req.body.copies) || 1,
      status: "pending"
    };

    printQueue.push(newJob);

    console.log("📥 Job masuk:", newJob);

    // 🔥 PASTIKAN RESPONSE INI
    return res.json({
      status: "success",
      message: "Upload berhasil",
      job: newJob
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.json({
      status: "error",
      message: err.message
    });
  }
});

// Ambil job untuk listener
app.get("/get-print-job", (req, res) => {
  try {
    console.log("Listener meminta job...");

    if (!printQueue || printQueue.length === 0) {
      return res.json({ status: "empty" });
    }

    const job = printQueue.find(j => j.status === "pending");

    if (!job) {
      return res.json({ status: "empty" });
    }

    job.status = "printing";

    console.log("🖨️ Kirim job:", job);

    return res.json({
      status: "success",
      id: job.id,
      file: `http://127.0.0.1:3000/uploads/${job.file}`,
      copies: job.copies || 1
    });

  } catch (err) {
    console.error("❌ ERROR get-print-job:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// Update status setelah print
app.post("/update-status", (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id) {
      return res.status(400).json({ status: "error", message: "ID kosong" });
    }

    const job = printQueue.find(j => j.id == id);

    if (!job) {
      return res.json({ status: "not_found" });
    }

    job.status = status;

    console.log(`✅ Job ${id} jadi ${status}`);

    return res.json({ status: "updated" });

  } catch (err) {
    console.error("❌ ERROR update-status:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================
   START SERVER
================================= */

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});