/**
 * Utility for importing markdown blog posts into the database
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const slugify = require('slugify');
const mongoose = require('mongoose');
require('dotenv').config();

// Import Blog model
const Blog = require('../models/Blog');

/**
 * Extracts frontmatter and content from a markdown file
 * @param {string} filePath - Path to the markdown file
 * @returns {Object} - Extracted data
 */
const extractMarkdownData = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  
  return {
    title: data.title,
    description: data.description || '',
    subtitle: data.subtitle || '',
    image: data.image || '',
    date: data.date ? new Date(data.date) : new Date(),
    category: data.category || 'General',
    author: data.author || '',
    tags: data.tags || [],
    markdownContent: content,
    isPublished: true,
    slug: data.slug || slugify(data.title, { lower: true })
  };
};

/**
 * Imports markdown files from a directory into the database
 * @param {string} directoryPath - Path to the directory containing markdown files
 */
const importMarkdownFiles = async (directoryPath) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    const files = fs.readdirSync(directoryPath);

    const markdownFiles = files.filter(file => file.endsWith('.md') && !file.startsWith('_'));
        
    // Process each file
    for (const file of markdownFiles) {
      const filePath = path.join(directoryPath, file);
      const blogData = extractMarkdownData(filePath);
      
      // Check if blog with this slug already exists
      const existingBlog = await Blog.findOne({ slug: blogData.slug });
      
      if (existingBlog) {
        
        // Update existing blog
        Object.assign(existingBlog, blogData);
        await existingBlog.save();
        
      } else {
        // Create new blog
        const newBlog = new Blog(blogData);
        await newBlog.save();
        
      }
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
  }
};

// Example usage
// importMarkdownFiles('/path/to/markdown/files');

module.exports = {
  extractMarkdownData,
  importMarkdownFiles
}; 