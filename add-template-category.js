import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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
      
      // Skip if category already exists and is "templates"
      if (parsed.data.category === 'templates') {
        console.log(`Skipping ${relativePath} - already has category: templates`);
        continue;
      }
      
      // Add category to frontmatter
      parsed.data.category = 'templates';
      
      // Write back
      const newContent = matter.stringify(parsed.content, parsed.data, {
        delimiters: '---'
      });
      
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      console.log(`Updated ${relativePath} with category: templates`);
      updated++;
    }
  }

  return updated;
}

const templatesDir = '03. templates';
const totalUpdated = processDirectory(templatesDir);

console.log(`\nDone! Updated ${totalUpdated} files.`);
