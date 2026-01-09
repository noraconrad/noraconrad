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

function processDirectory(dir, basePath = '') {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let updated = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Recursively process subdirectories
      const subUpdated = processDirectory(fullPath, basePath);
      updated += subUpdated;
    } else if (file.isFile() && file.name.endsWith('.md') && file.name !== 'index.md') {
      // Get the course folder name (parent directory of the file)
      const relativePath = path.relative('02. curriculums', fullPath);
      const pathParts = relativePath.split(path.sep);
      
      // The course name is the first directory (e.g., "Mastering Chaos" or "Creator Ops")
      const courseName = pathParts[0];
      const courseSlug = slugify(courseName);
      
      // Read and parse the file
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = matter(content);
      
      // Skip if slug already exists and matches our pattern
      if (parsed.data.slug && parsed.data.slug.startsWith('curriculums/')) {
        console.log(`Skipping ${relativePath} - already has curriculum slug`);
        continue;
      }
      
      // Get title from frontmatter or filename
      const title = parsed.data.title || file.name.replace('.md', '');
      const titleSlug = slugify(title);
      
      // Create the slug: curriculums/[course]/[title]
      const slug = `curriculums/${courseSlug}/${titleSlug}`;
      
      // Add category and slug to frontmatter
      parsed.data.category = 'curriculums';
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

const curriculumsDir = '02. curriculums';
const totalUpdated = processDirectory(curriculumsDir);

console.log(`\nDone! Updated ${totalUpdated} files.`);
