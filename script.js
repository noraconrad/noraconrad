// Global state
let allPosts = [];
let currentSlug = '';

// Initialize the site
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('content-container');
    if (!container) {
        console.error('Content container not found!');
        return;
    }
    
    container.innerHTML = '<div class="content"><p>Loading...</p></div>';
    
    try {
        console.log('Starting initialization...');
        await loadAllPosts();
        console.log('Posts loaded, count:', allPosts.length);
        handleNavigation();
        handleSearch();
        loadInitialPage();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error initializing site:', error);
        console.error('Error stack:', error.stack);
        // Always show content, even if there's an error
        if (allPosts.length === 0) {
            container.innerHTML = `
                <div class="content">
                    <h1>I'm Nora 👋</h1>
                    <p>Hi, I'm Nora, you can read <a href="/about">about me</a> here. I'm currently in the process of revamping my website, you can read about that here: <a href="/building-my-knowledge-garden">building my knowledge garden</a>.</p>
                    <p>While this site used to be my primary income source, I've since "retired" and I am no longer offering 1-on-1 services nor selling courses. All my content is available for free with the exception of some collaborative notion templates that I still sell. If you'd like to support my work in other ways, you can do so here: <a href="/support">support my work</a>.</p>
                    <p style="color: red; margin-top: 2rem;"><strong>Note:</strong> There was an error loading content. Please check the browser console for details.</p>
                </div>
            `;
        } else {
            loadInitialPage();
        }
    }
});

// Load all markdown files and parse their frontmatter
async function loadAllPosts() {
    try {
        // Fetch the posts index (we'll create a simple JSON file listing all posts)
        const response = await fetch('posts/index.json');
        if (!response.ok) {
            console.warn('No posts index found, response status:', response.status);
            if (response.status === 403 || response.status === 404) {
                console.warn('Posts directory not accessible (403/404). This is normal on some hosting platforms.');
            }
            // Try to continue with empty posts array
            allPosts = [];
            return;
        }
        const postFiles = await response.json();
        console.log('Post files to load:', postFiles);
        
        // Load each post
        const posts = await Promise.all(
            postFiles.map(async (filename) => {
                try {
                    // Encode filename for URL - encode each path segment separately to preserve slashes
                    const pathParts = filename.split('/');
                    const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/');
                    const response = await fetch(`posts/${encodedPath}`);
                    if (!response.ok) {
                        console.error(`Failed to fetch ${filename}:`, response.status);
                        if (filename.includes('curriculums') || filename.includes('creator ops') || filename.includes('mastering chaos') || filename.includes('0.0 Start Here')) {
                            console.error(`  - This is a curriculum file that failed to load!`);
                        }
                        return null;
                    }
                    const content = await response.text();
                    const post = parseMarkdownWithFrontmatter(content, filename);
                    if (filename.includes('curriculums') || filename.includes('creator ops') || filename.includes('mastering chaos') || filename.includes('0.0 Start Here')) {
                        console.log(`✅ Parsed ${filename}:`, { title: post.title, category: post.category, slug: post.slug, publish: post.publish });
                    }
                    return post;
                } catch (error) {
                    console.error(`Error loading ${filename}:`, error);
                    if (filename.includes('curriculums') || filename.includes('creator ops') || filename.includes('mastering chaos') || filename.includes('0.0 Start Here')) {
                        console.error(`  - This is a curriculum file that errored!`);
                    }
                    return null;
                }
            })
        );
        
        allPosts = posts.filter(p => p !== null && p.publish !== false);
        console.log('Loaded posts:', allPosts.length);
        
        // Check for curriculum posts specifically
        const curriculumPostsInAll = allPosts.filter(p => {
            const cat = (p.category || '').toLowerCase();
            return cat === 'curriculums' || cat === 'curriculum' || (p.slug || '').includes('curriculums');
        });
        console.log('Curriculum posts in allPosts:', curriculumPostsInAll.length, curriculumPostsInAll.map(p => ({ title: p.title, category: p.category, slug: p.slug })));
        
        // If no posts loaded, show a message
        if (allPosts.length === 0) {
            console.warn('No posts loaded!');
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        allPosts = [];
        // Don't call createSampleContent - just continue with empty array
    }
}

// Process images in HTML (after markdown parsing)
// Fixes image paths to point to posts/images/ directory
function processImagesInHTML(html) {
    if (!html || html.trim() === '') {
        return html;
    }
    
    try {
        // Create a temporary container to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Find all img tags
        const images = tempDiv.querySelectorAll('img');
        
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (!src) return;
            
            // Skip if it's already an absolute URL or starts with /
            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
                return;
            }
            
            // If it starts with /, it's already an absolute path, keep it
            if (src.startsWith('/')) {
                return;
            }
            
            // Handle relative paths - convert to absolute paths from site root
            let newSrc = src;
            
            // If it already has images/ prefix, keep it
            // Otherwise, add images/ prefix
            if (!newSrc.startsWith('images/')) {
                newSrc = 'images/' + newSrc;
            }
            
            // Prepend /posts/ to make it an absolute path /posts/images/filename
            // But only if it doesn't already start with / or http
            if (!newSrc.startsWith('/')) {
                newSrc = '/posts/' + newSrc;
            }
            
            // Ensure we don't have double images/ (shouldn't happen, but just in case)
            newSrc = newSrc.replace(/\/posts\/images\/images\//g, '/posts/images/');
            
            img.setAttribute('src', newSrc);
        });
        
        return tempDiv.innerHTML;
    } catch (error) {
        console.error('Error processing images:', error);
        return html; // Return original HTML if processing fails
    }
}

// Process callouts in HTML (after markdown parsing)
// Converts blockquotes that match Obsidian callout syntax to callout divs
function processCalloutsInHTML(html) {
    if (!html || html.trim() === '') {
        return html;
    }
    
    try {
        // Create a temporary container to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Find all blockquotes
        const blockquotes = tempDiv.querySelectorAll('blockquote');
        
        blockquotes.forEach(blockquote => {
            const firstParagraph = blockquote.querySelector('p');
            if (!firstParagraph) return;
            
            const text = firstParagraph.textContent;
            const calloutMatch = text.match(/^\[!([^\]]+)\](.*)$/);
            
            if (calloutMatch) {
                const calloutType = calloutMatch[1].toLowerCase();
                const calloutTitle = calloutMatch[2].trim() || calloutType;
                
                // Remove the first paragraph (title)
                firstParagraph.remove();
                
                // Get remaining content
                const content = blockquote.innerHTML.trim();
                
                // Create callout structure
                const calloutDiv = document.createElement('div');
                calloutDiv.className = 'callout';
                calloutDiv.setAttribute('data-callout', calloutType);
                
                const titleDiv = document.createElement('div');
                titleDiv.className = 'callout-title';
                
                const iconDiv = document.createElement('div');
                iconDiv.className = 'callout-icon';
                
                const titleInner = document.createElement('div');
                titleInner.className = 'callout-title-inner';
                const titleP = document.createElement('p');
                titleP.textContent = calloutTitle;
                titleInner.appendChild(titleP);
                
                titleDiv.appendChild(iconDiv);
                titleDiv.appendChild(titleInner);
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'callout-content';
                contentDiv.innerHTML = content;
                
                calloutDiv.appendChild(titleDiv);
                calloutDiv.appendChild(contentDiv);
                
                // Replace blockquote with callout
                if (blockquote.parentNode) {
                    blockquote.parentNode.replaceChild(calloutDiv, blockquote);
                }
            }
        });
        
        return tempDiv.innerHTML;
    } catch (error) {
        console.error('Error processing callouts:', error);
        return html; // Return original HTML if processing fails
    }
}

// Parse markdown with YAML frontmatter
function parseMarkdownWithFrontmatter(content, filename) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    let frontmatter = {};
    let markdown = content;
    
    if (match) {
        try {
            frontmatter = jsyaml.load(match[1]) || {};
            markdown = match[2];
        } catch (error) {
            console.error('Error parsing YAML frontmatter:', error);
        }
    }
    
    // Default values
    let slug = frontmatter.slug || filename.replace('.md', '').replace(/^\/+/, '');
    // Normalize slug - remove leading/trailing slashes except for root
    if (slug && slug !== '/' && slug !== '') {
        slug = slug.replace(/^\/+/, '').replace(/\/+$/, '');
    }
    
    // Handle tags - can be array or comma-separated string
    let tags = [];
    if (frontmatter.tags) {
        if (Array.isArray(frontmatter.tags)) {
            tags = frontmatter.tags;
        } else if (typeof frontmatter.tags === 'string') {
            tags = frontmatter.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
    }
    
    // Extract links from markdown (both [text](url) and [[wikilink]] formats)
    const links = [];
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    
    let linkMatch;
    while ((linkMatch = markdownLinkRegex.exec(markdown)) !== null) {
        const linkUrl = linkMatch[2];
        // Only include internal links (starting with /)
        if (linkUrl.startsWith('/')) {
            links.push(linkUrl.replace(/^\//, '').replace(/\/$/, ''));
        }
    }
    
    while ((linkMatch = wikiLinkRegex.exec(markdown)) !== null) {
        const linkText = linkMatch[1];
        links.push(linkText);
    }
    
    // Parse markdown first
    let html = '';
    try {
        if (typeof marked === 'undefined') {
            console.error('Marked library not loaded');
            html = '<p>Error: Markdown parser not loaded.</p>';
        } else {
            html = marked.parse(markdown);
            if (!html || html.trim() === '') {
                console.warn('Marked returned empty HTML for:', filename);
                html = '<p>No content to display.</p>';
            } else {
                // Process images - fix paths to point to posts/images/
                html = processImagesInHTML(html);
                // Then process callouts in the HTML
                html = processCalloutsInHTML(html);
                if (!html || html.trim() === '') {
                    console.warn('Callout processing returned empty HTML for:', filename);
                    html = marked.parse(markdown); // Fallback to original HTML
                    html = processImagesInHTML(html); // Still process images in fallback
                }
            }
        }
    } catch (error) {
        console.error('Error parsing markdown:', error, 'for file:', filename);
        html = '<p>Error loading content.</p>';
    }
    
    // Process coverImage to ensure it's an absolute path
    let coverImage = frontmatter.coverImage || '';
    if (coverImage) {
        // If it's not already an absolute URL or absolute path, make it absolute
        if (!coverImage.startsWith('http://') && 
            !coverImage.startsWith('https://') && 
            !coverImage.startsWith('//') &&
            !coverImage.startsWith('/')) {
            // Add images/ prefix if not present
            if (!coverImage.startsWith('images/')) {
                coverImage = 'images/' + coverImage;
            }
            // Make it absolute from site root
            coverImage = '/posts/' + coverImage;
        }
    }
    
    // Parse index field - handle both boolean and string values, default to true
    let indexValue = true;
    if (frontmatter.index !== undefined) {
        if (typeof frontmatter.index === 'boolean') {
            indexValue = frontmatter.index;
        } else if (typeof frontmatter.index === 'string') {
            indexValue = frontmatter.index.toLowerCase() !== 'false';
        } else {
            indexValue = frontmatter.index !== false && frontmatter.index !== 0;
        }
    }
    
    const post = {
        slug: slug,
        title: frontmatter.title || filename.replace('.md', ''),
        publish: frontmatter.publish !== false, // default to true
        index: indexValue,
        category: frontmatter.category || '',
        date: frontmatter.date || '',
        coverImage: coverImage,
        tags: tags,
        links: links,
        markdown: markdown,
        html: html
    };
    
    // Debug logging for curriculum posts and thank you page
    if (filename.includes('curriculums') || filename.includes('creator ops') || filename.includes('mastering chaos') || filename.includes('thank you')) {
        console.log('Parsed post details:', { filename, frontmatterCategory: frontmatter.category, postCategory: post.category, slug: post.slug, frontmatterIndex: frontmatter.index, postIndex: post.index });
    }
    
    return post;
}

// Handle navigation
function handleNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const slug = link.getAttribute('data-slug') || '';
            console.log('Navigation clicked:', slug);
            navigateTo(slug);
        });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        const slug = e.state?.slug || getSlugFromPath();
        navigateTo(slug, false);
    });
    
    // Also handle clicks on navigation links via event delegation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a.nav-link');
        if (link) {
            e.preventDefault();
            e.stopPropagation();
            const slug = link.getAttribute('data-slug') || '';
            navigateTo(slug);
        }
    });
}

// Navigate to a specific page
function navigateTo(slug, pushState = true) {
    currentSlug = slug || '';
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-slug') === slug) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update URL
    if (pushState) {
        const path = slug ? `/${slug}` : '/';
        window.history.pushState({ slug }, '', path);
    }
    
    // Load content
    loadContent(slug);
}

// Get slug from current path
function getSlugFromPath() {
    const path = window.location.pathname;
    return path === '/' ? '' : path.replace(/^\//, '').replace(/\/$/, '');
}

// Load initial page based on URL
function loadInitialPage() {
    const slug = getSlugFromPath();
    console.log('Loading initial page with slug:', slug);
    navigateTo(slug, false);
}

// Helper function to check if a category matches a slug (handles singular/plural)
function categoryMatchesSlug(category, slug) {
    if (!category) return false;
    
    const normalizedCategory = category.toLowerCase().trim();
    const normalizedSlug = slug.toLowerCase().trim();
    
    // Exact match
    if (normalizedCategory === normalizedSlug) return true;
    
    // Handle common singular/plural variations
    const categoryVariations = {
        'posts': ['post', 'posts'],
        'post': ['post', 'posts'],
        'curriculums': ['curriculum', 'curriculums'],
        'curriculum': ['curriculum', 'curriculums'],
        'templates': ['template', 'templates'],
        'template': ['template', 'templates'],
        'rambles': ['ramble', 'rambles'],
        'ramble': ['ramble', 'rambles'],
        'projects': ['project', 'projects'],
        'project': ['project', 'projects']
    };
    
    // Check if both category and slug are in the same variation group
    const categoryGroup = categoryVariations[normalizedCategory];
    const slugGroup = categoryVariations[normalizedSlug];
    
    if (categoryGroup && slugGroup) {
        // Check if they share any common variation
        return categoryGroup.some(cat => slugGroup.includes(cat));
    }
    
    return false;
}

// Load content for a specific slug
function loadContent(slug) {
    const container = document.getElementById('content-container');
    
    if (!container) {
        console.error('Content container not found!');
        return;
    }
    
    console.log('loadContent called with slug:', slug);
    container.innerHTML = '<div class="content"><p>Loading...</p></div>';
    
    if (!slug || slug === '') {
        // Home page
        console.log('Rendering home page');
        renderHomePage(container);
    } else if (slug.startsWith('tag/')) {
        // Tag filtering
        const tagName = decodeURIComponent(slug.replace('tag/', ''));
        const taggedPosts = allPosts.filter(post => {
            // Filter out posts with index: false (handle both boolean and string)
            const indexValue = post.index;
            if (indexValue === false || indexValue === 'false' || indexValue === 0) {
                return false;
            }
            return post.tags && post.tags.some(tag => tag.toLowerCase() === tagName.toLowerCase());
        });
        renderTagPage(container, tagName, taggedPosts);
    } else {
        // Category page or single post
        console.log('Loading content for slug:', slug, 'Total posts:', allPosts.length);
        
        // Check for exact slug match first
        const exactMatch = allPosts.find(p => {
            const postSlug = p.slug.replace(/^\/+/, '').replace(/\/+$/, '');
            return postSlug === slug;
        });
        
        if (exactMatch) {
            console.log('Found exact match:', exactMatch.title);
            // Single post
            renderPost(container, exactMatch);
        } else {
            // Filter by category or slug prefix
            console.log('Filtering posts for slug:', slug);
            console.log('Total posts:', allPosts.length);
            
            // Check posts with curriculums category specifically
            const curriculumsPosts = allPosts.filter(p => {
                const cat = (p.category || '').toLowerCase();
                return cat === 'curriculums' || cat === 'curriculum';
            });
            console.log('Posts with curriculums category:', curriculumsPosts.length, curriculumsPosts.map(p => ({ title: p.title, category: p.category, slug: p.slug })));
            
            // Check posts with slug starting with curriculums/
            const curriculumsSlugPosts = allPosts.filter(p => {
                const postSlug = (p.slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
                return postSlug.startsWith('curriculums/');
            });
            console.log('Posts with curriculums/ slug prefix:', curriculumsSlugPosts.length, curriculumsSlugPosts.map(p => ({ title: p.title, slug: p.slug })));
            
            const categoryPosts = allPosts.filter(post => {
                // Filter out posts with index: false (check both boolean false and string "false")
                const indexValue = post.index;
                if (indexValue === false || indexValue === 'false' || indexValue === 0) {
                    console.log('🚫 Filtered out post (index: false):', post.title);
                    return false;
                }
                
                const postSlug = (post.slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
                const postCategory = post.category || '';
                const matchesCategory = categoryMatchesSlug(postCategory, slug);
                const matchesSlugPrefix = postSlug.startsWith(slug + '/');
                const matches = matchesCategory || matchesSlugPrefix;
                if (matches) {
                    console.log('✅ Matched post:', post.title, 'category:', postCategory, 'slug:', postSlug, 'index:', indexValue, 'matchesCategory:', matchesCategory, 'matchesSlugPrefix:', matchesSlugPrefix);
                }
                return matches;
            });
            
            console.log('Category posts found:', categoryPosts.length, categoryPosts.map(p => ({ title: p.title, category: p.category })));
            
            if (categoryPosts.length > 0) {
                // Category listing
                renderCategoryPage(container, slug, categoryPosts);
            } else {
                // Not found
                console.log('No posts found for slug:', slug);
                container.innerHTML = `
                    <div class="content">
                        <h1>Page Not Found</h1>
                        <p>No posts found for "${slug}".</p>
                        <p><a href="/">Return to home</a></p>
                    </div>
                `;
            }
        }
    }
}

// Render home page
function renderHomePage(container) {
    if (!container) {
        console.error('Container is null in renderHomePage!');
        return;
    }
    
    console.log('Rendering home page, allPosts count:', allPosts.length);
    console.log('All posts:', allPosts.map(p => ({ title: p.title, slug: p.slug })));
    
    const homePost = allPosts.find(p => {
        const postSlug = p.slug.replace(/^\//, '').replace(/\/$/, '');
        return postSlug === '' || postSlug === 'home' || postSlug === 'index';
    });
    
    let html = '';
    
    if (homePost && homePost.html && homePost.html.trim() !== '') {
        console.log('Found home post with HTML:', homePost.title, 'HTML length:', homePost.html.length);
        html += `<div class="content">${homePost.html}</div>`;
    } else {
        console.log('No home post found or no HTML, using default content');
        html += `
            <div class="content">
                <h1>I'm Nora 👋</h1>
                <p>Hi, I'm Nora, you can read <a href="/about">about me</a> here. I'm currently in the process of revamping my website, you can read about that here: <a href="/building-my-knowledge-garden">building my knowledge garden</a>.</p>
                <p>While this site used to be my primary income source, I've since "retired" and I am no longer offering 1-on-1 services nor selling courses. All my content is available for free with the exception of some collaborative notion templates that I still sell. If you'd like to support my work in other ways, you can do so here: <a href="/support">support my work</a>.</p>
            </div>
        `;
    }
    
    // Add latest posts - sorted by date (most recent first)
    const latestPosts = allPosts
        .filter(p => {
            // Filter out posts with index: false (handle both boolean and string)
            const indexValue = p.index;
            if (indexValue === false || indexValue === 'false' || indexValue === 0) {
                return false;
            }
            
            const slug = p.slug.replace(/^\//, '');
            return (categoryMatchesSlug(p.category, 'posts') || slug.startsWith('posts/')) && 
                   slug !== '' && 
                   slug !== '/' && 
                   slug !== 'home' && 
                   slug !== 'index';
        })
        .sort((a, b) => {
            // Sort by date, most recent first
            const dateA = a.date ? new Date(a.date) : new Date(0); // Use epoch if no date
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA; // Descending order (newest first)
        })
        .slice(0, 5);
    
    if (latestPosts.length > 0) {
        html += `<h2 class="section-header">Read the latest</h2>`;
        html += `<ul class="post-list">`;
        latestPosts.forEach(post => {
            const postSlug = post.slug.startsWith('/') ? post.slug : '/' + post.slug;
            html += `
                <li class="post-item">
                    <a href="${postSlug}" class="post-link">${post.title}</a>
                </li>
            `;
        });
        html += `</ul>`;
    }
    
    if (!html || html.trim() === '') {
        html = `
            <div class="content">
                <h1>I'm Nora 👋</h1>
                <p>Hi, I'm Nora, you can read <a href="/about">about me</a> here. I'm currently in the process of revamping my website, you can read about that here: <a href="/building-my-knowledge-garden">building my knowledge garden</a>.</p>
                <p>While this site used to be my primary income source, I've since "retired" and I am no longer offering 1-on-1 services nor selling courses. All my content is available for free with the exception of some collaborative notion templates that I still sell. If you'd like to support my work in other ways, you can do so here: <a href="/support">support my work</a>.</p>
            </div>
        `;
    }
    
    console.log('Setting home page HTML, length:', html.length);
    container.innerHTML = html;
    console.log('Home page HTML set successfully');
    
    // Attach click handlers to post links
    attachLinkHandlers(container);
    setupCallouts(container);
}

// Render a single post
function renderPost(container, post) {
    let tagsHtml = '';
    if (post.tags && post.tags.length > 0) {
        tagsHtml = '<div class="post-tags">';
        post.tags.forEach(tag => {
            tagsHtml += `<a href="/tag/${encodeURIComponent(tag.toLowerCase())}" class="tag-link">${tag}</a>`;
        });
        tagsHtml += '</div>';
    }
    
    const postHtml = post.html || '<p>No content available.</p>';
    container.innerHTML = `
        <div class="content">
            <h1>${post.title}</h1>
            ${tagsHtml}
            ${postHtml}
        </div>
    `;
    console.log('Post rendered:', post.title, 'HTML length:', postHtml.length);
    attachLinkHandlers(container);
    setupCallouts(container);
}

// Render category page
function renderCategoryPage(container, category, posts) {
    console.log('Rendering category page:', category, 'with', posts.length, 'posts');
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    
    let html = `<div class="content"><h1>${categoryTitle}</h1>`;
    
    if (posts.length === 0) {
        html += `<p>No posts found in this category.</p>`;
    } else {
        // Sort posts by title
        const sortedPosts = [...posts].sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
        
        // Check if any posts have cover images
        // But always use list format for curriculums, templates, and projects
        const useListFormat = categoryMatchesSlug(category, 'curriculums') || 
                              categoryMatchesSlug(category, 'templates') || 
                              categoryMatchesSlug(category, 'projects');
        const hasCoverImages = sortedPosts.some(post => post.coverImage) && !useListFormat;
        
        if (hasCoverImages) {
            // Display as grid with cover images
            html += `<div class="post-grid">`;
            sortedPosts.forEach(post => {
                const postSlug = post.slug.startsWith('/') ? post.slug : '/' + post.slug;
                html += `
                    <div class="post-card">
                        <a href="${postSlug}" class="post-card-link">
                            ${post.coverImage ? `<img src="${post.coverImage}" alt="${post.title}" class="post-cover-image">` : ''}
                            <div class="post-card-content">
                                <h3 class="post-card-title">${post.title}</h3>
                            </div>
                        </a>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            // Display as simple list
            html += `<ul class="post-list">`;
            sortedPosts.forEach(post => {
                const postSlug = post.slug.startsWith('/') ? post.slug : '/' + post.slug;
                html += `
                    <li class="post-item">
                        <a href="${postSlug}" class="post-link">${post.title}</a>
                    </li>
                `;
            });
            html += `</ul>`;
        }
    }
    
    html += `</div>`;
    container.innerHTML = html;
    attachLinkHandlers(container);
}

// Render tag page
function renderTagPage(container, tagName, posts) {
    let html = `<div class="content"><h1>Tag: ${tagName}</h1>`;
    
    if (posts.length === 0) {
        html += `<p>No posts found with this tag.</p>`;
    } else {
        // Check if any posts have cover images
        const hasCoverImages = posts.some(post => post.coverImage);
        
        if (hasCoverImages) {
            // Display as grid with cover images
            html += `<div class="post-grid">`;
            posts.forEach(post => {
                const postSlug = post.slug.startsWith('/') ? post.slug : '/' + post.slug;
                html += `
                    <div class="post-card">
                        <a href="${postSlug}" class="post-card-link">
                            ${post.coverImage ? `<img src="${post.coverImage}" alt="${post.title}" class="post-cover-image">` : ''}
                            <div class="post-card-content">
                                <h3 class="post-card-title">${post.title}</h3>
                            </div>
                        </a>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            // Display as simple list
            html += `<ul class="post-list">`;
            posts.forEach(post => {
                const postSlug = post.slug.startsWith('/') ? post.slug : '/' + post.slug;
                html += `
                    <li class="post-item">
                        <a href="${postSlug}" class="post-link">${post.title}</a>
                    </li>
                `;
            });
            html += `</ul>`;
        }
    }
    
    html += `</div>`;
    container.innerHTML = html;
    attachLinkHandlers(container);
}

// Setup callout collapsing functionality
function setupCallouts(container) {
    container.querySelectorAll('.callout').forEach(callout => {
        const title = callout.querySelector('.callout-title');
        if (!title) return;
        
        // Add fold icon if not present
        let foldIcon = title.querySelector('.fold-callout-icon');
        if (!foldIcon) {
            foldIcon = document.createElement('div');
            foldIcon.className = 'fold-callout-icon';
            title.insertBefore(foldIcon, title.firstChild);
        }
        
        // Add click handler to toggle collapse
        title.addEventListener('click', () => {
            callout.classList.toggle('is-collapsed');
        });
    });
}

// Attach click handlers to internal links
function attachLinkHandlers(container) {
    container.querySelectorAll('a[href^="/"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            const slug = href.replace(/^\//, '').replace(/\/$/, '');
            navigateTo(slug);
        });
    });
}

// Handle search
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length === 0) {
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
    
    // Handle Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 0) {
                performSearch(query);
            }
        }
    });
}

// Perform search
function performSearch(query) {
    const results = allPosts.filter(post => {
        // Filter out posts with index: false (handle both boolean and string)
        const indexValue = post.index;
        if (indexValue === false || indexValue === 'false' || indexValue === 0) {
            return false;
        }
        
        const tagsText = post.tags ? post.tags.join(' ').toLowerCase() : '';
        const searchText = (post.title + ' ' + tagsText + ' ' + post.markdown).toLowerCase();
        return searchText.includes(query);
    });
    
    const container = document.getElementById('content-container');
    let html = `<div class="content"><h1>Search Results</h1>`;
    
    if (results.length === 0) {
        html += `<p>No results found for "${query}".</p>`;
    } else {
        html += `<p>Found ${results.length} result(s) for "${query}":</p>`;
        html += `<ul class="post-list">`;
        results.forEach(post => {
            const postSlug = post.slug.startsWith('/') ? post.slug : '/' + post.slug;
            html += `
                <li class="post-item">
                    <a href="${postSlug}" class="post-link">${post.title}</a>
                </li>
            `;
        });
        html += `</ul>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
    attachLinkHandlers(container);
}

// Create sample content if no posts found
function createSampleContent() {
    console.log('Creating sample content structure. Add your markdown files to the posts/ directory.');
}
