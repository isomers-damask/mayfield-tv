# Mayfield Advanced Chiro TV

Waiting-room display for Mayfield Advanced Chiropractic, Alexandria, Louisiana. Served by GitHub Pages; the lobby PC opens the site in Chrome full screen.

- `index.html`, `src/` : the player (1920x1080 stage: side third, main screen, crawler; nine main layouts; QR codes; monthly themes; YouTube Shorts breaks).
- `content/live.json` : what the TV plays this week. Written by `tools/publish.py`, never by hand.
- `content/library.json` : evergreen approved items that rotate back in.
- `content/weeks/` : each week's drafted candidates.
- `docs/WEEKLY.md` : the Sunday draft / Monday publish procedure.
- `media/` : logo, music loops (original compositions; Silent Night is the 1818 public-domain tune), background clips.

The TV keeps the last good copy if the internet drops, and falls back to `content/fallback.js` if it has never loaded.
