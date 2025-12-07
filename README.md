# PasteGuard (Chrome Extension)

PasteGuard warns you when the text you copy looks like sensitive credentials (API keys, tokens, passwords, private keys, etc.) on any website. It listens for copy/cut events and briefly shows a toast on the page if a match is detected.

## Install (unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and choose this folder.
4. Navigate to any page and try copying text that resembles a secret (e.g., `AKIA...` or a JWT) to see the warning.

## How it works

- A content script (`src/content-script.js`) listens for copy/cut/paste events, inspects the text, and checks it against common credential patterns (JWT regex is lenient enough for short demo tokens; email addresses and credit card numbers are treated as sensitive too).
- On paste of sensitive-looking text, the paste is blocked and a confirmation dialog lets you cancel or “Paste anyway.”
- If potential secrets are found, a lightweight toast (`src/content-style.css`) appears on the page for a few seconds identifying the suspected secret types.
- The popup (`popup.html`) simply explains what the extension does when opened from the toolbar.

## Customizing detection

- Add or adjust regex patterns in `src/content-script.js` within the `sensitivePatterns` array.
- Tweak the toast styling in `src/content-style.css` if you prefer a different look or placement.

## Notes

- Detection is heuristic; it may surface false positives or miss uncommon credential formats. Refine the regexes to fit your environment.
- The extension is static and does not send any data off the page.
