import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"

const HomeLink: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  return (
    <div class="home-link">
      <a href={resolveRelative(fileData.slug!, "index" as any)} class="internal">
        Home
      </a>
    </div>
  )
}

HomeLink.css = `
.home-link {
  margin-bottom: 1rem;
}

.home-link a {
  font-weight: 600;
  font-size: 1rem;
  color: var(--dark);
  text-decoration: none;
  display: block;
  padding: 0.5rem 0;
}

.home-link a:hover {
  color: var(--secondary);
}
`

export default (() => HomeLink) satisfies QuartzComponentConstructor
