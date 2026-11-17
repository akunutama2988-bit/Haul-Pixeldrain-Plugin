# Haul Pixeldrain Plugin

Unofficial Pixeldrain plugin for [Haul](https://github.com/tristanteu/haul).

This plugin adds Pixeldrain link support to Haul, allowing users to process Pixeldrain file links and download files directly.

## Features

- Supports Pixeldrain file links.
- Extracts file metadata from the Pixeldrain page.
- Supports direct file downloads through the Pixeldrain filesystem API.
- Integrates with Haul's plugin system.

## Supported URLs

- `https://pixeldrain.com/u/FILE_ID`
- `https://pixeldrain.com/d/FILE_ID`
- `https://pixeldrain.com/file/FILE_ID`
- `https://pixeldrain.com/l/LIST_ID`

## Installation

1. Make sure Haul is already installed and running.
2. Create the plugin directory if it does not exist:

```bash
mkdir -p ~/haul/config/plugins
```

3. Download the plugin:

```bash
sudo curl -fL \
  "https://raw.githubusercontent.com/GITHUB_USERNAME/haul-pixeldrain-plugin/main/pixeldrain.js" \
  -o ~/haul/config/plugins/pixeldrain.js
```

Replace `GITHUB_USERNAME` with your GitHub username.

4. Restart Haul:

```bash
docker restart haul
```

5. Check whether the plugin loaded:

```bash
docker logs haul --tail 50
```

Look for a message indicating that the Pixeldrain plugin was loaded.

## Compatibility

- Tested with Haul v0.1.4.
- Docker deployment.
- Compatibility with other Haul versions has not been verified.

## Disclaimer

This is an unofficial community plugin. It is not affiliated with or endorsed by Pixeldrain or Haul.

Use in accordance with Pixeldrain's terms of service.

## License

MIT License (only if the author chooses to publish this project under MIT).
