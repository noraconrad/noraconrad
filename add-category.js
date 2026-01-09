import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const publishedDir = '01. posts/Published';
const files = fs.readdirSync(publishedDir).filter(f => f.endsWith('.md'));

let updated = 0;

for (const file of files) {
  const filePath = path.join(publishedDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);
  
  // Skip if category already exists and is "posts"
  if (parsed.data.category === 'posts') {
    console.log(`Skipping ${file} - already has category: posts`);
    continue;
  }
  
  // Add category to frontmatter
  parsed.data.category = 'posts';
  
  // Write back
  const newContent = matter.stringify(parsed.content, parsed.data, {
    delimiters: '---'
  });
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`Updated ${file} with category: posts`);
  updated++;
}

console.log(`\nDone! Updated ${updated} files.`);
