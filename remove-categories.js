import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let updated = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip certain directories
      if (file.name === 'node_modules' || file.name === '.git' || file.name === 'quartz' || file.name === 'public') {
        continue;
      }
      // Recursively process subdirectories
      const subUpdated = processDirectory(fullPath);
      updated += subUpdated;
    } else if (file.isFile() && file.name.endsWith('.md')) {
      // Get relative path for logging
      const relativePath = path.relative('.', fullPath);
      
      try {
        // Read and parse the file
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = matter(content);
        
        // Check if categories exists
        if (parsed.data.categories !== undefined) {
          // Remove categories property
          delete parsed.data.categories;
          
          // Write back
          const newContent = matter.stringify(parsed.content, parsed.data, {
            delimiters: '---'
          });
          
          fs.writeFileSync(fullPath, newContent, 'utf-8');
          console.log(`Removed categories from ${relativePath}`);
          updated++;
        }
      } catch (err) {
        console.error(`Error processing ${relativePath}:`, err.message);
      }
    }
  }

  return updated;
}

// Start from current directory
const totalUpdated = processDirectory('.');

console.log(`\nDone! Updated ${totalUpdated} files.`);
