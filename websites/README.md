# Theme Development Guide

This directory contains the modernization packages for all sites supported by the **Site Package Manager**. Anyone can contribute new themes or support for new sites via Pull Requests.

---

## How to Add a New Site or Theme

### Step 1: Create the Directory Structure

Create a nested directory following the pattern `websites/<site-domain>/<theme-name>/`:

```bash
mkdir -p websites/mysite.com/my-modern-theme/
```

### Step 2: Create the Theme Manifest (`manifest.json`)

Inside the theme folder, create a `manifest.json` file. It defines which elements are extracted from the original site and which React component is used to reconstruct the page:

```json
{
  "containerSelector": "#main-content-div",
  "layoutComponent": "UiModernGridPage",
  "urlPattern": "page=gallery",
  "props": {
    "pageTitle": "My Modern Gallery"
  },
  "children": [
    {
      "name": "items",
      "selector": ".post-thumbnail",
      "propsMap": {
        "imageUrl": "img | attr:src",
        "linkUrl": "a | attr:href",
        "title": "img | attr:title"
      }
    }
  ]
}
```

### Step 3: Create the Stylesheet (`content.css`)

Create a `content.css` file with the theme's design tokens and the Tailwind CSS initialization:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:host {
  --spm-bg-primary: #0f172a;
  --spm-bg-secondary: #1e293b;
  --spm-text-primary: #f8fafc;
  --spm-text-muted: #94a3b8;
  --spm-accent: #38bdf8;
  --spm-border: #334155;
  --spm-radius: 12px;
}
```

### Step 4: (Optional) Create Site-Specific React Components

If your theme needs custom React components that don't exist in the extension's core library:

1. Create a `components/` folder inside your theme: `websites/mysite.com/my-modern-theme/components/`.
2. Create your React component there (e.g. `UiSpecialGalleryCard.tsx`).
3. The build script will automatically discover your component and register it in the core library during compilation.

### Step 5: Update the Central Registry (`registry.json`)

Open [`registry.json`](file:///home/watashi/Projects/extension/registry.json) at the project root and map the new domain and package:

```json
  "mysite.com": {
    "defaultPackage": "my-modern-theme",
    "packages": {
      "my-modern-theme": {
        "displayName": "My Modern Theme",
        "author": "your-username",
        "directory": "my-modern-theme",
        "activeVersion": "1.0.0",
        "history": [
          { "version": "1.0.0", "ref": "master", "date": "2026-08-08" }
        ]
      }
    }
  }
```

### Step 6: Build and Test Locally

Run the build to compile the Tailwind utility stylesheet and update the component registry:

```bash
npm run build
```

This generates the final compiled `style.css` inside your theme folder.

#### Testing in the Extension

1. Open Chrome and load the extension (`chrome://extensions` → Load unpacked → `dist/`).
2. Navigate to the mapped site (e.g. `mysite.com`).
3. Open the extension popup, enable **Developer Mode**.
4. Click **`manifest.json`** and select your theme's `manifest.json` file.
5. Click **`style.css`** and select your theme's `style.css` file.
6. The extension saves both files locally and reloads the tab with your new design instantly.

---

## Submitting Your Theme (GitOps)

Once you have validated the theme locally:

1. Commit your new theme folder and the updated `registry.json`.
2. Open a Pull Request.
3. Once merged to the main branch, all Site Package Manager users will receive support for the new site automatically.
