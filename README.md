# Xbox Live Marketplace Search

A specialized web interface designed to browse, filter, and search the [Xbox Live Marketplace Archive](https://github.com/jamesruddick/xbox-live-marketplace-archive). This project provides a user-friendly way to navigate more than 72,000 Xbox 360 marketplace records, making the preservation data accessible to everyone.

## 🚀 Getting Started

### Clone the Repository
Because the marketplace data is stored in a separate repository, you must initialize submodules when cloning to ensure the search engine has data to parse.

```bash
git clone --recurse-submodules https://github.com/jamesruddick/xbox-live-marketplace-search.git
```

If you already cloned without submodules, fetch the data with:

```bash
git submodule update --init
```

### Run It Locally
The page loads the archive with `fetch`, which browsers block for pages opened straight from disk, so serve it over HTTP. From the repository root (requires [Node.js](https://nodejs.org)):

```bash
npx serve
```

Then open [http://localhost:3000](http://localhost:3000).

## 📜 License
This project is dedicated to the public domain under the [CC0 1.0 Universal](LICENSE) license. The archive data has its own license; see the [archive repository](https://github.com/jamesruddick/xbox-live-marketplace-archive#-license).
