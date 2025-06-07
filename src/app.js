const { app, BrowserWindow } = require("electron");
const path = require("path");

let packageJsonPath;
try {
  if (app.isPackaged) {
    packageJsonPath = path.join(process.resourcesPath, "package.json");
  } else {
    packageJsonPath = path.join(__dirname, "package.json");
  }

  if (!require("fs").existsSync(packageJsonPath)) {
    packageJsonPath = path.join(__dirname, "package.json");
  }
} catch (error) {
  packageJsonPath = path.join(__dirname, "package.json");
}

const p = require(packageJsonPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "icon.png"),
    title: p.name || "Web App",
  });
  win.setMenuBarVisibility(false);
  win.webContents.on("before-input-event", (event, input) => {
    if (
      input.control &&
      input.shift &&
      input.key.toLowerCase() === "arrowleft"
    ) {
      win.webContents.goBack();
    } else if (
      input.control &&
      input.shift &&
      input.key.toLowerCase() === "arrowright"
    ) {
      win.webContents.goForward();
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    win.loadURL(url);
    return { action: "deny" };
  });

  if (p.url) {
    win.loadURL(p.url).catch((err) => {
      console.error("Failed to load URL:", err);
      win.loadFile(path.join(__dirname, "error.html")).catch(() => {
        win.loadURL(
          "data:text/html;charset=utf-8," +
            encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error Loading Page</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                     text-align: center; padding: 50px; }
              .error { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1 class="error">Failed to Load Page</h1>
            <p>Could not connect to: ${p.url}</p>
            <p>Please check your internet connection and try again.</p>
          </body>
          </html>
        `),
        );
      });
    });
  } else {
    console.error("No URL specified in package.json");
  }
}

app.whenReady().then(createWindow);
