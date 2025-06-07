<p align="center">
<img src="https://raw.githubusercontent.com/Phantom8015/Command/refs/heads/main/src/icon.png" width="150" height="150"/>
</p>
<h1 align="center">Command</h1>
<p align="center">Convert your favorite websites into standalone desktop applications for macOS with ease!
This tool allows you to create custom desktop apps from web URLs, complete with personalized names and icons.</p>


## How It Works
1. **Enter a URL**: Provide the web address you want to convert into an app.
2. **Customize Options**: Choose whether to use the website title as the app name and upload a custom icon if desired.
3. **Generate App**: Click the big blue button to create your desktop application.
4. **Use**: Once the app is built, you can use it like any other macOS application.

### Options

#### Custom App Names
- Uncheck "Use website title as app name"
- Enter your preferred app name
- Names are automatically sanitized for compatibility

#### Custom Icons
- Uncheck "Use default icon"
- Upload an icon by clicking on the choose file button

## Requirements

### System Requirements
- **macOS** Sequoia (not tested on earlier versions)
- Any M series mac (only tested on arm64)
- **Node.js + npm** Download and install from [Node.js](https://nodejs.org/)
- At least 1GB free disk space
- Electron Builder installed globally (`npm install -g electron-builder`)

# DISCLAIMER: Each generated app requires an internet connection to function. The developer is not responsible for any issues arising from the use of generated applications.

## Getting Started
### Installation
1. Download the latest release from the [Releases](https://github.com/evanchowdhry/command/releases) page.
2. Download and install [Node.js](https://nodejs.org/) and ensure `npm` is available in your terminal.
3. Open your terminal and run:
   ```bash
   npm install -g electron-builder
   ```
4. Done.

## Troubleshooting

### Common Issues

**URL validation failed**
- Check internet connection
- Ensure URL is accessible
- Try with http:// or https:// prefix

**App build failed**
- Verify Node.js installation
- Check available disk space
- Ensure no antivirus interference
- Create an issue on GitHub with error logs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
