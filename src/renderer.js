const urlInput = document.getElementById("url-input");
const urlStatus = document.getElementById("url-status");
const autoNameCheckbox = document.getElementById("auto-name");
const customNameGroup = document.getElementById("custom-name-group");
const appNameInput = document.getElementById("app-name");
const defaultIconCheckbox = document.getElementById("auto-icon");
const customIconGroup = document.getElementById("custom-icon-group");
const iconUpload = document.getElementById("icon-upload");
const convertBtn = document.getElementById("convert-btn");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const nodeStatusPill = document.getElementById("node-status-pill");
const statusIndicator = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");
const installNodeBtn = document.getElementById("install-node-btn");

let isConverting = false;
let nodeInstalled = false;

urlInput.addEventListener("input", debounce(validateUrl, 300));
autoNameCheckbox.addEventListener("change", toggleCustomName);
defaultIconCheckbox.addEventListener("change", toggleCustomIcon);
iconUpload.addEventListener("change", validateIconFile);
convertBtn.addEventListener("click", convertWebsite);
installNodeBtn.addEventListener("click", installNode);

validateUrl();
checkNodeStatus();

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function validateUrl() {
  const url = urlInput.value.trim();

  if (!url) {
    urlStatus.style.display = "none";
    convertBtn.disabled = true;
    return;
  }

  try {
    const result = await window.electronAPI.validateUrl(url);
    console.log("URL validation result:", result);
    if (result.valid) {
      urlStatus.className = "url-status valid";
      urlStatus.textContent = "✓ Valid URL";
      urlStatus.style.display = "block";

      convertBtn.disabled = !nodeInstalled;
    } else {
      urlStatus.className = "url-status invalid";
      urlStatus.textContent = "✗ Invalid URL";
      urlStatus.style.display = "block";
      convertBtn.disabled = true;
    }
  } catch (error) {
    console.error("URL validation error:", error);
    urlStatus.className = "url-status invalid";
    urlStatus.textContent = "✗ Error validating URL";
    urlStatus.style.display = "block";
    convertBtn.disabled = true;
  }
}

function toggleCustomName() {
  if (autoNameCheckbox.checked) {
    customNameGroup.style.display = "none";
    appNameInput.required = false;
  } else {
    customNameGroup.style.display = "block";
    appNameInput.required = true;
    appNameInput.focus();
  }
}

function toggleCustomIcon() {
  if (defaultIconCheckbox.checked) {
    customIconGroup.style.display = "none";
    iconUpload.required = false;
  } else {
    customIconGroup.style.display = "block";
    iconUpload.required = true;
  }
}

function validateIconFile() {
  const file = iconUpload.files[0];
  if (!file) return;

  const supportedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
    "image/gif",
  ];
  const supportedExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".tiff",
    ".tif",
    ".gif",
  ];

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  const hasValidExtension = supportedExtensions.some((ext) =>
    fileName.endsWith(ext),
  );
  const hasValidType = supportedTypes.includes(fileType);

  if (!hasValidExtension || !hasValidType) {
    showError(
      "Unsupported file format. Please use PNG, JPG, WebP, TIFF, or GIF files.",
    );
    iconUpload.value = "";
    return;
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showError("File size too large. Please use an image smaller than 10MB.");
    iconUpload.value = "";
    return;
  }
}

async function convertWebsite() {
  if (isConverting) return;

  const url = urlInput.value.trim();
  const autoName = autoNameCheckbox.checked;
  const appName = autoName ? "" : appNameInput.value.trim();
  const useDefaultIcon = defaultIconCheckbox.checked;
  const customIconFile = useDefaultIcon ? null : iconUpload.files[0];

  if (!url) {
    showError("Please enter a valid URL");
    return;
  }

  if (!autoName && !appName) {
    showError("Please enter an app name");
    appNameInput.focus();
    return;
  }

  if (!useDefaultIcon && !customIconFile) {
    showError("Please select an icon file");
    return;
  }

  if (!useDefaultIcon && customIconFile) {
    const supportedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/tiff",
      "image/gif",
    ];
    const supportedExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".tiff",
      ".tif",
      ".gif",
    ];

    const fileName = customIconFile.name.toLowerCase();
    const fileType = customIconFile.type.toLowerCase();
    const hasValidExtension = supportedExtensions.some((ext) =>
      fileName.endsWith(ext),
    );
    const hasValidType = supportedTypes.includes(fileType);

    if (!hasValidExtension || !hasValidType) {
      showError(
        "Unsupported icon format. Please use PNG, JPG, WebP, TIFF, or GIF files.",
      );
      return;
    }
  }

  isConverting = true;

  const buttonText = convertBtn.querySelector(".button-text");
  const spinner = convertBtn.querySelector(".spinner");

  buttonText.textContent = "Building...";
  spinner.style.display = "block";
  convertBtn.disabled = true;

  progressContainer.style.display = "block";
  animateProgress();

  try {
    let customIconData = null;

    if (!useDefaultIcon && customIconFile) {
      progressText.textContent = "Processing custom icon...";
      customIconData = await readFileAsArrayBuffer(customIconFile);
    }

    const options = {
      url: url,
      appName: appName,
      autoName: autoName,
      useDefaultIcon: useDefaultIcon,
      customIconData: customIconData,
      customIconName: customIconFile ? customIconFile.name : null,
    };

    progressText.textContent = "Building app...";
    const result = await window.electronAPI.convertAndBuildWebsite(options);

    progressText.textContent = "App built successfully!";
    progressFill.style.width = "100%";

    showSuccess("App built successfully!");

    setTimeout(() => {
      progressContainer.style.display = "none";
    }, 3000);
  } catch (error) {
    progressText.textContent = "Build failed";
    progressFill.style.width = "100%";
    progressFill.style.background = "var(--error-red)";

    showError(error.message || "An error occurred during conversion");

    setTimeout(() => {
      progressContainer.style.display = "none";
      progressFill.style.background =
        "linear-gradient(90deg, var(--primary-blue), #667eea)";
    }, 3000);
  } finally {
    isConverting = false;
    buttonText.textContent = "Convert & Build for macOS";
    spinner.style.display = "none";
    convertBtn.disabled = false;
  }
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function animateProgress() {
  progressFill.style.width = "0%";

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) {
      progress = 90;
      clearInterval(interval);
    }
    progressFill.style.width = progress + "%";
  }, 200);
}

function showError(message) {
  urlStatus.className = "url-status invalid";
  urlStatus.textContent = "✗ " + message;
  urlStatus.style.display = "block";

  setTimeout(() => {
    validateUrl();
  }, 3000);
}

function showSuccess(message) {
  urlStatus.className = "url-status valid";
  urlStatus.textContent = "✓ " + message;
  urlStatus.style.display = "block";

  setTimeout(() => {
    validateUrl();
  }, 5000);
}

window.addEventListener("focus", () => {
  if (urlInput.value.trim()) {
    validateUrl();
  }
});

async function checkNodeStatus() {
  try {
    const result = await window.electronAPI.checkNodeStatus();

    if (result.installed) {
      result.version = result.message.split("v")[1].split(", ")[0].trim();
      nodeInstalled = true;
      statusIndicator.className = "status-indicator online";
      statusText.textContent = `Node.js ${result.version}`;
      installNodeBtn.style.display = "none";
      nodeStatusPill.title = ``;
    } else {
      nodeInstalled = false;
      statusIndicator.className = "status-indicator offline";
      statusText.textContent = "Node.js required";
      installNodeBtn.style.display = "block";
      nodeStatusPill.title = "Node.js is required to build apps";
    }

    if (urlInput.value.trim()) {
      validateUrl();
    }
  } catch (error) {
    console.error("Error checking Node.js status:", error);
    nodeInstalled = false;
    statusIndicator.className = "status-indicator offline";
    statusText.textContent = "Check failed";
    installNodeBtn.style.display = "block";
    convertBtn.disabled = true;
  }
}

async function installNode() {
  try {
    await window.electronAPI.installNode();

    showSuccess(
      "Node.js download page opened. Please install and restart the app.",
    );
  } catch (error) {
    console.error("Error opening Node.js download page:", error);
    showError("Failed to open Node.js download page");
  }
}
