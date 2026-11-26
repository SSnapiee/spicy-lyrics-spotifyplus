# Spicy Lyrics for Spotify Plus (v0.2, unofficial port)

Replaces Spotify's fullscreen lyrics page with synced lyrics from the Spicy Lyrics service:
line-by-line and word-by-word lyrics, background vocals, duet alignment, interludes, tap a line to seek,
and unsynced lyrics when that's all a song has.

## Install

1. Put the `spicy-lyrics` folder **inside** a folder of your choice, e.g. `Download/SpotifyPlusExtensions/spicy-lyrics`.
2. In Spotify: Spotify Plus settings > Developer.
3. Turn **Developer mode** on.
4. **Choose folder** and pick the *parent* folder (`SpotifyPlusExtensions`), not `spicy-lyrics` itself.
5. Tap **Refresh**. "Spicy Lyrics" should appear under *Local extensions*.
6. Play a song and open the lyrics page.

If anything goes wrong inside the page, it falls back to Spotify's own lyrics page. You can also switch it off
under the extension's settings ("Use Spicy Lyrics").

## Settings

Use Spicy Lyrics, word-by-word highlight, background vocals, romanization, translation, text size, backup lyrics
(LRCLIB), API client version (advanced), clear lyrics cache.

## What this version does not have

This is a rewrite for Spotify Plus's native UI, not a copy of the desktop extension, so these desktop features are
not here yet: dynamic/animated backgrounds, animated artwork and canvas, the now-playing-bar and sidebar lyrics,
fullscreen/compact modes, queue view, pop-up lyrics, local lyrics upload and editor, custom themes and fonts, and
romanization/translation computed on the device (it only shows what the service sends).
The word highlight is a stepwise fade (about 10 updates a second) instead of a smooth wipe.

## Notes

- Lyrics are requested from `api.spicylyrics.org`, and your Spotify access token is sent with the request, the same way the
  desktop Spicy Lyrics does. Nothing else is sent. Lyrics are cached on the phone for 6 days.
- If the Spicy Lyrics service refuses the request (for example HTTP 418), the page shows the status and what the service
  said, then uses LRCLIB (https://lrclib.net, an open lyrics database) as a backup. Backup lyrics are line-synced only,
  with no word-by-word highlight, and the end of the page says where they came from. Turn this off with "Backup lyrics".
- No Spicy Lyrics source code is included; this is a fresh implementation that speaks the same API.

Credit: Spicy Lyrics by Spikerko (https://github.com/Spikerko/spicy-lyrics).
