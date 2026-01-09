import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Simple slugify function
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let updated = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Recursively process subdirectories
      const subUpdated = processDirectory(fullPath);
      updated += subUpdated;
    } else if (file.isFile() && file.name.endsWith('.md')) {
      // Get relative path for logging
      const relativePath = path.relative('03. templates', fullPath);
      
      // Read and parse the file
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = matter(content);
      
      // Skip if slug already exists and matches our pattern
      if (parsed.data.slug && parsed.data.slug.startsWith('templates/')) {
        console.log(`Skipping ${relativePath} - already has template slug`);
        continue;
      }
      
      // Get title from frontmatter or filename
      const title = parsed.data.title || file.name.replace('.md', '');
      const titleSlug = slugify(title);
      
      // Create the slug: templates/[title]
      const slug = `templates/${titleSlug}`;
      
      // Add slug to frontmatter
      parsed.data.slug = slug;
      
      // Write back
      const newContent = matter.stringify(parsed.content, parsed.data, {
        delimiters: '---'
      });
      
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      console.log(`Updated ${relativePath} with slug: ${slug}`);
      updated++;
    }
  }

  return updated;
}

const templatesDir = '03. templates';
const totalUpdated = processDirectory(templatesDir);

console.log(`\nDone! Updated ${totalUpdated} files.`);
