import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const SocialLinks: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const links = opts?.links ?? {}
    
    if (Object.keys(links).length === 0) {
      return null
    }

    return (
      <div class={classNames(displayClass, "social-links")}>
        <h3>Connect</h3>
        <ul>
          {Object.entries(links).map(([text, link]) => (
            <li>
              <a href={link} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  SocialLinks.css = `
  .social-links {
    margin-top: 2rem;
  }

  .social-links h3 {
    font-size: 1rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
    color: var(--dark);
  }

  .social-links ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .social-links li {
    display: inline;
  }

  .social-links a {
    color: var(--secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .social-links a:hover {
    color: var(--tertiary);
  }

  .social-links li:not(:last-child)::after {
    content: " |";
    color: var(--gray);
    margin-left: 0.5rem;
  }
  `

  return SocialLinks
}) satisfies QuartzComponentConstructor
