const form = document.getElementById("printForm");
const statusDiv = document.getElementById("status");
const button = form.querySelector("button");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  statusDiv.innerHTML = "⏳ Mengupload file...";
  button.disabled = true;

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("Server error: " + response.status);
    }

    const result = await response.json();

    console.log("✅ Server response:", result);

    if (result.job) {
  statusDiv.innerHTML = `
    ✅ File berhasil dikirim!<br>
    ID Job: <b>${result.job.id}</b>
  `;
  form.reset();
} else {
  statusDiv.innerHTML = "❌ Upload gagal dari server.";
}

  } catch (error) {
    console.error("❌ Upload error:", error);
    statusDiv.innerHTML = "❌ Gagal upload. Pastikan server aktif.";
  } finally {
    button.disabled = false;
  }
});