# Nora Conrad Website

A simple static website that displays markdown files from Obsidian with YAML frontmatter, designed for hosting on Neocities.

## Features

- Clean, minimalist design with sidebar navigation
- Markdown file rendering with YAML frontmatter support
- Search functionality
- Responsive design
- Easy to customize colors and styling

## File Structure

```
noraconrad/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # Markdown parsing and navigation logic
├── build.js            # Optional build script to generate posts index
├── posts/              # Your markdown files go here
│   ├── index.json      # List of markdown files (auto-generated)
│   ├── home.md         # Home page content
│   └── *.md            # Your other markdown files
└── README.md           # This file
```

## Adding Content

1. Create markdown files in the `posts/` directory
2. Add YAML frontmatter at the top of each file:

```yaml
---
slug: /your-page-slug
title: Your Page Title
publish: true
category: posts  # Optional: for organizing posts
date: 2024-01-15  # Optional: for sorting
---
```

3. Write your content below the frontmatter using markdown
4. Run `node build.js` to regenerate the `posts/index.json` file (or manually update it)

### YAML Frontmatter Options

- `slug`: The URL path for the page (e.g., `/thank-you`, `/posts/my-post`)
- `title`: The page title displayed in the browser and on the page
- `publish`: Set to `false` to hide the page (default: `true`)
- `category`: Optional category for organizing posts (e.g., `posts`, `curriculums`, `templates`)
- `date`: Optional date for sorting posts

## Customization

### Colors

Edit `styles.css` and modify the CSS variables at the top:

```css
:root {
    --bg-color: #faf9f6;
    --text-color: #3d2817;
    --link-color: #d4a574;
    --accent-pink: #e8a5a5;
    --sidebar-bg: #ffffff;
    --border-color: #e8e5e0;
}
```

### Social Links

Edit the social icons in `index.html` and update the `href` attributes:

```html
<a href="YOUR_YOUTUBE_URL" class="social-icon" title="YouTube">
<a href="YOUR_LINKEDIN_URL" class="social-icon" title="LinkedIn">
<a href="YOUR_PINTEREST_URL" class="social-icon" title="Pinterest">
<a href="mailto:YOUR_EMAIL" class="social-icon" title="Email">
```

### Navigation

Update the navigation links in `index.html`:

```html
<a href="/posts" class="nav-link" data-slug="posts">01. posts</a>
```

## Deploying to Neocities

1. Make sure all your markdown files are in the `posts/` directory
2. Run `node build.js` to update `posts/index.json`
3. Upload all files to Neocities:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `posts/` directory (with all `.md` files and `index.json`)

### Neocities Upload Tips

- You can use the Neocities web interface or their CLI tool
- Make sure to preserve the directory structure
- All files should be in the root of your Neocities site

## Local Development

1. Serve the files using a local web server (Neocities requires proper HTTP, not `file://`)

   Using Python:
   ```bash
   python3 -m http.server 8000
   ```

   Using Node.js (http-server):
   ```bash
   npx http-server
   ```

2. Open `http://localhost:8000` in your browser

## Importing from Obsidian

1. Export your Obsidian notes as markdown files
2. Add YAML frontmatter to each file if it doesn't already have it
3. Place files in the `posts/` directory
4. Run `node build.js` to update the index
5. Upload to Neocities

## Notes

- The site uses client-side markdown parsing (no build step required for rendering)
- Markdown files are loaded dynamically via JavaScript
- The `posts/index.json` file lists all markdown files to load
- Only files with `publish: true` (or no publish field) will be displayed
