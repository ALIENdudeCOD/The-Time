# chronoterm

A minimal terminal-inspired clock: just the current local time on a dark background.

## Run locally

Open `index.html` in a modern browser, or start a local server from this directory:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Stop the server with `Ctrl+C`.

Press `F` or use the small fullscreen control in the bottom-right corner. The control appears when you move the pointer over the page.

The clock uses your computer's local time. IBM Plex Mono loads from Google Fonts when internet access is available; a system monospace font is used as a fallback.
