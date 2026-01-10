#!/usr/bin/env node

/**
 * Simple build script to generate posts/index.json
 * Run this after adding new markdown files to the posts/ directory
 * 
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
const indexPath = path.join(postsDir, 'index.json');

// Recursively get all .md files from posts directory and subdirectories
function getAllMarkdownFiles(dir, baseDir = dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.isDirectory()) {
            // Skip node_modules, .git, and other hidden directories
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                files.push(...getAllMarkdownFiles(fullPath, baseDir));
            }
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.json') {
            // Use forward slashes for paths (web-friendly)
            files.push(relativePath.replace(/\\/g, '/'));
        }
    }
    
    return files;
}

const files = getAllMarkdownFiles(postsDir).sort();

// Write index.json
fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));

console.log(`✅ Generated posts/index.json with ${files.length} files:`);
files.forEach(file => console.log(`   - ${file}`));
