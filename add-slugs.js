import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Simple slugify function (similar to Quartz's sluggify)
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

const publishedDir = '01. posts/Published';
const files = fs.readdirSync(publishedDir).filter(f => f.endsWith('.md'));

let updated = 0;

for (const file of files) {
  const filePath = path.join(publishedDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);
  
  // Skip if slug already exists
  if (parsed.data.slug) {
    console.log(`Skipping ${file} - already has slug`);
    continue;
  }
  
  // Get title from frontmatter or filename
  const title = parsed.data.title || file.replace('.md', '');
  const slugTitle = slugify(title);
  const slug = `posts/${slugTitle}`;
  
  // Add slug to frontmatter
  parsed.data.slug = slug;
  
  // Write back
  const newContent = matter.stringify(parsed.content, parsed.data, {
    delimiters: '---'
  });
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`Updated ${file} with slug: ${slug}`);
  updated++;
}

console.log(`\nDone! Updated ${updated} files.`);
