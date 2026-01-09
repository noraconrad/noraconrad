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
                    const response = await fetch(`posts/${filename}`);
                    if (!response.ok) {
                        console.error(`Failed to fetch ${filename}:`, response.status);
                        return null;
                    }
                    const content = await response.text();
                    const post = parseMarkdownWithFrontmatter(content, filename);
                    console.log(`Parsed ${filename}:`, post.title, 'HTML length:', post.html ? post.html.length : 0);
                    return post;
                } catch (error) {
                    console.error(`Error loading ${filename}:`, error);
                    return null;
                }
            })
        );
        
        allPosts = posts.filter(p => p !== null && p.publish !== false);
        console.log('Loaded posts:', allPosts.length, allPosts.map(p => ({ title: p.title, slug: p.slug, hasHtml: !!p.html, htmlLength: p.html ? p.html.length : 0 })));
        
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
                // Then process callouts in the HTML
                html = processCalloutsInHTML(html);
                if (!html || html.trim() === '') {
                    console.warn('Callout processing returned empty HTML for:', filename);
                    html = marked.parse(markdown); // Fallback to original HTML
                }
            }
        }
    } catch (error) {
        console.error('Error parsing markdown:', error, 'for file:', filename);
        html = '<p>Error loading content.</p>';
    }
    
    const post = {
        slug: slug,
        title: frontmatter.title || filename.replace('.md', ''),
        publish: frontmatter.publish !== false, // default to true
        category: frontmatter.category || '',
        date: frontmatter.date || '',
        coverImage: frontmatter.coverImage || '',
        tags: tags,
        links: links,
        markdown: markdown,
        html: html
    };
    
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
            const categoryPosts = allPosts.filter(post => {
                const postSlug = post.slug.replace(/^\/+/, '').replace(/\/+$/, '');
                const matchesCategory = post.category === slug;
                const matchesSlugPrefix = postSlug.startsWith(slug + '/');
                return matchesCategory || matchesSlugPrefix;
            });
            
            console.log('Category posts found:', categoryPosts.length, categoryPosts.map(p => p.title));
            
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
    
    // Add latest posts
    const latestPosts = allPosts
        .filter(p => {
            const slug = p.slug.replace(/^\//, '');
            return (p.category === 'posts' || slug.startsWith('posts/')) && 
                   slug !== '' && 
                   slug !== '/' && 
                   slug !== 'home' && 
                   slug !== 'index';
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
    
    // Add latest videos (you can customize this)
    html += `<h2 class="section-header">Watch the latest</h2>`;
    html += `<p><a href="https://youtu.be/-kdcuWPgeFs" class="post-link" target="_blank">https://youtu.be/-kdcuWPgeFs <svg class="external-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg></a></p>`;
    
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
