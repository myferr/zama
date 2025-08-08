<div align="center">
  <img src="https://myferr.foo.ng/cdn/01K248XAFDVP2GXCTKPD5A4ESY/zama_showcase.png" alt="Showcase" width=800 height=800 />

  # `Zama`
  ## Run local, private LLMs offline using Ollama

![License](https://img.shields.io/github/license/myferr/zama?logo=github&style=for-the-badge)
![Issues](https://img.shields.io/github/issues/myferr/zama?logo=github&style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/myferr/zama?logo=github&style=for-the-badge)
![Repo Size](https://img.shields.io/github/repo-size/myferr/zama?logo=github&style=for-the-badge)
![Built with](https://img.shields.io/badge/built%20with-Tauri-blue?logo=tauri&style=for-the-badge)
![Frontend](https://img.shields.io/badge/frontend-Preact-673AB8?logo=preact&style=for-the-badge)

</div>

Zama is a cross-platform lightweight desktop application to manage and chat with local large language models using Ollama, it's built with Tauri and Preact ~~i should've used React~~.

The only feature that requires you to be connected to the internet is **model lookup** and **model installation**.

### Features
* Model library
* Model installation
* Model chat
* Temperature, context length, and system prompt customization
* Model selection
* Response copy (small clipboard icon under model responses)
and more to come soon!

### Running Zama
Right now Zama has no pre-built binaries and is in active development, if you wish to use Zama in such early stages you'll have to manually build it (don't worry, it's easy!)

You'll need **git**, **Rust toolchain**, **Node.js**, **pnpm/yarn/npm/bun**, and **Ollama**.

```sh
git clone https://github.com/myferr/zama.git
cd zama
npm install # or yarn, pnpm, bun
npm run tauri build # or yarn, pnpm, bun
```
