<div align="center">
  <img src="https://github.com/user-attachments/assets/50986c16-1922-43d7-927a-c0c6296eaffd" alt="Showcase" width=800 height=800 />

  # `Zama`
  ## Run local, private LLMs offline using Ollama

![License](https://img.shields.io/github/license/myferr/zama?logo=github&style=for-the-badge)
![Issues](https://img.shields.io/github/issues/myferr/zama?logo=github&style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/myferr/zama?logo=github&style=for-the-badge)
![Repo Size](https://img.shields.io/github/repo-size/myferr/zama?logo=github&style=for-the-badge)
![Built with](https://img.shields.io/badge/built%20with-Tauri-blue?logo=tauri&style=for-the-badge)
![Frontend](https://img.shields.io/badge/frontend-Preact-673AB8?logo=preact&style=for-the-badge)
[![Build](https://github.com/myferr/zama/actions/workflows/build.yml/badge.svg)](https://github.com/myferr/zama/actions/workflows/build.yml)

</div>

Zama is a cross-platform lightweight desktop application to manage and chat with local large language models using Ollama, it's built with Tauri and Preact.

The only feature that requires you to be connected to the internet is **model lookup** and **model installation**.

### Features
* Browse model library
* Install models
* Chat with models
* Customize temperature, context length, and system prompt
* Select models
* Copy responses (clipboard icon under model responses)
* Remove/delete models
* Auto update
* Ollama status check and auto-start functionality
* Dark/light mode support
* Chat history
* Markdown support

and more to come soon!

### Running Zama

#### Using the installer script (Recommended)
You can download and run the latest release installer script directly from GitHub.

**Bash/Linux/macOS:**
```sh
curl -L https://raw.githubusercontent.com/myferr/zama/main/scripts/install.sh | bash
```

**PowerShell/Windows:** (Requires PowerShell 7 or later)
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/myferr/zama/main/scripts/install.ps1" -OutFile install.ps1; .\install.ps1; Remove-Item install.ps1; setx OLLAMA_ORIGINS "*"
```

#### Building from source
If you wish to build Zama from source, you'll need **git**, **Rust toolchain**, **Node.js**, **pnpm/yarn/npm/bun**, and **Ollama**.

```sh
git clone https://github.com/myferr/zama.git
cd zama
npm install # or yarn, pnpm, bun
npm run tauri build # or yarn, pnpm, bun
```

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 MyferIsADev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
