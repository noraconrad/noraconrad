import { FullSlug, isFolderPath, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"

export type SortFn = (f1: QuartzPluginData, f2: QuartzPluginData) => number

export function byDateAndAlphabetical(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

export function byDateAndAlphabeticalFolderFirst(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort folders first
    const f1IsFolder = isFolderPath(f1.slug ?? "")
    const f2IsFolder = isFolderPath(f2.slug ?? "")
    if (f1IsFolder && !f2IsFolder) return -1
    if (!f1IsFolder && f2IsFolder) return 1

    // If both are folders or both are files, sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  // Debug: Always show something to verify component is rendering
  if (!allFiles || allFiles.length === 0) {
    return (
      <ul class="section-ul">
        <li class="section-li">
          <div class="section">
            <p>DEBUG: PageList rendered but allFiles is empty or undefined</p>
          </div>
        </li>
      </ul>
    )
  }

  // Ensure we have valid files with slugs - be more permissive
  const validFiles = allFiles.filter((file) => {
    return file && file.slug
  })
  
  if (validFiles.length === 0) {
    return (
      <ul class="section-ul">
        <li class="section-li">
          <div class="section">
            <p>No valid pages to display. (allFiles length: {allFiles?.length || 0})</p>
          </div>
        </li>
      </ul>
    )
  }

  // Debug output
  const debugInfo = (
    <div style="font-size: 0.8em; color: #999; margin: 0.5em 0; padding: 0.5em; background: #f0f0f0; border-radius: 3px;">
      <p><strong>PageList DEBUG:</strong></p>
      <ul style="margin: 0.25em 0; padding-left: 1.5em;">
        <li>Received allFiles: {allFiles.length}</li>
        <li>Valid files (with slugs): {validFiles.length}</li>
        <li>Limit: {limit || "none"}</li>
        <li>Has sort function: {sort ? "Yes" : "No"}</li>
      </ul>
    </div>
  )

  // Create a safe sort function that handles errors
  const safeSort = (a: QuartzPluginData, b: QuartzPluginData): number => {
    try {
      if (sort) {
        return sort(a, b)
      }
      return byDateAndAlphabeticalFolderFirst(cfg)(a, b)
    } catch (e) {
      // If sorting fails, just compare by title
      const aTitle = (a.frontmatter?.title || a.slug || "").toLowerCase()
      const bTitle = (b.frontmatter?.title || b.slug || "").toLowerCase()
      return aTitle.localeCompare(bTitle)
    }
  }

  let list: QuartzPluginData[] = []
  try {
    list = [...validFiles].sort(safeSort)
    if (limit && limit > 0) {
      list = list.slice(0, limit)
    }
  } catch (error) {
    // If sorting completely fails, just use the original order
    list = validFiles.slice(0, limit || validFiles.length)
  }

  if (list.length === 0) {
    return (
      <>
        {debugInfo}
        <ul class="section-ul">
          <li class="section-li">
            <div class="section">
              <p>List is empty after processing. (validFiles: {validFiles.length})</p>
            </div>
          </li>
        </ul>
      </>
    )
  }

  // Render a test item first to verify rendering works
  const testItem = (
    <li class="section-li" style="border: 2px solid red; padding: 1em; margin: 1em 0;">
      <div class="section">
        <div class="desc">
          <h3>
            <strong>TEST ITEM - If you see this, rendering works!</strong>
          </h3>
        </div>
      </div>
    </li>
  )

  return (
    <>
      {debugInfo}
      <div style="font-size: 0.8em; color: #999; margin: 0.5em 0;">
        <p>DEBUG: About to render {list.length} items.</p>
        <p>DEBUG: First item slug: {list[0]?.slug || "N/A"}</p>
        <p>DEBUG: First item title: {list[0]?.frontmatter?.title || list[0]?.slug || "N/A"}</p>
      </div>
      <ul class="section-ul">
        {testItem}
        {list.map((page, index) => {
          try {
            if (!page || !page.slug) {
              return (
                <li key={`invalid-${index}`} class="section-li">
                  <div class="section">
                    <p>Invalid page at index {index}</p>
                  </div>
                </li>
              )
            }
            
            const title = page.frontmatter?.title || page.slug?.split("/").pop() || "Untitled"
            const tags = page.frontmatter?.tags ?? []
            let pageDate = null
            try {
              pageDate = page.dates ? getDate(cfg, page) : null
            } catch (e) {
              // Date parsing failed, continue without date
            }

            return (
              <li key={page.slug || `page-${index}`} class="section-li">
                <div class="section">
                  {pageDate && (
                    <p class="meta">
                      <Date date={pageDate} locale={cfg.locale} />
                    </p>
                  )}
                  <div class="desc">
                    <h3>
                      <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                        {title}
                      </a>
                    </h3>
                  </div>
                  {tags.length > 0 && (
                    <ul class="tags">
                      {tags.map((tag, tagIndex) => (
                        <li key={tagIndex}>
                          <a
                            class="internal tag-link"
                            href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                          >
                            {tag}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          } catch (error) {
            return (
              <li key={`error-${index}`} class="section-li">
                <div class="section">
                  <p>Error rendering page at index {index}: {String(error)}</p>
                </div>
              </li>
            )
          }
        })}
      </ul>
    </>
  )
}

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`
