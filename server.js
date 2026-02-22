const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
const PORT = 3000;

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
  console.log("FILE:", req.file);
  console.log("BODY:", req.body);

  if (!req.file) {
    return res.status(400).json({ error: "File tidak diterima" });
  }

  const newJob = {
    id: uuidv4(),
    file: req.file.filename,
    paperSize: req.body.paperSize || "A4",
    colorMode: req.body.colorMode || "color",
    copies: req.body.copies || 1,
    note: req.body.note || "",
    status: "pending",
    createdAt: new Date()
  };

  db.push(newJob);
  saveDB();

  console.log("Job masuk:", newJob);

  res.json({
    message: "File berhasil diupload",
    job: newJob
  });
});

// Ambil job untuk listener
app.get("/get-print-job", (req, res) => {
  loadDB();

  const job = db.find(j => j.status === "pending");

  if (!job) {
    return res.json({ status: "empty" });
  }

  job.status = "printing";
  saveDB();

  res.json({
    status: "success",
    id: job.id,
    file: `http://localhost:${PORT}/uploads/${job.file}`,
    copies: job.copies,
    colorMode: job.colorMode,
    paperSize: job.paperSize
  });
});

// Update status setelah print
app.post("/update-status", (req, res) => {
  const { id } = req.body;

  const job = db.find(j => j.id === id);

  if (job) {
    job.status = "printed";
    saveDB();
    console.log("Job selesai:", id);
  }

  res.json({ message: "Status updated" });
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================
   START SERVER
================================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});