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

// Get all .md files from posts directory
const files = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.md') && file !== 'index.json')
    .sort();

// Write index.json
fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));

console.log(`✅ Generated posts/index.json with ${files.length} files:`);
files.forEach(file => console.log(`   - ${file}`));
