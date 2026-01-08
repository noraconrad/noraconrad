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
  if (!allFiles || allFiles.length === 0) {
    return <ul class="section-ul"></ul>
  }

  // Ensure we have valid files with slugs
  const validFiles = allFiles.filter((file) => {
    return file && file.slug
  })
  
  if (validFiles.length === 0) {
    return <ul class="section-ul"></ul>
  }

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
    return <ul class="section-ul"></ul>
  }

  return (
    <ul class="section-ul">
      {list.map((page, index) => {
        if (!page || !page.slug) {
          return null
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
      })}
    </ul>
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
