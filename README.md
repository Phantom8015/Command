# ⌘ Command - Web to Desktop App Converter
Convert your favorite websites into standalone desktop applications for macOS with ease!
This tool allows you to create custom desktop apps from web URLs, complete with personalized names and icons.

## How It Works
1. **Enter a URL**: Provide the web address you want to convert into an app.
2. **Customize Options**: Choose whether to use the website title as the app name and upload a custom icon if desired.
3. **Generate App**: Click the big blue button to create your desktop application.
4. **Download**: Once the app is built, you can use it like any other macOS application.

### Options

#### Custom App Names
- Uncheck "Use website title as app name"
- Enter your preferred app name
- Names are automatically sanitized for compatibility

#### Custom Icons
- Uncheck "Use default icon"
- Upload PNG, JPG, WebP, TIFF, or GIF files
- Icons are automatically resized to 512x512 pixels
- Maximum file size: 10MB

## 📋 Requirements

### System Requirements
- **macOS** Sequoia (not tested on earlier versions)
- **Node.js + npm** Download and install from [Node.js](https://nodejs.org/)
- At least 1GB free disk space
- Electron Builder installed globally (`npm install -g electron-builder`)

### Generated App Requirements
- **macOS** 10.13 or later
- Internet connection (for web content)

## 🚀 Getting Started
### Installation
1. Download the latest release from the [Releases](https://github.com/evanchowdhry/command/releases) page.
2. Done.

## 🐛 Troubleshooting

### Common Issues

**"URL validation failed"**
- Check internet connection
- Ensure URL is accessible
- Try with http:// or https:// prefix

**"App build failed"**
- Verify Node.js installation
- Check available disk space
- Ensure no antivirus interference

**"Custom icon not working"**
- Use supported formats: PNG, JPG, WebP, TIFF, GIF
- Keep file size under 10MB
- Try different image if processing fails

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.