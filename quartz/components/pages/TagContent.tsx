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
        // Be very permissive - only exclude if file is completely missing
        if (!file || !file.slug) {
          return false
        }
        
        // Get tags from frontmatter - handle both array and single value
        const fileTags = file.frontmatter?.tags ?? []
        if (!fileTags || (Array.isArray(fileTags) && fileTags.length === 0)) {
          return false
        }
        
        // Convert to array if it's a single value
        const tagArray = Array.isArray(fileTags) ? fileTags : [fileTags]
        
        // Check if any tag matches (direct match or prefix match)
        const hasMatchingTag = tagArray.some((t: string) => {
          const tagStr = String(t).trim()
          if (!tagStr) return false
          
          // Direct match
          if (tagStr.toLowerCase().trim() === normalizedTag) {
            return true
          }
          
          // Prefix match (for hierarchical tags like "category/subcategory")
          const prefixes = getAllSegmentPrefixes(tagStr)
          return prefixes.some((prefix: string) => prefix.toLowerCase().trim() === normalizedTag)
        })
        
        return hasMatchingTag
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
        <div class="popover-hint" style="height: auto !important; min-height: auto !important; display: block !important; visibility: visible !important; overflow: visible !important;">
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
      const originalCount = pages.length
      pages = pages.filter((file) => {
        if (!file) return false
        if (!file.slug || file.slug.trim() === "") return false
        return true
      })
      
      const listProps = {
        ...props,
        allFiles: pages,
      }
      return (
        <div class="popover-hint" style="height: auto !important; min-height: auto !important; display: block !important; visibility: visible !important; overflow: visible !important;">
          <article class={classes}>{content}</article>
          <div class="page-listing" style="height: auto !important; display: block !important; visibility: visible !important;">
            <p>{i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: originalCount })}</p>
            <PageList {...listProps} sort={options?.sort} />
          </div>
        </div>
      )
    }
  }

  TagContent.css = concatenateResources(
    style,
    PageList.css,
    `
    /* Ensure popover-hint elements are visible when used as page content */
    /* Override any height restrictions on popover-hint when it's not inside a popover */
    .center .popover-hint,
    .page-listing,
    .popover-hint:not(.popover .popover-hint) {
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      display: block !important;
      visibility: visible !important;
      overflow: visible !important;
    }
    
    /* Ensure all children are visible too */
    .popover-hint .page-listing,
    .popover-hint article,
    .popover-hint ul {
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      display: block !important;
      visibility: visible !important;
      overflow: visible !important;
    }
    `
  )
  return TagContent
}) satisfies QuartzComponentConstructor
