import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"

const HomeLink: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  return (
    <ul class="explorer-ul home-link-list">
      <li>
        <a href={resolveRelative(fileData.slug!, "index" as any)} class="folder-title">
          00. Home
        </a>
      </li>
    </ul>
  )
}

HomeLink.css = `
.home-link-list {
  list-style: none;
  margin: 0;
  padding: 0;
  margin-bottom: 0.5rem;
}

.home-link-list li > a.folder-title {
  color: var(--secondary);
  font-family: var(--headerFont);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5rem;
  display: inline-block;
  text-decoration: none;
  opacity: 0.75;
  transition: opacity 0.2s ease;
}

.home-link-list li > a.folder-title:hover {
  opacity: 1;
  color: var(--tertiary);
}

.home-link-list li > a.folder-title.active {
  opacity: 1;
  color: var(--tertiary);
}
`

export default (() => HomeLink) satisfies QuartzComponentConstructor
