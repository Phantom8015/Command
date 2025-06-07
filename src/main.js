const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const fsPromises = require("fs").promises;
const exec = require("child_process").exec;
const axios = require("axios");
const cheerio = require("cheerio");
const Jimp = require("jimp");

async function processImageWithJimp(inputBuffer, outputPath) {
  try {
    const image = await Jimp.read(inputBuffer);

    await image
      .contain(
        512,
        512,
        Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE,
      )
      .writeAsync(outputPath);

    return true;
  } catch (error) {
    console.error("Jimp processing failed:", error);
    return false;
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    maxHeight: 815,
    maxWidth: 1200,
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(__dirname, "icon.png"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("validate-url", async (event, url) => {
  return new Promise((resolve) => {
    try {
      new URL(url);
      url = url.trim();
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      command = `ping -c 1 ${domain}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error pinging URL: ${error.message}`);
          resolve({ valid: false, message: "URL is not reachable" });
        } else {
          console.log(`Ping output: ${stdout}`);
          resolve({ valid: true, message: "URL is valid and reachable" });
        }
      });
    } catch (error) {
      console.error(`Invalid URL format: ${error.message}`);
      resolve({ valid: false, message: "Invalid URL format" });
    }
  });
});

ipcMain.handle("convert-and-build-website", async (event, options) => {
  return new Promise(async (resolve, reject) => {
    const {
      url: initialUrl,
      appName,
      autoName,
      useDefaultIcon,
      customIconData,
      customIconName,
    } = options;
    const projectRoot = path.join(__dirname, "..");
    const srcDir = __dirname;

    const documentsPath = app.getPath("documents");
    const tempDir = path.join(documentsPath, "command", "buildsFiles");
    const iconUploadTempDir = path.join(documentsPath, "temp_icon_upload");

    let currentAppBuildDir = null;
    let customIconPath = null;
    let outputLogs = [];

    const log = (message) => {
      console.log(message);
    };

    const logError = (message, error) => {
      console.error(message, error);
      outputLogs.push(
        `ERROR: ${message}${error ? " - " + (error.message || error) : ""}`,
      );
    };

    try {
      if (!useDefaultIcon && customIconData && customIconName) {
        try {
          if (!fs.existsSync(iconUploadTempDir)) {
            await fsPromises.mkdir(iconUploadTempDir, { recursive: true });
          }
          customIconPath = path.join(iconUploadTempDir, customIconName);
          const buffer = Buffer.from(customIconData);
          await fsPromises.writeFile(customIconPath, buffer);
          log("Custom icon saved to temp upload location: " + customIconPath);
        } catch (error) {
          logError("Error saving custom icon to temp upload location.", error);
          customIconPath = null;
        }
      }

      let currentUrl = initialUrl.trim();
      if (
        !currentUrl.startsWith("http://") &&
        !currentUrl.startsWith("https://")
      ) {
        currentUrl = "http://" + currentUrl;
      }
      log("Formatted URL: " + currentUrl);

      let siteHtmlContent = "";
      let siteDomain = "";
      try {
        const parsedUrl = new URL(currentUrl);
        siteDomain = parsedUrl.origin;
        const response = await axios.get(currentUrl, { timeout: 10000 });
        siteHtmlContent = response.data;
      } catch (error) {
        logError(
          "Failed to fetch website content from URL: " + currentUrl,
          error,
        );
      }

      const $ = cheerio.load(siteHtmlContent);

      let finalAppName = "WebApp";
      if (autoName) {
        try {
          const title = $("title").first().text().trim();
          if (title) {
            finalAppName = title;
            log("Using auto-fetched app name: " + finalAppName);
          } else {
            log('No title found, using "WebApp".');
          }
        } catch (e) {
          logError('Error extracting title, using "WebApp".', e);
        }
      } else {
        finalAppName = appName && appName.trim() ? appName.trim() : "WebApp";
        log("Using custom app name: " + finalAppName);
      }

      finalAppName = finalAppName
        .replace(/[^a-zA-Z0-9\\s-]/g, "")
        .replace(/\\s+/g, "-")
        .trim();
      if (!finalAppName || !/[a-zA-Z]/.test(finalAppName)) {
        finalAppName = "WebApp";
        log("Invalid app name after sanitization, using 'WebApp'.");
      }
      log("Sanitized app name: " + finalAppName);

      currentAppBuildDir = path.join(
        tempDir,
        `${finalAppName.replace(/\\s+/g, "_")}-${Date.now()}`,
      );
      await fsPromises.mkdir(currentAppBuildDir, { recursive: true });
      log("Created temporary app build directory: " + currentAppBuildDir);

      const appJsSourcePath = path.join(srcDir, "app.js");
      const appJsDestPath = path.join(currentAppBuildDir, "main.js");
      await fsPromises.copyFile(appJsSourcePath, appJsDestPath);
      log("Copied app.js to temporary build directory as main.js");

      const appPackageJsonSourcePath = path.join(srcDir, "app_package.json");
      const tempPackageJsonPath = path.join(currentAppBuildDir, "package.json");
      await fsPromises.copyFile(appPackageJsonSourcePath, tempPackageJsonPath);
      log(
        "Copied app_package.json to temporary build directory as package.json",
      );

      try {
        const packageJsonContent = await fsPromises.readFile(
          tempPackageJsonPath,
          "utf8",
        );
        const packageData = JSON.parse(packageJsonContent);
        packageData.url = currentUrl;
        packageData.name = finalAppName.toLowerCase().replace(/\\s+/g, "-");

        if (!packageData.build) packageData.build = {};
        packageData.build.productName = finalAppName;
        const sanitizedAppNameForId = finalAppName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        packageData.build.appId = `com.command.${sanitizedAppNameForId || "app"}`;

        packageData.build.mac = packageData.build.mac || {};
        packageData.build.mac.icon = "icon.png";

        await fsPromises.writeFile(
          tempPackageJsonPath,
          JSON.stringify(packageData, null, 2),
        );
        log("Updated temporary package.json.");
      } catch (error) {
        logError("Error updating temporary package.json.", error);
        throw new Error("Failed to update temporary package.json");
      }

      const iconPngPath = path.join(currentAppBuildDir, "icon.png");
      const iconIcoPath = path.join(currentAppBuildDir, "icon.ico");
      let iconProcessed = false;

      if (customIconPath && fs.existsSync(customIconPath)) {
        log("Processing custom icon from: " + customIconPath);
        try {
          const ext = path.extname(customIconPath).toLowerCase();
          log(`Custom icon metadata: format: ${ext}`);

          const iconBuffer = await fsPromises.readFile(customIconPath);

          if (ext === ".ico") {
            log(
              "ICO format detected but not supported by Jimp. Using default icon instead.",
            );
            throw new Error("ICO format not supported by Jimp image processor");
          } else {
            const jimpSuccess = await processImageWithJimp(
              iconBuffer,
              iconPngPath,
            );
            if (jimpSuccess) {
              log(
                "Custom icon processed with Jimp and saved to temporary app directory.",
              );
              iconProcessed = true;
            } else {
              throw new Error("Jimp image processing failed");
            }
          }
        } catch (error) {
          logError(
            "Error processing custom icon. Falling back to default icon.",
            error,
          );
        }
      }

      if (!iconProcessed) {
        log("Using default icon...");
        try {
          const placeholderIconPath = path.join(srcDir, "icon.png");
          if (fs.existsSync(placeholderIconPath)) {
            log(`Using default icon from ${placeholderIconPath}`);
            await fsPromises.copyFile(placeholderIconPath, iconPngPath);
            log(`Copied default icon to ${iconPngPath}`);

            iconProcessed = true;
          } else {
            logError(
              "Default icon not found at: " + placeholderIconPath,
              "No default icon available to copy.",
            );
            throw new Error("Default icon not found");
          }
        } catch (defaultIconError) {
          logError(
            "Could not copy or convert default icon.",
            defaultIconError.message
              ? defaultIconError.message
              : defaultIconError,
          );
          throw new Error("Failed to process default icon");
        }
      }
      log("Installing dependencies in temporary app directory...");
      log("Effective PATH for child processes: " + getRobustPath());
      let npmStdout = "",
        npmStderr = "";
      await new Promise((resolveInstall, rejectInstall) => {
        const installProcess = spawn("npm", ["install"], {
          cwd: currentAppBuildDir,
          shell: true,
          stdio: "pipe",
          env: { ...process.env, PATH: getRobustPath() },
        });
        installProcess.stdout.on("data", (data) => {
          const str = data.toString().trim();
          npmStdout += str + "\n";
          log(`NPM Install stdout: ${str}`);
        });
        installProcess.stderr.on("data", (data) => {
          const str = data.toString().trim();
          npmStderr += str + "\n";
          logError(`NPM Install stderr:`, str);
        });
        installProcess.on("close", (code) => {
          log(`NPM Install process finished with exit code: ${code}`);
          if (code === 0) {
            log("Dependencies installed successfully.");
            resolveInstall();
          } else {
            const e = `Failed to install dependencies. Exit code: ${code}\nLast output:\n${npmStdout.split("\n").slice(-20).join("\n")}\n${npmStderr.split("\n").slice(-20).join("\n")}`;
            logError(e, "");
            rejectInstall(new Error(e));
          }
        });
        installProcess.on("error", (err) => {
          logError("Failed to start npm install.", err);
          rejectInstall(err);
        });
      });

      try {
        const packageJsonContent = await fsPromises.readFile(
          tempPackageJsonPath,
          "utf8",
        );
        const packageData = JSON.parse(packageJsonContent);
        packageData.description = "A web app built from a website";
        await fsPromises.writeFile(
          tempPackageJsonPath,
          JSON.stringify(packageData, null, 2),
        );
        log("Updated package.json with author and description.");
      } catch (error) {
        logError(
          "Error updating package.json with author and description.",
          error,
        );
        throw new Error(
          "Failed to update package.json with author and description",
        );
      }

      log("Building the app from temporary directory...");
      let buildStdout = "",
        buildStderr = "";
      await new Promise((resolveBuild, rejectBuild) => {
        const buildProcess = spawn("npm", ["run", "build-mac"], {
          cwd: currentAppBuildDir,
          shell: true,
          stdio: "pipe",
          env: { ...process.env, PATH: getRobustPath() },
        });
        buildProcess.stdout.on("data", (data) => {
          const str = data.toString().trim();
          buildStdout += str + "\n";
          log(`Build stdout: ${str}`);
        });
        buildProcess.stderr.on("data", (data) => {
          const str = data.toString().trim();
          buildStderr += str + "\n";
          logError(`Build stderr:`, str);
        });
        buildProcess.on("close", (code) => {
          log(`Build process finished with exit code: ${code}`);
          if (code === 0) {
            log("App built successfully.");
            resolveBuild();
          } else {
            const e = `App build failed. Exit code: ${code}\nLast output:\n${buildStdout.split("\n").slice(-20).join("\n")}\n${buildStderr.split("\n").slice(-20).join("\n")}`;
            logError(e, "");
            rejectBuild(new Error(e));
          }
        });
        buildProcess.on("error", (err) => {
          logError("Failed to start app build process.", err);
          rejectBuild(err);
        });
      });

      let builtAppSourceDir;
      const armDir = path.join(currentAppBuildDir, "dist", "mac-arm64");
      const intelDir = path.join(currentAppBuildDir, "dist", "mac");

      if (fs.existsSync(armDir)) {
        builtAppSourceDir = armDir;
        log("Using ARM64 build directory: mac-arm64");
      } else if (fs.existsSync(intelDir)) {
        builtAppSourceDir = intelDir;
        log("Using Intel build directory: mac");
      } else {
        builtAppSourceDir = path.join(currentAppBuildDir, "dist");
        log("Using fallback build directory: dist");
      }

      let builtAppName = finalAppName + ".app";
      const builtAppPath = path.join(builtAppSourceDir, builtAppName);

      if (fs.existsSync(builtAppPath)) {
        const targetCommandDir = path.join(documentsPath, "command");
        await fsPromises.mkdir(targetCommandDir, { recursive: true });
        log(`Ensured target directory exists: ${targetCommandDir}`);

        let targetAppPath = path.join(targetCommandDir, builtAppName);
        if (fs.existsSync(targetAppPath)) {
          try {
            targetAppPath = path.join(
              targetCommandDir,
              `${finalAppName.replace(/\\s+/g, "_")}-${Date.now()}.app`,
            );
          } catch (err) {
            logError(
              `Error removing existing app at target path: ${targetAppPath}`,
              err,
            );
          }
        }
        log(`Moving built app from ${builtAppPath} to ${targetAppPath}`);
        await fsPromises.rename(builtAppPath, targetAppPath);
        log(`App moved successfully to ${targetAppPath}`);

        log(`Opening target directory: ${targetCommandDir}`);
        spawn("open", [targetCommandDir], { detached: true });
        if (fs.existsSync(tempDir)) {
          try {
            await exec(`rm -rf "${tempDir}"`, { shell: true }, (error) => {
              if (error) {
                logError(
                  "Error cleaning up base app builds temp directory: " +
                    tempDir,
                  error,
                );
              } else {
                log("Cleaned up base app builds temp directory: " + tempDir);
              }
            });
            await exec(
              `rm -rf "${iconUploadTempDir}"`,
              { shell: true },
              (error) => {
                if (error) {
                  logError(
                    "Error cleaning up icons temp directory: " + tempDir,
                    error,
                  );
                } else {
                  log("Cleaned up base icons temp directory: " + tempDir);
                }
              },
            );
          } catch (err) {
            logError(
              "Error cleaning up base app builds temp directory: " + tempDir,
              err,
            );
          }
        }
      } else {
        const possiblePaths = [
          path.join(currentAppBuildDir, "dist", builtAppName),
          path.join(currentAppBuildDir, "dist", "mac-arm64", builtAppName),
          path.join(currentAppBuildDir, "dist", "mac", builtAppName),
        ];

        let foundAppPath = null;
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            foundAppPath = possiblePath;
            break;
          }
        }

        if (foundAppPath) {
          log(`Found app at alternate path: ${foundAppPath}`);
          const targetCommandDir = path.join(documentsPath, "command");
          await fsPromises.mkdir(targetCommandDir, { recursive: true });
          const targetAppPath = path.join(targetCommandDir, builtAppName);
          await fsPromises.rename(foundAppPath, targetAppPath);
          log(`App moved successfully to ${targetAppPath}`);
          spawn("open", [targetCommandDir], { detached: true });
        } else {
          const checkedPaths = possiblePaths.join(", ");
          logError(
            `Built app not found at any of the expected locations: ${checkedPaths}`,
            "Build output structure might be unexpected.",
          );
          throw new Error(
            `Built app not found. Please check logs for build output details.`,
          );
        }
      }

      resolve({
        success: true,
        message: "App converted, built, and moved successfully!",
        output: outputLogs.join("\\n"),
      });
    } catch (error) {
      logError("Main conversion/build process error.", error);
      const errorMessage = error.message || "Error converting and building app";
      const errorObject = new Error(errorMessage);
      errorObject.details = {
        success: false,
        message: errorMessage,
        error: error.message || "Unknown error occurred",
        output: outputLogs.join("\\n"),
      };
      reject(errorObject);
    } finally {
      if (fs.existsSync(tempDir)) {
        try {
          await fsPromises.rm(tempDir, {
            recursive: true,
            force: true,
          });
          log("Cleaned up base app builds temp directory: " + tempDir);
        } catch (err) {
          logError(
            "Error cleaning up base app builds temp directory: " + tempDir,
            err,
          );
        }
      }
    }
  });
});

ipcMain.handle("show-save-dialog", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save App",
    defaultPath: "MyWebApp",
    filters: [
      { name: "App Bundle", extensions: ["app"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  return result;
});

ipcMain.handle("check-node-status", async () => {
  return new Promise((resolve) => {
    const userShell = process.env.SHELL || "/bin/zsh";
    const shellCmd = `${userShell} -l -c 'node --version 2>/dev/null && npm --version 2>/dev/null'`;
    exec(shellCmd, (error, stdout, stderr) => {
      if (error) {
        resolve({ installed: false, message: stderr || error.message });
      } else {
        const lines = stdout.trim().split(/\r?\n/);
        const nodeVersion = lines[0] || undefined;
        const npmVersion = lines[1] || undefined;
        if (nodeVersion && npmVersion) {
          resolve({
            installed: true,
            message: `Node.js ${nodeVersion}, npm ${npmVersion}`,
          });
        } else {
          resolve({
            installed: false,
            message: "Node.js or npm not found in shell environment.",
          });
        }
      }
    });
  });
});

ipcMain.handle("install-node", async () => {
  const { shell } = require("electron");
  await shell.openExternal("https://nodejs.org/en/download/");
  return { success: true };
});

function loadUserShellEnv() {
  const userShell = process.env.SHELL || "/bin/zsh";

  const printEnvCmd = `${userShell} -l -c 'node -e "console.log(JSON.stringify(process.env))"'`;
  try {
    const { execSync } = require("child_process");
    const envJson = execSync(printEnvCmd, { encoding: "utf8" });
    const shellEnv = JSON.parse(envJson);

    for (const key in shellEnv) {
      if (!process.env[key]) {
        process.env[key] = shellEnv[key];
      }
    }
    console.log("Loaded user shell environment for child processes.");
  } catch (err) {
    console.warn("Could not load user shell environment:", err.message);
  }
}

function getRobustPath() {
  let pathEnv = process.env.PATH || "";

  const commonPaths = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  for (const p of commonPaths) {
    if (!pathEnv.split(":").includes(p)) {
      pathEnv += `:${p}`;
    }
  }
  return pathEnv;
}

loadUserShellEnv();
