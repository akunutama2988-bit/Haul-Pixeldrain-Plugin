"use strict";

var __plugin = (() => {
  class PluginError extends Error {
    constructor(kind, message, waitSeconds) {
      super(message);
      this.haulKind = kind;
      if (waitSeconds > 0) this.haulWait = Math.ceil(waitSeconds);
    }
  }

  class OfflineError extends PluginError {
    constructor(message = "Pixeldrain: file not found") {
      super("offline", message);
    }
  }

  class TemporaryError extends PluginError {
    constructor(message, waitSeconds) {
      super("temporary", message, waitSeconds);
    }
  }

  function parseLink(link) {
    const m = /^https?:\/\/(?:www\.)?(pixeldrain\.(?:com|net))\/(u|d|file|l|api\/file)\/([A-Za-z0-9_-]+)/i.exec(link);

    if (!m) {
      throw new PluginError("fatal", "Invalid Pixeldrain URL");
    }

    return {
      host: m[1].toLowerCase(),
      kind: m[2].toLowerCase() === "l" ? "list" : "file",
      id: m[3]
    };
  }

  function hashOf(info) {
    const hash = String(
      info.sha256_sum || info.hash_sha256 || ""
    ).toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(hash)) return undefined;

    return {
      type: "sha256",
      value: hash
    };
  }

  async function pageInfo(ctx, target) {
    let res;

    try {
      res = await ctx.http.get(
        `https://${target.host}/d/${target.id}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 Haul",
            Accept: "text/html"
          }
        }
      );
    } catch (e) {
      throw new TemporaryError("Pixeldrain: connection failed");
    }

    if (res.status === 404) throw new OfflineError();

    if (res.status === 429 || res.status >= 500) {
      throw new TemporaryError(
        `Pixeldrain: HTTP ${res.status}`,
        60
      );
    }

    let html;

    try {
      html = await res.text();
    } catch (e) {
      throw new TemporaryError("Pixeldrain: cannot read file page");
    }

    const match = html.match(
      /window\.initial_node\s*=\s*(\{.*?\});/s
    );

    if (!match) {
      throw new OfflineError(
        "Pixeldrain: file metadata not found in page"
      );
    }

    let initial;

    try {
      initial = JSON.parse(match[1]);
    } catch (e) {
      throw new TemporaryError("Pixeldrain: invalid page metadata");
    }

    const node = initial.path?.find(item => item.type === "file");

    if (!node || !node.id) {
      throw new OfflineError();
    }

    if (initial.permissions?.read === false) {
      throw new PluginError("fatal", "Pixeldrain: file is not readable");
    }

    return {
      name: node.name || `${node.id}`,
      size: Number(node.size || 0),
      mime: node.mime_type,
      hash: hashOf(node),
      id: node.id
    };
  }

  async function apiGet(ctx, url) {
    let res;

    try {
      res = await ctx.http.get(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 Haul"
        }
      });
    } catch (e) {
      throw new TemporaryError("Pixeldrain: connection failed");
    }

    let data;

    try {
      data = await res.json();
    } catch (e) {
      throw new TemporaryError(
        `Pixeldrain: invalid API response (HTTP ${res.status})`
      );
    }

    if (res.status === 404 || data.value === "not_found") {
      throw new OfflineError();
    }

    if (res.status === 429 || res.status >= 500) {
      throw new TemporaryError(
        `Pixeldrain: server error ${res.status}`,
        60
      );
    }

    if (!data.success) {
      throw new PluginError(
        "fatal",
        `Pixeldrain: ${data.value || data.message || "API error"}`
      );
    }

    return data;
  }

  async function listInfo(ctx, target) {
    return apiGet(
      ctx,
      `https://${target.host}/api/list/${target.id}`
    );
  }

  const index_default = {
    id: "pixeldrain",
    name: "Pixeldrain",
    version: 2,

    domains: [
      "pixeldrain.com",
      "pixeldrain.net"
    ],

    matches: [
      /^https?:\/\/(?:www\.)?pixeldrain\.(?:com|net)\/(?:u|d|file|l|api\/file)\/[A-Za-z0-9_-]+(?:[/?#].*)?$/i
    ],

    accountRequired: false,

    async check(link, ctx) {
      const target = parseLink(link);

      if (target.kind === "list") {
        const info = await listInfo(ctx, target);

        return {
          online: true,
          name: info.title
        };
      }

      const info = await pageInfo(ctx, target);

      return {
        online: true,
        name: info.name,
        size: info.size,
        hash: info.hash
      };
    },

    async crawl(link, ctx) {
      const target = parseLink(link);

      if (target.kind === "list") {
        const info = await listInfo(ctx, target);

        return {
          packageName: info.title || "Pixeldrain",
          files: (info.files || []).map(file => ({
            url: `https://${target.host}/d/${file.id}`,
            name: file.name,
            size: Number(file.size)
          }))
        };
      }

      const info = await pageInfo(ctx, target);

      return {
        files: [{
          url: `https://${target.host}/d/${target.id}`,
          name: info.name,
          size: info.size,
          hash: info.hash
        }]
      };
    },

    async resolve(link, ctx) {
      const target = parseLink(link);

      if (target.kind === "list") {
        throw new PluginError(
          "fatal",
          "Pixeldrain: add the file list again"
        );
      }

      const info = await pageInfo(ctx, target);

      return {
        url: `https://${target.host}/api/filesystem/${target.id}`,
        headers: {
          Referer: `https://${target.host}/d/${target.id}`,
          "User-Agent": "Mozilla/5.0 Haul"
        },
        name: info.name,
        size: info.size,
        hash: info.hash,
        maxConnections: 1
      };
    }
  };

  return { default: index_default };
})();
