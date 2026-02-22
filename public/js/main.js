const form = document.getElementById("printForm");
const statusDiv = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  statusDiv.innerHTML = "Uploading...";

  const response = await fetch("/upload", {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  statusDiv.innerHTML = "File berhasil dikirim!";
});