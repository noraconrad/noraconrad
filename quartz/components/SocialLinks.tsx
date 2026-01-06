import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { version } from "../../package.json"
import { i18n } from "../i18n"

interface Options {
  links: Record<string, string>
}

const getIcon = (name: string) => {
  const icons: Record<string, any> = {
    YouTube: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    LinkedIn: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    Pinterest: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
      </svg>
    ),
    Newsletter: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    ),
  }
  return icons[name] || icons.Newsletter
}

let numSocialLinks = 0
export default ((opts?: Options) => {
  const SocialLinks: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const links = opts?.links ?? {}
    const year = new Date().getFullYear()
    const id = `social-links-${numSocialLinks++}`
    
    if (Object.keys(links).length === 0) {
      return null
    }

    return (
      <div class={classNames(displayClass, "social-links", "collapsible")}>
        <button
          type="button"
          class="title-button social-links-toggle"
          aria-expanded={true}
          aria-controls={id}
        >
          <h2>Connect</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id={id} class="social-links-content" aria-expanded={true} role="group">
          <ul>
            {Object.entries(links).map(([text, link]) => (
              <li>
                <a href={link} target="_blank" rel="noopener noreferrer" aria-label={text}>
                  {getIcon(text)}
                </a>
              </li>
            ))}
          </ul>
          <p class="quartz-credit">
            {i18n(cfg.locale).components.footer.createdWith}{" "}
            <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
          </p>
        </div>
      </div>
    )
  }

  SocialLinks.css = `
  .social-links {
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    min-height: 1.2rem;
    flex: 0 1 auto;
    margin-top: 2rem;
  }

  .social-links.collapsed {
    flex: 0 1 1.2rem;
  }

  .social-links.collapsed .fold {
    transform: rotateZ(-90deg);
  }

  .social-links .fold {
    margin-left: 0.5rem;
    transition: transform 0.3s ease;
    opacity: 0.8;
  }

  .social-links-toggle {
    background-color: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 0;
    color: var(--dark);
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .social-links-toggle h2 {
    font-size: 1rem;
    margin: 0;
    font-weight: 600;
    color: var(--dark);
  }

  .social-links-content {
    overflow: visible;
    margin-top: 0.5rem;
  }

  .social-links.collapsed .social-links-content {
    display: none;
  }

  .social-links ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .social-links li {
    display: inline-flex;
  }

  .social-links a {
    color: var(--dark);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .social-links a:hover {
    color: var(--secondary);
  }

  .social-links svg:not(.fold) {
    width: 20px;
    height: 20px;
  }

  .social-links .quartz-credit {
    margin-top: 1.5rem;
    font-size: 8pt;
    color: var(--gray);
    line-height: 1.4;
  }

  .social-links .quartz-credit a {
    color: var(--gray);
    text-decoration: none;
  }

  .social-links .quartz-credit a:hover {
    color: var(--darkgray);
  }
  `

  // Add accordion toggle functionality
  SocialLinks.afterDOMLoaded = `
    document.addEventListener('DOMContentLoaded', function() {
      const socialLinksToggles = document.querySelectorAll('.social-links-toggle');
      socialLinksToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
          const socialLinks = this.closest('.social-links');
          if (socialLinks) {
            const isCurrentlyCollapsed = socialLinks.classList.contains('collapsed');
            
            // Close all other collapsible sections
            const allCollapsibles = document.querySelectorAll('.explorer, .social-links, .backlinks, .toc');
            allCollapsibles.forEach(section => {
              if (section !== socialLinks) {
                section.classList.add('collapsed');
                const sectionToggle = section.querySelector('.explorer-toggle, .social-links-toggle, .graph-toggle, .backlinks-toggle, .toc-header');
                const sectionContent = section.querySelector('.explorer-content, .social-links-content, .graph-content, .backlinks-content, .toc-content');
                if (sectionToggle) {
                  sectionToggle.setAttribute('aria-expanded', 'false');
                }
                if (sectionContent) {
                  sectionContent.setAttribute('aria-expanded', 'false');
                }
              }
            });
            
            // Toggle current section
            if (isCurrentlyCollapsed) {
              socialLinks.classList.remove('collapsed');
              this.setAttribute('aria-expanded', 'true');
              const content = socialLinks.querySelector('.social-links-content');
              if (content) {
                content.setAttribute('aria-expanded', 'true');
              }
            } else {
              socialLinks.classList.add('collapsed');
              this.setAttribute('aria-expanded', 'false');
              const content = socialLinks.querySelector('.social-links-content');
              if (content) {
                content.setAttribute('aria-expanded', 'false');
              }
            }
          }
        });
      });
    });
  `

  return SocialLinks
}) satisfies QuartzComponentConstructor
