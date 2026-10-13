# Xbox Live Marketplace Search

A specialized web interface designed to browse, filter, and search the [Xbox Live Marketplace Archive](https://github.com/jamesruddick/xbox-live-marketplace-archive). This project provides a user-friendly way to navigate thousands of metadata records, making the preservation data accessible to everyone.

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
The page loads the archive with `fetch`, so it needs to be served over HTTP rather than opened as a file. From the repository root:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Any static file server works (for example `npx serve`).

### Adding a Locale
When a new locale lands in the archive (`xbox-live-marketplace.<locale>.csv` plus its `xbox-live-marketplace.<locale>/` folder), add its code to the `LOCALES` list at the top of `index.js`. It then appears in the locale picker; `en-us` stays the default, and a locale can be linked directly with `?locale=<code>`.
