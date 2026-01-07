import { QuartzTransformerPlugin } from "../types"
import { Root, Html } from "mdast"
import { visit } from "unist-util-visit"
import { readFile } from "fs/promises"
import { join } from "path"
import yaml from "js-yaml"
import { FilePath, slugifyFilePath, pathToRoot } from "../../util/path"
import { BuildCtx } from "../../util/ctx"
import { QuartzPluginData } from "../vfile"

interface BaseFileView {
  type: string
  name: string
  filters?: {
    and?: Array<{
      file?: {
        inFolder?: string
        tags?: {
          contains?: string
        }
      }
    }>
  }
  order?: string[]
  sort?: Array<{
    property: string
    direction: "ASC" | "DESC"
  }>
  image?: string
}

interface BaseFile {
  views?: BaseFileView[]
}

export const BaseFiles: QuartzTransformerPlugin = () => {
  return {
    name: "BaseFiles",
    async markdownPlugins(ctx) {
      // Pre-load all .base files by both relative path and slug
      const baseFiles = new Map<string, BaseFile>()
      const baseFileData = ctx.allFiles.filter((f) => f.relativePath?.endsWith(".base"))

      for (const fileData of baseFileData) {
        try {
          const fullPath = join(ctx.argv.directory, fileData.relativePath!)
          const content = await readFile(fullPath, "utf-8")
          const data = yaml.load(content) as BaseFile
          // Store by both relative path and slug for lookup
          baseFiles.set(fileData.relativePath!, data)
          if (fileData.slug) {
            baseFiles.set(fileData.slug, data)
          }
        } catch (err) {
          console.warn(`Failed to load .base file ${fileData.relativePath}:`, err)
        }
      }

      return [
        () => {
          return (tree: Root, file) => {
            visit(tree, "html", (node: Html) => {
              // Look for transclude blocks that reference .base files
              const transcludeMatch = node.value.match(
                /<blockquote class="transclude".*?data-url="([^"]+\.base)"[^>]*>/,
              )
              if (transcludeMatch) {
                const baseFilePath = transcludeMatch[1]
                // Try to find the base file - could be a slug or relative path
                // Remove leading/trailing slashes and try different formats
                const normalizedPath = baseFilePath.replace(/^\/+|\/+$/g, "")
                const baseData = baseFiles.get(normalizedPath) || 
                                baseFiles.get(normalizedPath + ".base") ||
                                baseFiles.get(normalizedPath.replace(/-/g, "/"))
                
                if (!baseData) {
                  node.value = node.value.replace(
                    /<blockquote class="transclude".*?data-url="[^"]+\.base"[^>]*>.*?<\/blockquote>/s,
                    `<p>Collection file not found: ${baseFilePath}</p>`,
                  )
                  return
                }

                try {

                  if (baseData?.views && baseData.views.length > 0) {
                    const view = baseData.views[0] // Use first view
                    if (view.type === "cards") {
                      // Filter files based on view filters
                      let filteredFiles = ctx.allFiles.filter((f) => {
                        if (!view.filters?.and) return true

                        return view.filters.and.every((filter) => {
                          if (filter.file?.inFolder) {
                            const folder = filter.file.inFolder
                            // Match folder path - handle both "01. posts" and "01.-posts" formats
                            const folderSlug = folder.replace(/\./g, "-").replace(/\s+/g, "-").toLowerCase()
                            const fileSlug = f.slug ?? ""
                            if (!fileSlug.startsWith(folderSlug + "/") && !fileSlug.startsWith(folderSlug + "-")) {
                              return false
                            }
                          }
                          if (filter.file?.tags?.contains) {
                            const tag = filter.file.tags.contains
                            const tags = f.frontmatter?.tags ?? []
                            if (!tags.includes(tag)) {
                              return false
                            }
                          }
                          return true
                        })
                      })

                      // Sort files
                      if (view.sort) {
                        filteredFiles = filteredFiles.sort((a, b) => {
                          for (const sortRule of view.sort!) {
                            const prop = sortRule.property
                            const direction = sortRule.direction === "DESC" ? -1 : 1

                            let aVal: any
                            let bVal: any

                            if (prop === "date") {
                              aVal = a.dates?.published ?? a.dates?.modified ?? a.dates?.created
                              bVal = b.dates?.published ?? b.dates?.modified ?? b.dates?.created
                            } else if (prop === "title") {
                              aVal = a.frontmatter?.title ?? ""
                              bVal = b.frontmatter?.title ?? ""
                            } else {
                              aVal = a.frontmatter?.[prop] ?? ""
                              bVal = b.frontmatter?.[prop] ?? ""
                            }

                            if (aVal < bVal) return -1 * direction
                            if (aVal > bVal) return 1 * direction
                          }
                          return 0
                        })
                      }

                      // Generate table HTML
                      const baseDir = pathToRoot(file.data.slug!)
                      const tableRows = filteredFiles.map((f) => {
                        const title = f.frontmatter?.title ?? "Untitled"
                        const slug = f.slug ?? ""
                        const href = `${baseDir}${slug}`
                        const date = f.dates?.published ?? f.dates?.modified ?? f.dates?.created
                        const dateStr = date
                          ? new Date(date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : ""
                        const categories = (f.frontmatter?.categories ?? []).join(", ")
                        const image = view.image && f.frontmatter?.[view.image]
                          ? `<img src="${baseDir}${f.filePath?.replace(/\.md$/, "")}/${f.frontmatter[view.image]}" alt="${title}" style="max-width: 100px; height: auto;" />`
                          : ""

                        return `
                          <tr>
                            ${image ? `<td>${image}</td>` : ""}
                            <td><a href="${href}">${title}</a></td>
                            ${dateStr ? `<td>${dateStr}</td>` : ""}
                            ${categories ? `<td>${categories}</td>` : ""}
                          </tr>
                        `
                      })

                      const tableHeaders = [
                        view.image ? "<th>Image</th>" : "",
                        "<th>Title</th>",
                        "<th>Date</th>",
                        "<th>Categories</th>",
                      ]
                        .filter(Boolean)
                        .join("")

                      const tableHtml = `
                        <div class="base-table-container">
                          <table class="base-table">
                            <thead>
                              <tr>${tableHeaders}</tr>
                            </thead>
                            <tbody>
                              ${tableRows.join("")}
                            </tbody>
                          </table>
                        </div>
                      `

                      node.value = node.value.replace(
                        /<blockquote class="transclude".*?data-url="[^"]+\.base"[^>]*>.*?<\/blockquote>/s,
                        tableHtml,
                      )
                    }
                  }
                } catch (err) {
                  console.warn(`Failed to process .base file ${baseFilePath}:`, err)
                  node.value = node.value.replace(
                    /<blockquote class="transclude".*?data-url="[^"]+\.base"[^>]*>.*?<\/blockquote>/s,
                    `<p>Error loading collection: ${baseFilePath}</p>`,
                  )
                }
              }
            })
          }
        },
      ]
    },
    htmlPlugins() {
      return []
    },
  }
}
