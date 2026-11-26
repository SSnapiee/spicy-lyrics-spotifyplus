globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.tsx
var import_spotifyplus7 = require("spotifyplus");

// src/prefs.ts
var import_spotifyplus = require("spotifyplus");
var DEFAULT_PREFS = {
  enabled: true,
  showRomanization: true,
  showTranslation: false,
  showBackgroundVocals: true,
  animateSyllables: true,
  fontScale: 1,
  fallbackLrclib: true,
  useBeautifulSource: true,
  timingOffsetMs: 250,
  animatedBackground: true,
  springMotion: false,
  apiVersion: "5.22.3"
};
var KEYS = Object.keys(DEFAULT_PREFS);
function load() {
  const out = { ...DEFAULT_PREFS };
  for (const key of KEYS) {
    try {
      const value = import_spotifyplus.SpotifyPlus.Platform.Storage.get(key);
      if (value !== null && value !== void 0 && typeof value === typeof DEFAULT_PREFS[key]) {
        out[key] = value;
      }
    } catch {
    }
  }
  return out;
}
var current = load();
var listeners = /* @__PURE__ */ new Set();
var getPrefs = () => current;
function subscribePrefs(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function setPref(key, value) {
  if (current[key] === value) return;
  current = { ...current, [key]: value };
  try {
    import_spotifyplus.SpotifyPlus.Platform.Storage.set(key, value);
  } catch {
  }
  for (const listener of [...listeners]) listener();
}
function isPrefKey(id) {
  return KEYS.includes(id);
}

// src/api.ts
var import_spotifyplus2 = require("spotifyplus");

// src/util.ts
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// src/lrclib.ts
var BASE = "https://lrclib.net/api";
var TIMEOUT_MS = 12e3;
var USER_AGENT = "SpicyLyrics-SpotifyPlus-port/0.2.0";
var LAST_LINE_SECONDS = 6;
var STAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
function parseLrc(lrc, durationSec) {
  const entries = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [];
    STAMP.lastIndex = 0;
    let match;
    while ((match = STAMP.exec(raw)) !== null) {
      const fraction = match[3] ? Number("0." + match[3]) : 0;
      stamps.push(Number(match[1]) * 60 + Number(match[2]) + fraction);
    }
    if (stamps.length === 0) continue;
    const text = raw.replace(STAMP, "").trim();
    for (const time of stamps) entries.push({ time, text });
  }
  entries.sort((a, b) => a.time - b.time);
  const content = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry.text) continue;
    const next = entries[i + 1];
    let end = next ? next.time : entry.time + LAST_LINE_SECONDS;
    if (!next && durationSec && durationSec > entry.time) end = Math.min(end, durationSec);
    if (end <= entry.time) end = entry.time + 1;
    content.push({ Type: "Vocal", StartTime: entry.time, EndTime: end, Text: entry.text });
  }
  if (content.length < 2) return null;
  return { Type: "Line", StartTime: content[0].StartTime, EndTime: content[content.length - 1].EndTime, Content: content };
}
function plainToStatic(plain) {
  const lines = plain.split(/\r?\n/).map((line) => line.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  if (lines.length === 0) return null;
  return { Type: "Static", Lines: lines.map((Text3) => ({ Text: Text3 })) };
}
function recordToLyrics(record, durationSec) {
  if (record.instrumental) return { Type: "Static", Lines: [{ Text: "\u266A Instrumental \u266A" }] };
  if (record.syncedLyrics) {
    const synced = parseLrc(record.syncedLyrics, durationSec ?? record.duration);
    if (synced) return synced;
  }
  if (record.plainLyrics) return plainToStatic(record.plainLyrics);
  return null;
}
async function getJson(url) {
  const response = await withTimeout(fetch(url, { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }), TIMEOUT_MS);
  let json = null;
  try {
    json = await response.json();
  } catch {
  }
  return { status: response.status, json };
}
var enc = encodeURIComponent;
async function fetchFromLrclib(meta, isCancelled = () => false) {
  const title = meta.title?.trim();
  const artist = meta.artist?.trim();
  if (!title || !artist) return null;
  const duration = meta.durationSec && meta.durationSec > 0 ? Math.round(meta.durationSec) : void 0;
  try {
    let url = `${BASE}/get?track_name=${enc(title)}&artist_name=${enc(artist)}`;
    if (meta.album) url += `&album_name=${enc(meta.album)}`;
    if (duration) url += `&duration=${duration}`;
    const exact = await getJson(url);
    if (isCancelled()) return null;
    if (exact.status === 200 && exact.json && typeof exact.json === "object") {
      const lyrics = recordToLyrics(exact.json, duration);
      if (lyrics) return lyrics;
    }
    const search = await getJson(`${BASE}/search?track_name=${enc(title)}&artist_name=${enc(artist)}`);
    if (isCancelled()) return null;
    if (search.status !== 200 || !Array.isArray(search.json)) return null;
    const records = search.json.filter((item) => item && (item.syncedLyrics || item.plainLyrics || item.instrumental));
    const close = (item) => !duration || typeof item.duration !== "number" || Math.abs(item.duration - duration) <= 3;
    const pick = records.find((item) => item.syncedLyrics && close(item)) ?? records.find((item) => item.syncedLyrics) ?? records.find(close) ?? records[0];
    return pick ? recordToLyrics(pick, duration) : null;
  } catch {
    return null;
  }
}

// src/offset.ts
function applyLyricOffset(lyrics) {
  const offset = lyrics.LyricOffset;
  const copy = JSON.parse(JSON.stringify(lyrics));
  delete copy.LyricOffset;
  if (copy.Type === "Static" || typeof offset !== "number" || !Number.isFinite(offset) || offset === 0) return copy;
  const shift = (timed) => {
    timed.StartTime = Math.max(0, timed.StartTime + offset);
    timed.EndTime = Math.max(0, timed.EndTime + offset);
  };
  shift(copy);
  if (copy.Type === "Line") {
    for (const item of copy.Content) shift(item);
    return copy;
  }
  for (const group of copy.Content) {
    if (group.Type !== "Vocal") {
      shift(group);
      continue;
    }
    for (const vocal of [group.Lead, ...group.Background ?? []]) {
      shift(vocal);
      for (const syllable of vocal.Syllables ?? []) shift(syllable);
    }
  }
  return copy;
}

// src/beautiful.ts
var URL_BASE = "https://spotifyplus-api.devon-shoutz.workers.dev/api/lyrics/";
var TIMEOUT_MS2 = 15e3;
function isUsable(value) {
  const v = value;
  if (!v || typeof v !== "object") return false;
  if (v.Partial) return false;
  if (v.Type === "Static") return Array.isArray(v.Lines) && v.Lines.length > 0;
  if (v.Type === "Line" || v.Type === "Syllable") return Array.isArray(v.Content) && v.Content.length > 0;
  return false;
}
async function fetchFromBeautiful(trackId, isCancelled = () => false) {
  try {
    const response = await withTimeout(fetch(URL_BASE + encodeURIComponent(trackId), { headers: { Accept: "application/json" } }), TIMEOUT_MS2);
    if (isCancelled() || !response.ok) return null;
    const json = await response.json();
    if (isCancelled() || !isUsable(json)) return null;
    const provider = typeof json.source === "string" && json.source.trim() ? String(json.source).trim() : void 0;
    return { lyrics: applyLyricOffset(json), provider };
  } catch {
    return null;
  }
}

// src/api.ts
var API_URL = "https://api.spicylyrics.org/query";
var CACHE_TTL_MS = 6 * 24 * 60 * 60 * 1e3;
var REQUEST_TIMEOUT_MS = 15e3;
var QUEUE_RETRY_DELAYS_MS = [2e3, 3e3, 4e3, 5e3, 6e3, 8e3];
var BACKUP_TTL_MS = 24 * 60 * 60 * 1e3;
var cachePath = (trackId) => `lyrics/${trackId}.json`;
function isLyrics(value) {
  const type = value?.Type;
  return !!value && typeof value === "object" && (type === "Syllable" || type === "Line" || type === "Static");
}
function readCache(trackId) {
  try {
    const entry = import_spotifyplus2.SpotifyPlus.Platform.Storage.Cache.read(cachePath(trackId));
    if (entry && typeof entry === "object" && !(entry instanceof Uint8Array)) {
      const e = entry;
      const source = e.source === "lrclib" || e.source === "beautiful" ? e.source : "spicy";
      const ttl = source === "spicy" ? CACHE_TTL_MS : BACKUP_TTL_MS;
      if (typeof e.at === "number" && Date.now() - e.at < ttl && isLyrics(e.lyrics)) return { lyrics: e.lyrics, source, provider: typeof e.provider === "string" ? e.provider : void 0 };
    }
  } catch {
  }
  return null;
}
var INDEX_KEY = "cacheIndex";
var MAX_CACHED = 400;
function readIndex() {
  try {
    const value = import_spotifyplus2.SpotifyPlus.Platform.Storage.get(INDEX_KEY);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
function writeIndex(index) {
  try {
    import_spotifyplus2.SpotifyPlus.Platform.Storage.set(INDEX_KEY, index);
  } catch {
  }
}
function writeCache(trackId, lyrics, source, provider) {
  try {
    import_spotifyplus2.SpotifyPlus.Platform.Storage.Cache.write(cachePath(trackId), { at: Date.now(), lyrics, source, provider });
    const index = readIndex().filter((id) => id !== trackId);
    index.push(trackId);
    while (index.length > MAX_CACHED) {
      const oldest = index.shift();
      if (oldest) import_spotifyplus2.SpotifyPlus.Platform.Storage.Cache.delete(cachePath(oldest));
    }
    writeIndex(index);
  } catch {
  }
}
function clearLyricsCache() {
  const index = readIndex();
  let removed = 0;
  for (const id of index) {
    try {
      import_spotifyplus2.SpotifyPlus.Platform.Storage.Cache.delete(cachePath(id));
      removed += 1;
    } catch {
    }
  }
  writeIndex([]);
  import_spotifyplus2.SpotifyPlus.log(`Spicy Lyrics: cleared ${removed} cached lyrics`);
  return removed;
}
function pickResult(json) {
  const list = Array.isArray(json?.queries) ? json.queries : [];
  const results = list.map((entry) => ({ entry, result: entry?.result })).filter((item) => item.result && typeof item.result === "object");
  const byId = results.find((item) => String(item.entry?.operationId) === "0");
  const byName = results.find((item) => item.entry?.operation === "lyrics");
  const byPayload = results.find((item) => isLyrics(item.result?.data));
  const chosen = byId ?? byName ?? byPayload ?? results[0];
  if (!chosen) return null;
  const r = chosen.result;
  return { httpStatus: Number(r.httpStatus ?? 0), data: r.data, format: r.format };
}
function parsePayload(result) {
  let data = result.data;
  if (typeof data === "string" && (result.format === "json" || data.trim().startsWith("{"))) {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  return isLyrics(data) ? data : null;
}
async function postQuery(trackId, token) {
  const version = getPrefs().apiVersion;
  const response = await withTimeout(
    fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "SpicyLyrics-WebAuth": `Bearer ${token}`,
        "SpicyLyrics-Version": version
      },
      body: JSON.stringify({
        queries: [{ operation: "lyrics", variables: { id: trackId, auth: "SpicyLyrics-WebAuth" } }],
        client: { version }
      })
    }),
    REQUEST_TIMEOUT_MS
  );
  let text = "";
  try {
    text = await response.text();
  } catch {
  }
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
  }
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 140);
  return { status: response.status, json, snippet };
}
function getToken() {
  try {
    return String(import_spotifyplus2.SpotifyPlus.Platform.Session.accessToken ?? "");
  } catch {
    return "";
  }
}
var SPICY_PAUSE_MS = 10 * 60 * 1e3;
var spicyPausedUntil = 0;
function resumeSpicy() {
  spicyPausedUntil = 0;
}
async function fetchFromSpicy(trackId, isCancelled) {
  let token = getToken();
  if (!token) return { ok: false, reason: "no-token" };
  let usedRefreshedToken = false;
  for (let attempt = 0; attempt <= QUEUE_RETRY_DELAYS_MS.length; attempt += 1) {
    if (isCancelled()) return { ok: false, reason: "cancelled" };
    let reply;
    try {
      reply = await postQuery(trackId, token);
    } catch (error) {
      return { ok: false, reason: "network", detail: error?.message };
    }
    if (isCancelled()) return { ok: false, reason: "cancelled" };
    if (reply.status === 429) return { ok: false, reason: "rate-limited", status: 429 };
    const result = pickResult(reply.json);
    const status = result?.httpStatus || reply.status;
    if (status === 401 || status === 403) {
      const fresh = getToken();
      if (!usedRefreshedToken && fresh && fresh !== token) {
        usedRefreshedToken = true;
        token = fresh;
        continue;
      }
      return { ok: false, reason: "unauthorized", status, detail: reply.snippet || void 0 };
    }
    if (status === 503) {
      if (attempt === QUEUE_RETRY_DELAYS_MS.length) return { ok: false, reason: "queued", status };
      await sleep(QUEUE_RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (status === 404) return { ok: false, reason: "not-found", status };
    if (!result || status !== 200) {
      return { ok: false, reason: "bad-response", status, detail: reply.snippet || (result ? void 0 : "no result in response") };
    }
    const lyrics = parsePayload(result);
    if (!lyrics) {
      const packed = typeof result.data === "string";
      return {
        ok: false,
        reason: packed ? "unsupported-format" : "not-found",
        status,
        detail: packed ? "lyrics arrived in a format this port cannot read yet" : "empty lyrics payload"
      };
    }
    return { ok: true, lyrics: applyLyricOffset(lyrics), from: "api", source: "spicy" };
  }
  return { ok: false, reason: "queued" };
}
async function fetchLyrics(trackId, isCancelled = () => false, meta) {
  const cached = readCache(trackId);
  if (cached && cached.source === "spicy") return { ok: true, lyrics: cached.lyrics, from: "cache", source: "spicy" };
  const fromCache = () => cached ? { ok: true, lyrics: cached.lyrics, from: "cache", source: cached.source, provider: cached.provider } : null;
  let primary;
  if (Date.now() < spicyPausedUntil) {
    const hit2 = fromCache();
    if (hit2) return hit2;
    primary = { ok: false, reason: "unauthorized", detail: "Paused after the service refused this client." };
  } else {
    primary = await fetchFromSpicy(trackId, isCancelled);
  }
  if (primary.ok) {
    writeCache(trackId, primary.lyrics, "spicy");
    return primary;
  }
  if (primary.reason === "cancelled") return primary;
  if (primary.reason === "unauthorized" || primary.reason === "bad-response" && primary.status === 418) {
    spicyPausedUntil = Date.now() + SPICY_PAUSE_MS;
  }
  const hit = fromCache();
  if (hit) return hit;
  const prefs = getPrefs();
  let triedBackup = false;
  if (prefs.useBeautifulSource) {
    triedBackup = true;
    const found = await fetchFromBeautiful(trackId, isCancelled);
    if (isCancelled()) return { ok: false, reason: "cancelled" };
    if (found) {
      writeCache(trackId, found.lyrics, "beautiful", found.provider);
      return { ok: true, lyrics: found.lyrics, from: "api", source: "beautiful", provider: found.provider };
    }
  }
  if (prefs.fallbackLrclib && meta) {
    triedBackup = true;
    const backup = await fetchFromLrclib(meta, isCancelled);
    if (isCancelled()) return { ok: false, reason: "cancelled" };
    if (backup) {
      writeCache(trackId, backup, "lrclib");
      return { ok: true, lyrics: backup, from: "api", source: "lrclib" };
    }
  }
  if (triedBackup && primary.reason !== "not-found") {
    const note = "No backup lyrics found either.";
    return { ...primary, detail: primary.detail ? `${primary.detail} ${note}` : note };
  }
  return primary;
}

// src/ui/Page.tsx
var import_react7 = __toESM(require("react"));
var import_react8 = require("spotifyplus/react");
var import_spotifyplus6 = require("spotifyplus");

// src/clock.ts
var import_spotifyplus3 = require("spotifyplus");
var TICK_MS = 40;
var SYNC_MS = 500;
var PlaybackClock = class {
  constructor() {
    this.base = 0;
    this.at = Date.now();
    this.playing = false;
    this.listeners = /* @__PURE__ */ new Set();
    this.tickTimer = null;
    this.syncTimer = null;
    this.syncing = false;
    this.eventsBound = false;
    /** Seconds by which lyrics are shown ahead of the song (display delay compensation). */
    this.offset = () => (Number(getPrefs().timingOffsetMs) || 0) / 1e3;
    /** The playback position in seconds, plus the timing offset: what the lyrics should be showing. */
    this.now = () => {
      const raw = this.playing ? this.base + (Date.now() - this.at) / 1e3 : this.base;
      return raw + this.offset();
    };
    this.isPlaying = () => this.playing;
    this.subscribe = (listener) => {
      this.listeners.add(listener);
      if (this.listeners.size === 1) this.start();
      return () => {
        this.listeners.delete(listener);
        if (this.listeners.size === 0) this.stop();
      };
    };
    /** Forces a re-read from Spotify, e.g. after a seek or track change. */
    this.resync = async () => {
      if (this.syncing) return;
      this.syncing = true;
      try {
        const askedAt = Date.now();
        const progressMs = await Promise.resolve(import_spotifyplus3.SpotifyPlus.Player.getProgress());
        if (typeof progressMs === "number" && Number.isFinite(progressMs)) {
          this.base = progressMs / 1e3;
          this.at = (askedAt + Date.now()) / 2;
        }
        const state = await Promise.resolve(import_spotifyplus3.SpotifyPlus.Player.getState());
        if (state && typeof state.isPlaying === "boolean") this.playing = state.isPlaying;
      } catch (error) {
        import_spotifyplus3.SpotifyPlus.warn("Spicy Lyrics: could not read playback position", error);
      } finally {
        this.syncing = false;
      }
    };
  }
  emit() {
    for (const listener of [...this.listeners]) listener();
  }
  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;
    import_spotifyplus3.SpotifyPlus.Events.on("playPause", (payload) => {
      this.base = this.now() - this.offset();
      this.at = Date.now();
      this.playing = !!payload?.isPlaying;
      void this.resync();
      this.emit();
    });
    import_spotifyplus3.SpotifyPlus.Events.on("trackSeeked", (payload) => {
      if (typeof payload?.positionMs === "number") {
        this.base = payload.positionMs / 1e3;
        this.at = Date.now();
      }
      void this.resync();
      this.emit();
    });
    import_spotifyplus3.SpotifyPlus.Events.on("songChanged", () => {
      this.base = 0;
      this.at = Date.now();
      void this.resync();
      this.emit();
    });
  }
  start() {
    this.bindEvents();
    void this.resync();
    this.tickTimer = setInterval(() => this.emit(), TICK_MS);
    this.syncTimer = setInterval(() => void this.resync(), SYNC_MS);
  }
  stop() {
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    if (this.syncTimer !== null) clearInterval(this.syncTimer);
    this.tickTimer = null;
    this.syncTimer = null;
  }
};
var clock = new PlaybackClock();

// src/transform.ts
var MIN_INTERLUDE = 4;
var END_INTERLUDE_EARLY = 0.25;
var RTL_CHARS = /[֐-ࣿיִ-﷿ﹰ-﻿]/g;
var LETTER_LIKE = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-ࣿיִ-﷿ﹰ-﻿぀-ヿ㐀-鿿가-힯]/g;
function isRtlText(text) {
  const rtl = text.match(RTL_CHARS)?.length ?? 0;
  if (rtl === 0) return false;
  const letters = text.match(LETTER_LIKE)?.length ?? rtl;
  return rtl / Math.max(letters, 1) > 0.5;
}
var clean = (value) => {
  const text = value?.trim();
  return text ? text : void 0;
};
function groupWords(syllables) {
  const words = [];
  let current2 = null;
  syllables.forEach((syllable, index) => {
    if (!current2) current2 = { syllables: [], space: false };
    current2.syllables.push({ text: syllable.Text, start: syllable.StartTime, end: syllable.EndTime });
    const continues = !!syllable.IsPartOfWord && index < syllables.length - 1;
    if (!continues) {
      current2.space = index < syllables.length - 1;
      words.push(current2);
      current2 = null;
    }
  });
  if (current2) words.push(current2);
  return words;
}
function wordsToText(words) {
  return words.map((word) => word.syllables.map((s) => s.text).join("") + (word.space ? " " : "")).join("").trim();
}
function joinOptional(syllables, pick) {
  if (!syllables.some((s) => clean(pick(s)))) return void 0;
  let out = "";
  syllables.forEach((s, index) => {
    out += pick(s) ?? s.Text;
    if (index < syllables.length - 1 && !s.IsPartOfWord) out += " ";
  });
  return clean(out);
}
function vocalStart(lead, background) {
  return Math.min(lead.StartTime, ...(background ?? []).map((b) => b.StartTime));
}
function vocalEnd(lead, background) {
  return Math.max(lead.EndTime, ...(background ?? []).map((b) => b.EndTime));
}
function interlude(start, end) {
  return { kind: "interlude", start, end };
}
function addInterludes(lines) {
  if (lines.length === 0) return lines;
  const out = [];
  const first = lines[0];
  if (first.kind === "vocal" && first.start >= MIN_INTERLUDE) {
    out.push(interlude(0, first.start - END_INTERLUDE_EARLY));
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    out.push(line);
    const next = lines[i + 1];
    if (!next) continue;
    if (line.kind === "interlude" || next.kind === "interlude") continue;
    if (next.start - line.end >= MIN_INTERLUDE) {
      out.push(interlude(line.end, next.start - END_INTERLUDE_EARLY));
    }
  }
  return out;
}
function transformLyrics(lyrics) {
  const writers = (lyrics.SongWriters ?? []).filter(Boolean);
  if (lyrics.Type === "Static") {
    const staticLines = lyrics.Lines.map((line) => line.Text ?? "");
    return { type: "Static", lines: [], staticLines, writers, rtl: isRtlText(staticLines.join("\n")) };
  }
  const lines = [];
  if (lyrics.Type === "Line") {
    for (const item of lyrics.Content) {
      if (item.Type === "Interlude") {
        lines.push(interlude(item.StartTime, item.EndTime));
        continue;
      }
      const text = (item.Text ?? "").trim();
      const vocal = {
        kind: "vocal",
        start: item.StartTime,
        end: item.EndTime,
        opposite: !!item.OppositeAligned,
        rtl: isRtlText(text),
        text,
        romanized: clean(item.RomanizedText) ?? clean(item.TransliteratedText),
        translated: clean(item.TranslatedText)
      };
      lines.push(vocal);
    }
  } else {
    for (const item of lyrics.Content) {
      if (item.Type === "Interlude") {
        lines.push(interlude(item.StartTime, item.EndTime));
        continue;
      }
      const lead = item.Lead;
      const words = groupWords(lead.Syllables ?? []);
      const text = wordsToText(words);
      const background = (item.Background ?? []).map((b) => wordsToText(groupWords(b.Syllables ?? []))).filter(Boolean).join(" ");
      const vocal = {
        kind: "vocal",
        start: vocalStart(lead, item.Background),
        end: vocalEnd(lead, item.Background),
        opposite: !!item.OppositeAligned,
        rtl: isRtlText(text),
        text,
        words,
        romanized: joinOptional(lead.Syllables ?? [], (s) => s.RomanizedText) ?? joinOptional(lead.Syllables ?? [], (s) => s.TransliteratedText),
        translated: clean(item.TranslatedText) ?? clean(lead.TranslatedText),
        background: background || void 0
      };
      lines.push(vocal);
    }
  }
  const rtl = isRtlText(lines.map((l) => l.kind === "vocal" ? l.text : "").join("\n"));
  return { type: lyrics.Type, lines: addInterludes(lines), staticLines: [], writers, rtl };
}
function findActiveIndex(lines, position) {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = low + high >> 1;
    if (lines[middle].start <= position) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (found >= 0 && found === lines.length - 1 && position > lines[found].end + 8) return -1;
  return found;
}
function progress(position, start, end) {
  if (end <= start) return position >= start ? 1 : 0;
  return Math.min(1, Math.max(0, (position - start) / (end - start)));
}

// src/ui/colors.ts
function white(alpha) {
  const clamped = Math.min(1, Math.max(0, alpha));
  const hex = Math.round(clamped * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${hex}FFFFFF`;
}
var COLORS = {
  background: "#FF0B0B0F",
  surface: "#1FFFFFFF",
  pressed: "#29FFFFFF",
  future: white(0.3),
  past: white(0.3),
  active: white(1),
  unsung: white(0.4),
  secondary: white(0.55),
  accent: "#FFFFFFFF"
};
var easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2);

// src/ui/hooks.ts
var import_react = require("react");
var import_spotifyplus4 = require("spotifyplus");
function usePrefs() {
  return (0, import_react.useSyncExternalStore)(subscribePrefs, getPrefs, getPrefs);
}
function rowSnapshot(position, start, activeUntil) {
  if (position < start) return 0;
  if (position >= activeUntil) return 1;
  return 2 + Math.floor((position - start) * 24);
}
function useRowSnapshot(start, activeUntil) {
  const get = () => rowSnapshot(clock.now(), start, activeUntil);
  return (0, import_react.useSyncExternalStore)(clock.subscribe, get, get);
}
function readCurrentTrack() {
  try {
    return import_spotifyplus4.SpotifyPlus.Player.getCurrentTrack() ?? null;
  } catch {
    return null;
  }
}
function useCurrentTrack() {
  const [track, setTrack] = (0, import_react.useState)(readCurrentTrack);
  (0, import_react.useEffect)(() => {
    let disposed = false;
    const handler = (payload) => {
      const current2 = readCurrentTrack();
      if (current2 && (!payload?.uri || current2.uri === payload.uri)) {
        if (!disposed) setTrack(current2);
        return;
      }
      if (payload?.uri) {
        void import_spotifyplus4.SpotifyPlus.Internal.getTrack(payload.uri).then((found) => {
          if (!disposed && found) setTrack(found);
        });
      } else if (!disposed) {
        setTrack(current2);
      }
    };
    import_spotifyplus4.SpotifyPlus.Events.on("songChanged", handler);
    return () => {
      disposed = true;
      import_spotifyplus4.SpotifyPlus.Events.off("songChanged", handler);
    };
  }, []);
  return track;
}
function metaOf(track) {
  if (!track || !track.title || !track.artist) return void 0;
  return {
    title: track.title,
    artist: track.artist,
    album: track.album?.name,
    durationSec: typeof track.durationMs === "number" ? track.durationMs / 1e3 : void 0
  };
}
function trackIdOf(track) {
  if (!track) return null;
  if (track.id) return track.id;
  const parts = track.uri?.split(":") ?? [];
  return parts.length === 3 && parts[1] === "track" ? parts[2] : null;
}
function useLyrics(trackId, attempt, meta) {
  const [state, setState] = (0, import_react.useState)({ status: "loading" });
  const metaRef = (0, import_react.useRef)(meta);
  metaRef.current = meta;
  (0, import_react.useEffect)(() => {
    if (!trackId) {
      setState({ status: "error", reason: "not-found", detail: "This item has no lyrics." });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    void fetchLyrics(trackId, () => cancelled, metaRef.current).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        if (result.reason === "cancelled") return;
        setState({ status: "error", reason: result.reason, httpStatus: result.status, detail: result.detail });
        return;
      }
      try {
        const display = transformLyrics(result.lyrics);
        if (result.source === "lrclib") display.credit = "Lyrics from LRCLIB (line-synced backup source)";
        else if (result.source === "beautiful") display.credit = result.provider ? `Lyrics provided by ${result.provider}` : "Lyrics from the SpotifyPlus lyrics service";
        setState({ status: "ready", display, from: result.from });
      } catch (error) {
        import_spotifyplus4.SpotifyPlus.error("Spicy Lyrics: could not read the lyrics data", error);
        setState({ status: "error", reason: "bad-response", detail: error?.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trackId, attempt]);
  return state;
}
function describeFailure(reason, httpStatus, detail) {
  const code = httpStatus ? ` (HTTP ${httpStatus})` : "";
  switch (reason) {
    case "no-token":
      return "Couldn't read your Spotify session. Try again in a moment.";
    case "unauthorized":
      return `The lyrics service refused this request${code}.${detail ? ` ${detail}` : ""}`;
    case "not-found":
      return detail ?? "No lyrics found for this song.";
    case "rate-limited":
      return "The lyrics service is limiting requests right now. Try again shortly.";
    case "queued":
      return "These lyrics are still being prepared. Try again in a moment.";
    case "network":
      return `Couldn't reach the lyrics service.${detail ? ` ${detail}` : ""}`;
    case "unsupported-format":
      return detail ?? "The lyrics came in a format this version cannot read.";
    default:
      return `Unexpected response from the lyrics service${code}.${detail ? ` ${detail}` : ""}`;
  }
}

// src/ui/Rows.tsx
var import_react3 = require("react");
var import_react4 = require("spotifyplus/react");
var import_spotifyplus5 = require("spotifyplus");

// src/ui/SpringBox.tsx
var import_react2 = require("react");
var import_animated = __toESM(require("spotifyplus/react/animated"));
var import_jsx_runtime = require("react/jsx-runtime");
var MASS = 0.9;
var STIFFNESS = 90;
var DAMPING = 15;
var INACTIVE_SCALE = 0.95;
var LIFT = 8;
function SpringBox({ active, alignRight, children }) {
  const v = import_animated.default.useAnimatedValue(active ? 1 : 0);
  (0, import_react2.useEffect)(() => {
    const motion = import_animated.default.spring(v, { toValue: active ? 1 : 0, mass: MASS, stiffness: STIFFNESS, damping: DAMPING, useNativeDriver: true });
    motion.start();
    return () => motion.stop();
  }, [v, active]);
  const style = {
    transformOrigin: alignRight ? "right center" : "left center",
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [LIFT, 0] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [INACTIVE_SCALE, 1] }) }
    ]
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_animated.default.View, { style, children });
}

// src/ui/Rows.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var BASE_FONT = 40;
var FADE_IN_SECONDS = 0.45;
function seekTo(seconds) {
  try {
    import_spotifyplus5.SpotifyPlus.Player.seek(Math.max(0, seconds - clock.offset()) * 1e3);
  } catch (error) {
    import_spotifyplus5.SpotifyPlus.warn("Spicy Lyrics: seek failed", error);
  }
}
function VocalRowBase({ line, activeUntil, prefs }) {
  const snap = useRowSnapshot(line.start, activeUntil);
  const state = snap === 0 ? "future" : snap === 1 ? "past" : "active";
  const fontSize = BASE_FONT * prefs.fontScale;
  const alignRight = line.rtl !== line.opposite;
  const align = alignRight ? "flex-end" : "flex-start";
  const textAlign = alignRight ? "right" : "left";
  const position = clock.now();
  const lineColor = state === "active" ? white(0.3 + 0.7 * easeOut(progress(position, line.start, line.start + FADE_IN_SECONDS))) : state === "past" ? COLORS.past : COLORS.future;
  const syllableMode = state === "active" && prefs.animateSyllables && !!line.words && line.words.length > 0;
  const lead = syllableMode ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.View, { style: { flexDirection: "row", flexWrap: "wrap", justifyContent: align }, children: line.words.map((word, wordIndex) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.View, { style: { flexDirection: "row" }, children: word.syllables.map((syllable, syllableIndex) => {
    const last = syllableIndex === word.syllables.length - 1;
    const raw = progress(position, syllable.start, syllable.end);
    const fill = easeOut(raw);
    const glow = Math.sin(Math.PI * raw);
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_react4.Text,
      {
        style: {
          color: white(0.4 + 0.6 * fill),
          fontSize,
          fontWeight: "900",
          textAlign,
          textShadowColor: white(0.6 * glow),
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14 * glow,
          transform: [{ translateY: -fontSize * 0.06 * (0.35 * fill + 0.65 * glow) }, { scale: 1 + 0.03 * glow }]
        },
        children: syllable.text + (last && word.space ? " " : "")
      },
      syllableIndex
    );
  }) }, wordIndex)) }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.Text, { style: { color: lineColor, fontSize, fontWeight: "900", textAlign }, children: line.text });
  const secondaryColor = state === "active" ? COLORS.secondary : white(0.28);
  const showRomanized = prefs.showRomanization && !!line.romanized && line.romanized !== line.text;
  const showTranslated = prefs.showTranslation && !!line.translated;
  const showBackground = prefs.showBackgroundVocals && !!line.background;
  const body = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    import_react4.Pressable,
    {
      onPress: () => seekTo(line.start),
      style: { paddingVertical: 20, paddingHorizontal: 8, borderRadius: 18, alignItems: align },
      children: [
        lead,
        showBackground && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_react4.Text,
          {
            style: {
              color: state === "active" ? white(0.7) : white(0.25),
              fontSize: fontSize * 0.6,
              fontStyle: "italic",
              fontWeight: "800",
              marginTop: 6,
              textAlign
            },
            children: line.background
          }
        ),
        showRomanized && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.Text, { style: { color: secondaryColor, fontSize: fontSize * 0.55, marginTop: 6, textAlign }, children: line.romanized }),
        showTranslated && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.Text, { style: { color: secondaryColor, fontSize: fontSize * 0.55, marginTop: 6, textAlign }, children: line.translated })
      ]
    }
  );
  return prefs.springMotion ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SpringBox, { active: state === "active", alignRight, children: body }) : body;
}
var VocalRow = (0, import_react3.memo)(VocalRowBase);
function InterludeRowBase({ line, activeUntil, prefs }) {
  const snap = useRowSnapshot(line.start, activeUntil);
  if (snap < 2) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.View, { style: { height: 22 } });
  const t = progress(clock.now(), line.start, line.end);
  const size = 26 * prefs.fontScale;
  const dot = (index) => {
    const local = Math.min(1, Math.max(0, t * 3 - index));
    return white(0.25 + 0.75 * easeOut(local));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.View, { style: { flexDirection: "row", paddingVertical: 20, paddingHorizontal: 12 }, children: [0, 1, 2].map((index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.Text, { style: { color: dot(index), fontSize: size, marginRight: 8 }, children: "\u25CF" }, index)) });
}
var InterludeRow = (0, import_react3.memo)(InterludeRowBase);

// src/ui/Background.tsx
var import_react5 = __toESM(require("react"));
var import_react6 = require("spotifyplus/react");
var import_animated2 = __toESM(require("spotifyplus/react/animated"));
var import_jsx_runtime3 = require("react/jsx-runtime");
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function hex2(n) {
  return Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0").toUpperCase();
}
function hsla(h, s, l, alpha = 1) {
  const hue = (h % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return `#${hex2(alpha * 255)}${hex2((r + m) * 255)}${hex2((g + m) * 255)}${hex2((b + m) * 255)}`;
}
function hueOf(color) {
  const m = /^#?([0-9a-f]{6})$/i.exec((color ?? "").trim());
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.06) return null;
  const d = max - min;
  const h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
function themeFor(color, id) {
  const hue = hueOf(color) ?? (id ? hash(id) % 360 : 270);
  return { base: hsla(hue, 0.4, 0.06), hues: [hue, hue + 40, hue - 40] };
}
var LAYERS = [1, 0.78, 0.56, 0.36, 0.2];
function Blob({ size, hue, left, top, dx, dy, grow, durationMs }) {
  const t = import_animated2.default.useAnimatedValue(0);
  (0, import_react5.useEffect)(() => {
    const ease = import_animated2.Easing.inOut(import_animated2.Easing.quad);
    const loop = import_animated2.default.loop(
      import_animated2.default.sequence([
        import_animated2.default.timing(t, { toValue: 1, duration: durationMs, easing: ease, useNativeDriver: true }),
        import_animated2.default.timing(t, { toValue: 0, duration: durationMs, easing: ease, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, durationMs]);
  const color = hsla(hue, 0.75, 0.5, 0.1);
  const style = {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: size,
    height: size,
    transform: [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, -dy] }) },
      { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, grow] }) }
    ]
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_animated2.default.View, { pointerEvents: "none", style, children: LAYERS.map((k) => {
    const s = size * k;
    const offset = (size - s) / 2;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react6.View, { pointerEvents: "none", style: { position: "absolute", left: offset, top: offset, width: s, height: s, borderRadius: s / 2, backgroundColor: color } }, k);
  }) });
}
function ArtLayer({ image, blurRadius, opacity, size, scale, turnSeconds, reverse, startDeg = 0, driftX = 0, driftY = 0, driftSeconds = 40 }) {
  const t = import_animated2.default.useAnimatedValue(0);
  const d = import_animated2.default.useAnimatedValue(0);
  (0, import_react5.useEffect)(() => {
    const loop = import_animated2.default.loop(import_animated2.default.timing(t, { toValue: 1, duration: turnSeconds * 1e3, easing: import_animated2.Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, turnSeconds]);
  (0, import_react5.useEffect)(() => {
    const ease = import_animated2.Easing.inOut(import_animated2.Easing.sin);
    const loop = import_animated2.default.loop(
      import_animated2.default.sequence([
        import_animated2.default.timing(d, { toValue: 1, duration: driftSeconds * 1e3 / 2, easing: ease, useNativeDriver: true }),
        import_animated2.default.timing(d, { toValue: 0, duration: driftSeconds * 1e3 / 2, easing: ease, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [d, driftSeconds]);
  const from = reverse ? startDeg + 360 : startDeg;
  const to = reverse ? startDeg : startDeg + 360;
  const style = {
    width: size,
    height: size,
    transform: [
      { translateX: d.interpolate({ inputRange: [0, 1], outputRange: [-driftX, driftX] }) },
      { translateY: d.interpolate({ inputRange: [0, 1], outputRange: [driftY, -driftY] }) },
      { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${from}deg`, `${to}deg`] }) },
      { scale }
    ]
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react6.View, { pointerEvents: "none", style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_animated2.default.View, { pointerEvents: "none", style, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    import_react6.ScriptView,
    {
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
      renderEffectBlurRadius: blurRadius,
      displayList: [{ type: "image", src: image, x: 0, y: 0, width: "100%", height: "100%", resizeMode: "cover", blurRadius, opacity }]
    }
  ) }) });
}
var FADE_MS = 1400;
function FadeIn({ children }) {
  const a = import_animated2.default.useAnimatedValue(0);
  (0, import_react5.useEffect)(() => {
    import_animated2.default.timing(a, { toValue: 1, duration: FADE_MS, easing: import_animated2.Easing.inOut(import_animated2.Easing.quad), useNativeDriver: true }).start();
  }, [a]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_animated2.default.View, { pointerEvents: "none", style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: a }, children });
}
function Artwork({ image }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(FadeIn, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ArtLayer, { image, blurRadius: 150, opacity: 1, size: 1100, scale: 1.12, turnSeconds: 63, reverse: false, driftX: 150, driftY: 190, driftSeconds: 48 }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ArtLayer, { image, blurRadius: 150, opacity: 0.38, size: 1e3, scale: 1.12, turnSeconds: 84, reverse: true, startDeg: 115, driftX: 130, driftY: 170, driftSeconds: 57 })
  ] });
}
function Background({ color, trackId, image }) {
  const theme = (0, import_react5.useMemo)(() => themeFor(color, trackId), [color, trackId]);
  const [shown, setShown] = (0, import_react5.useState)(image ? [image] : []);
  (0, import_react5.useEffect)(() => {
    if (!image) return;
    setShown((prev) => prev[prev.length - 1] === image ? prev : [...prev.slice(-1), image]);
    const timer = setTimeout(() => setShown((prev) => prev.slice(-1)), FADE_MS + 200);
    return () => clearTimeout(timer);
  }, [image]);
  const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_react6.View, { pointerEvents: "none", style: { ...fill, overflow: "hidden", backgroundColor: theme.base }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Blob, { size: 560, hue: theme.hues[0], left: -35, top: -8, dx: 90, dy: 70, grow: 1.18, durationMs: 9e3 }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Blob, { size: 500, hue: theme.hues[1], left: 30, top: 35, dx: 80, dy: 100, grow: 1.22, durationMs: 12e3 }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Blob, { size: 460, hue: theme.hues[2], left: -20, top: 62, dx: 100, dy: 60, grow: 1.15, durationMs: 15e3 }),
    shown.map((src) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Artwork, { image: src }, src)),
    shown.length ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      import_react6.ScriptView,
      {
        style: fill,
        displayList: [{ type: "rect", x: 0, y: 0, width: "100%", height: "100%", fill: { type: "linear", startX: 0, startY: 0, endX: 0, endY: "100%", colors: ["#22000000", "#30000000", "#58000000"], positions: [0, 0.5, 1] } }]
      }
    ) : null
  ] });
}
var SoftBoundary = class extends import_react5.default.Component {
  constructor() {
    super(...arguments);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
};

// src/ui/Page.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var Boundary = class extends import_react7.default.Component {
  constructor() {
    super(...arguments);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    import_spotifyplus6.SpotifyPlus.error("Spicy Lyrics: the lyrics page crashed, showing the original page", error);
  }
  render() {
    if (this.state.failed) {
      const Original = this.props.Original;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Original, {});
    }
    return this.props.children;
  }
};
function SpicyLyricsPage(props) {
  const prefs = usePrefs();
  if (!prefs.enabled) {
    const Original = props.Original;
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Original, {});
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Boundary, { Original: props.Original, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LyricsScreen, { prefs }) });
}
function goBack() {
  try {
    import_spotifyplus6.SpotifyPlus.Navigation.back();
  } catch (error) {
    import_spotifyplus6.SpotifyPlus.warn("Spicy Lyrics: back navigation failed", error);
  }
}
function Header({ title, artist, image }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react8.View, { style: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 58, paddingBottom: 10 }, children: [
    image ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Image, { source: { uri: image }, style: { width: 56, height: 56, borderRadius: 8 } }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react8.View, { style: { flex: 1, marginLeft: image ? 14 : 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Text, { numberOfLines: 1, style: { color: COLORS.active, fontSize: 19, fontWeight: "500" }, children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Text, { numberOfLines: 1, style: { color: COLORS.secondary, fontSize: 14, marginTop: 2 }, children: artist })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Pressable, { onPress: goBack, style: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.View, { style: { width: 12, height: 12, marginTop: -5, borderRightWidth: 2, borderBottomWidth: 2, borderColor: COLORS.secondary, transform: [{ rotate: "45deg" }] } }) })
  ] });
}
function Notice({ message, onRetry }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react8.View, { style: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Text, { style: { color: COLORS.active, fontSize: 18, fontWeight: "700", textAlign: "center" }, children: message }),
    onRetry ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_react8.Pressable,
      {
        onPress: onRetry,
        style: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, backgroundColor: COLORS.surface },
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Text, { style: { color: COLORS.active, fontSize: 15, fontWeight: "700" }, children: "Try again" })
      }
    ) : null
  ] });
}
function Credits({ writers, credit }) {
  if (writers.length === 0 && !credit) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.View, { style: { height: 120 } });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react8.View, { style: { paddingHorizontal: 12, paddingTop: 28, paddingBottom: 140 }, children: [
    writers.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Text, { style: { color: white(0.5), fontSize: 14 }, children: `Written by ${writers.join(", ")}` }) : null,
    credit ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react8.Text, { style: { color: white(0.5), fontSize: 14, marginTop: writers.length > 0 ? 6 : 0 }, children: credit }) : null
  ] });
}
function StaticLyrics({ display, prefs }) {
  const align = display.rtl ? "right" : "left";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react8.ScrollView, { style: { flex: 1 }, contentContainerStyle: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 60 }, children: [
    display.staticLines.map((text, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_react8.Text,
      {
        style: { color: COLORS.active, fontSize: 24 * prefs.fontScale, fontWeight: "700", textAlign: align, marginBottom: text ? 10 : 22 },
        children: text
      },
      index
    )),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Credits, { writers: display.writers, credit: display.credit })
  ] });
}
function SyncedLyrics({ display, prefs }) {
  const listRef = (0, import_react7.useRef)(null);
  const lines = display.lines;
  (0, import_react7.useEffect)(() => {
    let last = -2;
    const check = () => {
      const index = findActiveIndex(lines, clock.now());
      if (index === last) return;
      last = index;
      if (index >= 0) {
        try {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
        } catch (error) {
          import_spotifyplus6.SpotifyPlus.warn("Spicy Lyrics: scroll failed", error);
        }
      }
    };
    check();
    return clock.subscribe(check);
  }, [lines]);
  const renderItem = (0, import_react7.useCallback)(
    ({ item, index }) => {
      const next = lines[index + 1];
      const activeUntil = Math.max(item.end, next ? next.start : item.end + 8);
      return item.kind === "interlude" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(InterludeRow, { line: item, activeUntil, prefs }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(VocalRow, { line: item, activeUntil, prefs });
    },
    [lines, prefs]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_react8.FlatList,
    {
      ref: listRef,
      style: { flex: 1 },
      data: lines,
      keyExtractor: (_, index) => String(index),
      renderItem,
      initialNumToRender: 8,
      windowSize: 4,
      estimatedItemSize: 130,
      contentContainerStyle: { paddingHorizontal: 24, paddingTop: 30 },
      ListFooterComponent: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Credits, { writers: display.writers, credit: display.credit })
    }
  );
}
function LyricsScreen({ prefs }) {
  const track = useCurrentTrack();
  const [attempt, setAttempt] = (0, import_react7.useState)(0);
  const state = useLyrics(trackIdOf(track), attempt, metaOf(track));
  let body;
  if (state.status === "loading") {
    body = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Notice, { message: "Loading lyrics..." });
  } else if (state.status === "error") {
    body = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      Notice,
      {
        message: describeFailure(state.reason, state.httpStatus, state.detail),
        onRetry: state.reason === "not-found" ? void 0 : () => {
          resumeSpicy();
          setAttempt((n) => n + 1);
        }
      }
    );
  } else if (state.display.type === "Static") {
    body = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StaticLyrics, { display: state.display, prefs });
  } else {
    body = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SyncedLyrics, { display: state.display, prefs }, trackIdOf(track) ?? "none");
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react8.View, { style: { flex: 1, backgroundColor: COLORS.background }, children: [
    prefs.animatedBackground ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SoftBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Background, { color: track?.color, trackId: trackIdOf(track), image: track?.album?.image }) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Header, { title: track?.title ?? "Spicy Lyrics", artist: track?.artist ?? "", image: track?.album?.image }),
    body
  ] });
}

// src/index.tsx
function registerSettings() {
  const prefs = getPrefs();
  import_spotifyplus7.SpotifyPlus.Settings.registerSettings([
    {
      title: "Spicy Lyrics",
      description: "Synced lyrics from the Spicy Lyrics service. Unofficial port of Spicy Lyrics by Spikerko.",
      items: [
        {
          id: "enabled",
          type: "toggle",
          label: "Use Spicy Lyrics",
          description: "When off, Spotify's own lyrics page is shown.",
          value: prefs.enabled
        },
        {
          id: "animateSyllables",
          type: "toggle",
          label: "Word-by-word highlight",
          description: "Fade each word in as it is sung (when the song has word timings).",
          value: prefs.animateSyllables
        },
        {
          id: "showBackgroundVocals",
          type: "toggle",
          label: "Background vocals",
          value: prefs.showBackgroundVocals
        },
        {
          id: "showRomanization",
          type: "toggle",
          label: "Romanization",
          description: "Show a romanized line under songs in other scripts, when the service provides one.",
          value: prefs.showRomanization
        },
        {
          id: "showTranslation",
          type: "toggle",
          label: "Translation",
          description: "Show a translated line, when the service provides one.",
          value: prefs.showTranslation
        },
        {
          id: "fontScale",
          type: "slider",
          label: "Text size",
          value: prefs.fontScale,
          min: 0.7,
          max: 1.5,
          step: 0.05
        },
        {
          id: "timingOffsetMs",
          type: "slider",
          label: "Lyrics timing (ms ahead)",
          description: "Raise this if the lyrics are behind the song, lower it if they are ahead.",
          value: prefs.timingOffsetMs,
          min: -1e3,
          max: 2e3,
          step: 50
        },
        {
          id: "animatedBackground",
          type: "toggle",
          label: "Animated background",
          description: "Slowly moving coloured glow behind the lyrics.",
          value: prefs.animatedBackground
        },
        {
          id: "springMotion",
          type: "toggle",
          label: "Springy line motion",
          description: "The current line grows with a small bounce. Turn off if text looks glitchy.",
          value: prefs.springMotion
        },
        {
          id: "useBeautifulSource",
          type: "toggle",
          label: "Beautiful Lyrics source",
          description: "Also ask the lyrics service that Beautiful Lyrics uses (word-synced for many songs).",
          value: prefs.useBeautifulSource
        },
        {
          id: "fallbackLrclib",
          type: "toggle",
          label: "Backup lyrics (LRCLIB)",
          description: "Use the open LRCLIB database for songs the Spicy Lyrics service can't provide. Line-synced only.",
          value: prefs.fallbackLrclib
        },
        {
          id: "apiVersion",
          type: "text",
          label: "API client version",
          description: "Advanced. The client version sent to the lyrics service.",
          value: prefs.apiVersion,
          placeholder: "5.22.3"
        },
        {
          id: "clearCache",
          type: "button",
          label: "Clear lyrics cache",
          buttonLabel: "Clear"
        }
      ]
    }
  ]);
  import_spotifyplus7.SpotifyPlus.Events.on("settings.changed", (setting) => {
    if (setting.id === "clearCache") {
      clearLyricsCache();
      return;
    }
    const id = setting.id;
    if (!isPrefKey(id)) return;
    if (id === "apiVersion" && typeof setting.value === "string" && !setting.value.trim()) return;
    setPref(id, setting.value);
  });
}
registerSettings();
import_spotifyplus7.SpotifyPlus.UI.replace("lyrics.page", SpicyLyricsPage);
import_spotifyplus7.SpotifyPlus.log("Spicy Lyrics loaded");
