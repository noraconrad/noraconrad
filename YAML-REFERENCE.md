# YAML Frontmatter Reference

All markdown files should start with YAML frontmatter between `---` markers.

## Required Fields

None! But you should at least set a `slug` and `title`.

## Available Fields

### `slug` (recommended)
The URL path for your page. Examples:
- `slug: /thank-you` → accessible at `/thank-you`
- `slug: /posts/my-article` → accessible at `/posts/my-article`
- `slug: ` (empty) → home page

### `title` (recommended)
The title of your page, displayed in the browser and as the page heading.

### `publish` (optional)
Set to `false` to hide the page from listings. Default: `true`
```yaml
publish: false
```

### `category` (optional)
Organize posts into categories. Used for filtering in navigation.
```yaml
category: posts
category: curriculums
category: templates
```

### `date` (optional)
Date for sorting posts. Format: `YYYY-MM-DD`
```yaml
date: 2024-01-15
```

### `coverImage` (optional)
Path to a cover image for the post. When posts in a category have cover images, they will be displayed in a grid layout instead of a list. The image path should be relative to the site root.
```yaml
coverImage: images/1*I8Ittu9i1ThIQwi6sPAR3Q.png
```

### `tags` (optional)
Tags for categorizing and searching posts. Can be an array or comma-separated string. Tags are displayed on individual posts and can be clicked to filter posts by tag. Tags are also included in search results.
```yaml
tags: [productivity, organization, tools]
# or
tags: productivity, organization, tools
```

## Example

```yaml
---
slug: /posts/my-awesome-post
title: My Awesome Post
publish: true
category: posts
date: 2024-01-15
coverImage: images/my-cover-image.png
tags: [productivity, tools, tips]
---

# My Awesome Post

Your markdown content goes here...
```

## Notes

- The frontmatter must be at the very top of the file
- It must be between `---` markers
- The closing `---` must be followed by a blank line before your content
- If you don't specify a `slug`, it will be generated from the filename
