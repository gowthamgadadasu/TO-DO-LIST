# TO DO LIST

A single-page, notepad-style to-do list. Black and deep-blue theme, no boxes or cards — just a title, a ruled add-line, and your missions listed one below the other.

## Files

- `index.html` — page structure
- `styles.css` — theme and layout (colors, type, spacing)
- `script.js` — add / edit / done / remove logic and persistence
- `manifest.json` — app name, icons, and display mode for installing as a PWA
- `sw.js` — service worker that caches the app shell for offline use
- `icon-192.png`, `icon-512.png` — app icons used by the manifest

## Running it

This app is now an installable PWA, but it still needs to be served over
HTTP(S) (not opened as a `file://` path) for the service worker and
install prompt to work — e.g. `npx serve .` or any static file server.

- **Desktop (Chrome/Edge):** open the folder's URL, then click the install
  icon in the address bar (or the browser's "Install app" menu option).
- **Android (Chrome):** open the URL, then use "Add to Home screen" from
  the browser menu.
- **iOS (Safari):** open the URL, tap Share, then "Add to Home Screen".

Once installed, the app opens in its own window/icon and keeps working
without a network connection, since the app shell is cached by `sw.js`.
If you just want to use it in a regular browser tab, opening `index.html`
directly still works exactly as before.

## How it works

- Type a mission in the add-line and press **Enter** or click **Add**.
- **Single click** a mission to mark it done (strikes it through). Click it again to undo.
- **Double click** a mission to open a menu with three options:
  - **Edit text** — turns the line into an editable field
  - **Select** — enters multi-select mode so you can tap other missions and then **Mark done** or **Remove** them together from the bar above the list
  - **Remove** — fades the line out and deletes it
- Click anywhere else on the page to close the menu.
- Your list is saved automatically (via `window.storage` when available, falling back to the browser's local storage), so it's still there next time you open the page.

## Customizing

- Colors and fonts live at the top of `styles.css` under `:root`.
- Fonts used: Space Grotesk (title), Inter (body text), JetBrains Mono (meta labels).
