import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { FullSlug, getAllSegmentPrefixes, resolveRelative, simplifySlug } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { i18n } from "../../i18n"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"

interface TagContentOptions {
  sort?: SortFn
  numPages: number
}

const defaultOptions: TagContentOptions = {
  numPages: 10,
}

export default ((opts?: Partial<TagContentOptions>) => {
  const options: TagContentOptions = { ...defaultOptions, ...opts }

  const TagContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props
    const slug = fileData.slug

    if (!(slug?.startsWith("tags/") || slug === "tags")) {
      throw new Error(`Component "TagContent" tried to render a non-tag page: ${slug}`)
    }

    // Extract tag from slug - handle both "tags/posts" and "tags" cases
    const tagSlug = slug.slice("tags/".length)
    const tag = tagSlug ? simplifySlug(tagSlug as FullSlug) : "/"
    const allPagesWithTag = (tag: string) => {
      // Normalize tag for matching
      const normalizedTag = tag.toLowerCase().trim()
      return allFiles.filter((file) => {
        // Ensure file has required properties
        if (!file.slug || !file.frontmatter) {
          return false
        }
        
        const fileTags = file.frontmatter?.tags ?? []
        if (!fileTags || (Array.isArray(fileTags) && fileTags.length === 0)) {
          return false
        }
        
        const tagArray = Array.isArray(fileTags) ? fileTags : [fileTags]
        const allPrefixes = tagArray.flatMap((t: string) => {
          const tagStr = String(t).trim()
          return tagStr ? getAllSegmentPrefixes(tagStr) : []
        })
        return allPrefixes.some((t: string) => t.toLowerCase().trim() === normalizedTag)
      })
    }

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")
    if (tag === "/") {
      const tags = [
        ...new Set(
          allFiles.flatMap((data) => data.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes),
        ),
      ].sort((a, b) => a.localeCompare(b))
      const tagItemMap: Map<string, QuartzPluginData[]> = new Map()
      for (const tag of tags) {
        tagItemMap.set(tag, allPagesWithTag(tag))
      }
      return (
        <div class="popover-hint">
          <article class={classes}>
            <p>{content}</p>
          </article>
          <p>{i18n(cfg.locale).pages.tagContent.totalTags({ count: tags.length })}</p>
          <div>
            {tags.map((tag) => {
              const pages = tagItemMap.get(tag)!
              const listProps = {
                ...props,
                allFiles: pages,
              }

              const contentPage = allFiles.filter((file) => file.slug === `tags/${tag}`).at(0)

              const root = contentPage?.htmlAst
              const content =
                !root || root?.children.length === 0
                  ? contentPage?.description
                  : htmlToJsx(contentPage.filePath!, root)

              const tagListingPage = `/tags/${tag}` as FullSlug
              const href = resolveRelative(fileData.slug!, tagListingPage)

              return (
                <div>
                  <h2>
                    <a class="internal tag-link" href={href}>
                      {tag}
                    </a>
                  </h2>
                  {content && <p>{content}</p>}
                  <div class="page-listing">
                    <p>
                      {i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: pages.length })}
                      {pages.length > options.numPages && (
                        <>
                          {" "}
                          <span>
                            {i18n(cfg.locale).pages.tagContent.showingFirst({
                              count: options.numPages,
                            })}
                          </span>
                        </>
                      )}
                    </p>
                    <PageList limit={options.numPages} {...listProps} sort={options?.sort} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    } else {
      let pages = allPagesWithTag(tag)
      
      // Filter out files that don't have required properties for PageList
      // Be very permissive - only exclude if file is null/undefined or slug is completely missing
      const originalCount = pages.length
      pages = pages.filter((file) => {
        if (!file) return false
        // Only require slug - frontmatter can be empty object
        if (!file.slug || file.slug.trim() === "") return false
        return true
      })
      
      const listProps = {
        ...props,
        allFiles: pages,
      }

      // Always render PageList so we can see debug messages
      // Use original count for display
      return (
        <div class="popover-hint">
          <article class={classes}>{content}</article>
          <div class="page-listing">
            <p>{i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: originalCount })}</p>
            <p style="font-size: 0.9em; color: #666; margin-top: 0.5em;">
              DEBUG: Found {originalCount} files with tag "{tag}", filtered to {pages.length} files with slugs.
              {pages.length > 0 && pages.length < 5 && (
                <span> Sample slugs: {pages.slice(0, 3).map(p => p.slug).join(", ")}</span>
              )}
            </p>
            <div>
              <PageList {...listProps} sort={options?.sort} />
            </div>
          </div>
        </div>
      )
    }
  }

  TagContent.css = concatenateResources(style, PageList.css)
  return TagContent
}) satisfies QuartzComponentConstructor
