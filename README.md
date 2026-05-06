# AI Studio JSON Importer

This Firefox extension import of JSON requests into the Google AI Studio interface. It handles both text parts and base64-encoded files by simulating native UI interactions.

## Functionality

- Import text and files like your API do inside AI Studio.

## Requirements

- Firefox (not tested in chrome or chromium)

## Installation

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging`.
3. Click "This Firefox".
4. Click "Load Temporary Add-on...".
5. Select the `manifest.json` file from the project directory.

## JSON Format

The extension expects the standard generative API structure:

```json
{
  "contents": [
    {
      "parts": [
        {"text": "Text prompt here"},
        {"inline_data": {"mime_type": "image/png", "data": "BASE64_DATA"}}
      ]
    }
  ]
}
```