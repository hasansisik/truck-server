#!/usr/bin/env node

/**
 * Script to import markdown files into the blog database
 * 
 * Usage: node importMarkdown.js <path-to-markdown-directory>
 * Example: node importMarkdown.js ../content/blog
 */

const { importMarkdownFiles } = require('../utils/markdownImporter');

// Get directory path from command line argument
const directoryPath = process.argv[2];

if (!directoryPath) {
  console.error('Please provide a directory path as an argument');
  console.error('Usage: node importMarkdown.js <path-to-markdown-directory>');
  process.exit(1);
}
// Run the importer
importMarkdownFiles(directoryPath)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import process failed:', error);
    process.exit(1);
  }); 