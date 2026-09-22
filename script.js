let supabaseClient = null;
let currentUser = null;
let folderPendingDeletion = null;

const folderList = document.querySelector("#folder-list");
const folderStatus = document.querySelector("#folder-status");
const newFolderButton = document.querySelector("#open-folder-dialog");
const folderDialog = document.querySelector("#folder-dialog");
const folderForm = document.querySelector("#folder-form");
const folderNameInput = document.querySelector("#folder-name");
const folderFormFeedback = document.querySelector("#folder-form-feedback");
const deleteFolderDialog = document.querySelector("#delete-folder-dialog");
const deleteFolderText = document.querySelector("#delete-folder-text");
const deleteFolderFeedback = document.querySelector("#delete-folder-feedback");

function setFolderStatus(message, type = "") {
  folderStatus.textContent = message;
  folderStatus.className = `folder-status ${type}`;
}

function initializeSupabase() {
  if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_PUBLISHABLE_KEY === "undefined" || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    setFolderStatus("Development setup: add your public Supabase URL and publishable key to config.js.", "error-message");
    newFolderButton.disabled = true;
    return false;
  }

  if (!window.supabase || !window.supabase.createClient) {
    setFolderStatus("The Supabase client could not be loaded. Check your connection and refresh.", "error-message");
    newFolderButton.disabled = true;
    return false;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return true;
}

async function getCurrentUser() {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Could not retrieve the Supabase user:", error);
    return null;
  }

  return data.user;
}

function renderFolders(folders) {
  folderList.replaceChildren();

  folders.forEach((folder) => {
    const row = document.createElement("div");
    row.className = "database-folder";
    const link = document.createElement("a");
    link.className = "folder-link";
    link.href = "#library";
    link.innerHTML = '<span class="folder-icon">&#9633;</span>';
    link.append(document.createTextNode(folder.name));
    const deleteButton = document.createElement("button");
    deleteButton.className = "folder-delete-control";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${folder.name}`);
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", () => openDeleteFolderDialog(folder));
    row.append(link, deleteButton);
    folderList.append(row);
  });
}

async function loadFolders() {
  if (!supabaseClient || !currentUser) return;
  setFolderStatus("Loading folders…");
  folderList.replaceChildren();

  const { data, error } = await supabaseClient
    .from("folders")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load folders:", error);
    setFolderStatus("Your folders could not be loaded. Please refresh and try again.", "error-message");
    return;
  }

  renderFolders(data);
  setFolderStatus(data.length ? "" : "No folders yet. Create one to organise your library.");
}

function openFolderDialog() {
  folderForm.reset();
  folderFormFeedback.textContent = "";
  folderDialog.hidden = false;
  window.setTimeout(() => folderNameInput.focus(), 0);
}

function closeFolderDialog() {
  folderDialog.hidden = true;
  newFolderButton.focus();
}

async function createFolder(event) {
  event.preventDefault();
  const name = folderNameInput.value.trim();
  if (!name) {
    folderFormFeedback.textContent = "Enter a folder name to continue.";
    folderNameInput.focus();
    return;
  }

  currentUser = await getCurrentUser();
  if (!currentUser) {
    folderFormFeedback.textContent = "An authenticated development session is required to create folders.";
    return;
  }

  const { error } = await supabaseClient.from("folders").insert({ name, user_id: currentUser.id });
  if (error) {
    console.error("Could not create folder:", error);
    folderFormFeedback.textContent = error.code === "23505" ? "You already have a folder with this name." : "The folder could not be created. Please try again.";
    return;
  }

  closeFolderDialog();
  await loadFolders();
}

function openDeleteFolderDialog(folder) {
  folderPendingDeletion = folder;
  deleteFolderText.textContent = `Delete “${folder.name}”? Papers will not be deleted.`;
  deleteFolderFeedback.textContent = "";
  deleteFolderDialog.hidden = false;
}

function closeDeleteFolderDialog() {
  deleteFolderDialog.hidden = true;
  folderPendingDeletion = null;
}

async function deleteFolder() {
  if (!folderPendingDeletion) return;
  currentUser = await getCurrentUser();
  if (!currentUser) {
    deleteFolderFeedback.textContent = "An authenticated development session is required to delete folders.";
    return;
  }

  const { error } = await supabaseClient.from("folders").delete().eq("id", folderPendingDeletion.id).eq("user_id", currentUser.id);
  if (error) {
    console.error("Could not delete folder:", error);
    deleteFolderFeedback.textContent = "The folder could not be deleted. Please try again.";
    return;
  }

  closeDeleteFolderDialog();
  await loadFolders();
}

async function startFolderLibrary() {
  if (!initializeSupabase()) return;
  currentUser = await getCurrentUser();
  if (!currentUser) {
    setFolderStatus("Development setup: sign in with a Supabase test user before database-backed folders can be used.", "error-message");
    newFolderButton.disabled = true;
    return;
  }

  newFolderButton.disabled = false;
  await loadFolders();
}

newFolderButton.addEventListener("click", openFolderDialog);
folderForm.addEventListener("submit", createFolder);
document.querySelectorAll("[data-close-folder-dialog]").forEach((element) => element.addEventListener("click", closeFolderDialog));
document.querySelectorAll("[data-close-delete-dialog]").forEach((element) => element.addEventListener("click", closeDeleteFolderDialog));
document.querySelector("#confirm-delete-folder").addEventListener("click", deleteFolder);

const addPaperModal = document.querySelector("#add-paper-modal");
const addPaperButton = document.querySelector("#open-add-paper");
const fileInput = document.querySelector("#pdf-file");
const fileName = document.querySelector("#file-name");
const linkForm = document.querySelector("#link-form");
const urlInput = document.querySelector("#paper-url");
const urlFeedback = document.querySelector("#url-feedback");

addPaperButton.addEventListener("click", () => { addPaperModal.hidden = false; window.setTimeout(() => fileInput.focus(), 0); });
document.querySelectorAll("[data-close-add-paper]").forEach((element) => element.addEventListener("click", () => { addPaperModal.hidden = true; addPaperButton.focus(); }));
fileInput.addEventListener("change", () => { const file = fileInput.files[0]; fileName.textContent = file ? `Selected: ${file.name}` : ""; fileName.classList.toggle("success-message", Boolean(file)); });
linkForm.addEventListener("submit", (event) => { event.preventDefault(); const value = urlInput.value.trim(); let valid = false; try { const url = new URL(value); valid = url.protocol === "http:" || url.protocol === "https:"; } catch { valid = false; } if (!valid) { urlFeedback.textContent = value ? "Enter a valid URL beginning with http:// or https://." : "Paste a paper link to continue."; urlFeedback.classList.remove("success-message"); return; } urlFeedback.textContent = "Paper importing will be implemented in the next phase."; urlFeedback.classList.add("success-message"); });

document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!addPaperModal.hidden) addPaperModal.hidden = true; if (!folderDialog.hidden) closeFolderDialog(); if (!deleteFolderDialog.hidden) closeDeleteFolderDialog(); });
startFolderLibrary();
