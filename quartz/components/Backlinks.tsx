import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/backlinks.scss"
import { resolveRelative, simplifySlug } from "../util/path"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

interface BacklinksOptions {
  hideWhenEmpty: boolean
}

const defaultOptions: BacklinksOptions = {
  hideWhenEmpty: true,
}

let numBacklinks = 0
export default ((opts?: Partial<BacklinksOptions>) => {
  const options: BacklinksOptions = { ...defaultOptions, ...opts }
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

  const Backlinks: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const slug = simplifySlug(fileData.slug!)
    const backlinkFiles = allFiles.filter((file) => file.links?.includes(slug))
    const id = `backlinks-${numBacklinks++}`
    if (options.hideWhenEmpty && backlinkFiles.length == 0) {
      return null
    }
    return (
      <div class={classNames(displayClass, "backlinks", "collapsible")}>
        <button
          type="button"
          class="title-button backlinks-toggle"
          aria-expanded={true}
          aria-controls={id}
        >
          <h2>{i18n(cfg.locale).components.backlinks.title}</h2>
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
        <div id={id} class="backlinks-content" aria-expanded={true} role="group">
          <OverflowList>
            {backlinkFiles.length > 0 ? (
              backlinkFiles.map((f) => (
                <li>
                  <a href={resolveRelative(fileData.slug!, f.slug!)} class="internal">
                    {f.frontmatter?.title}
                  </a>
                </li>
              ))
            ) : (
              <li>{i18n(cfg.locale).components.backlinks.noBacklinksFound}</li>
            )}
          </OverflowList>
        </div>
      </div>
    )
  }

  Backlinks.css = style
  const toggleScript = `
    document.addEventListener('DOMContentLoaded', function() {
      const backlinksToggles = document.querySelectorAll('.backlinks-toggle');
      backlinksToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
          const backlinks = this.closest('.backlinks');
          if (backlinks) {
            backlinks.classList.toggle('collapsed');
            const isExpanded = !backlinks.classList.contains('collapsed');
            this.setAttribute('aria-expanded', isExpanded);
            const content = backlinks.querySelector('.backlinks-content');
            if (content) {
              content.setAttribute('aria-expanded', isExpanded);
            }
          }
        });
      });
    });
  `
  Backlinks.afterDOMLoaded = concatenateResources(overflowListAfterDOMLoaded, toggleScript)

  return Backlinks
}) satisfies QuartzComponentConstructor
