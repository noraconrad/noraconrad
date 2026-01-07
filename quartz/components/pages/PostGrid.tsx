import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, joinSegments } from "../../util/path"

interface PostGridOptions {
  folder?: string
  tag?: string
  sortBy?: "date" | "title"
  sortDirection?: "asc" | "desc"
  limit?: number
}

export default ((opts?: PostGridOptions) => {
  const PostGrid: QuartzComponent = (props: QuartzComponentProps) => {
    const { allFiles, cfg } = props
    const {
      folder = "01. posts",
      tag = "posts",
      sortBy = "date",
      sortDirection = "desc",
      limit,
    } = opts || {}

    // Filter files
    let posts: QuartzPluginData[] = allFiles.filter((file) => {
      // Must be published
      if (file.frontmatter?.publish !== true && file.frontmatter?.publish !== "true") {
        return false
      }

      // Must be in the specified folder
      if (folder) {
        const filePath = file.filePath || ""
        const folderPath = folder.toLowerCase().replace(/\s+/g, "-")
        if (!filePath.toLowerCase().includes(folderPath)) {
          return false
        }
      }

      // Must have the specified tag
      if (tag) {
        const tags = file.frontmatter?.tags || []
        const tagArray = Array.isArray(tags) ? tags : [tags]
        const hasTag = tagArray.some((t: string) => {
          const tagStr = String(t).toLowerCase()
          return tagStr === tag.toLowerCase() || tagStr.endsWith(`/${tag.toLowerCase()}`)
        })
        if (!hasTag) {
          return false
        }
      }

      // Exclude index files
      if (file.slug?.endsWith("/index") || file.slug === "index") {
        return false
      }

      return true
    })

    // Sort posts
    posts.sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortBy === "date") {
        aVal = a.frontmatter?.date || a.dates?.modified || a.dates?.created || new Date(0)
        bVal = b.frontmatter?.date || b.dates?.modified || b.dates?.created || new Date(0)
        // Convert to Date if string
        if (typeof aVal === "string") aVal = new Date(aVal)
        if (typeof bVal === "string") bVal = new Date(bVal)
      } else {
        aVal = a.frontmatter?.title || a.slug || ""
        bVal = b.frontmatter?.title || b.slug || ""
      }

      if (aVal === bVal) return 0
      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === "desc" ? -comparison : comparison
    })

    // Apply limit
    if (limit && limit > 0) {
      posts = posts.slice(0, limit)
    }

    // Generate HTML for post cards
    const cardsHtml = posts
      .map((post) => {
        const slug = post.slug || ""
        const title = post.frontmatter?.title || slug.split("/").pop() || "Untitled"
        const coverImage = post.frontmatter?.coverImage || ""
        const url = joinSegments(slug) as FullSlug

        // Build image tag if coverImage exists
        const imageHtml = coverImage
          ? `<img src="${coverImage}" alt="${title}" style="width: 100%; height: 220px; object-fit: cover;" />`
          : ""

        return `
          <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: transform 0.2s;">
            <a href="/${url}" style="text-decoration: none; color: inherit; display: block;">
              ${imageHtml}
              <h4 style="padding: 12px; margin: 0; font-size: 14px; line-height: 1.3;">${title}</h4>
            </a>
          </div>
        `
      })
      .join("")

    return (
      <div
        class="post-grid"
        dangerouslySetInnerHTML={{
          __html: `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
              ${cardsHtml}
            </div>
          `,
        }}
      />
    )
  }

  PostGrid.css = `
    .post-grid a:hover {
      opacity: 0.8;
    }
    .post-grid > div > div:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
  `

  return PostGrid
}) satisfies QuartzComponentConstructor<PostGridOptions>
