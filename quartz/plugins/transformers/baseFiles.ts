import { QuartzTransformerPlugin } from "../types"
import { Root, Html } from "mdast"
import { visit } from "unist-util-visit"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import matter from "gray-matter"
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
        path?: {
          contains?: string
        }
        tags?: {
          contains?: string
        }
      }
      [key: string]: any // For property checks like "!categories.isEmpty()"
    }>
  }
  groupBy?: {
    property: string
    direction: "ASC" | "DESC"
  }
  order?: string[]
  sort?: Array<{
    property: string
    direction: "ASC" | "DESC"
  }>
  image?: string
  columnSize?: Record<string, number>
}

interface BaseFile {
  views?: BaseFileView[]
}

export const BaseFiles: QuartzTransformerPlugin = () => {
  return {
    name: "BaseFiles",
    markdownPlugins(ctx) {
      // Pre-load all .base files by both relative path and slug
      const baseFiles = new Map<string, BaseFile>()
      
      // Find all .base files from ctx.allFiles (which contains all file paths)
      const baseFilePaths = ctx.allFiles.filter((fp) => fp.endsWith(".base"))

      for (const baseFilePath of baseFilePaths) {
        try {
          const fullPath = join(ctx.argv.directory, baseFilePath)
          if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, "utf-8")
            const data = yaml.load(content) as BaseFile
            // Store by relative path
            baseFiles.set(baseFilePath, data)
            // Also store by slug format (without extension)
            const slug = slugifyFilePath(baseFilePath as FilePath)
            baseFiles.set(slug, data)
            // Store without .base extension for lookup
            baseFiles.set(baseFilePath.replace(/\.base$/, ""), data)
          }
        } catch (err) {
          console.warn(`Failed to load .base file ${baseFilePath}:`, err)
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
                let normalizedPath = baseFilePath.replace(/^\/+|\/+$/g, "")
                // Try exact match first
                let baseData = baseFiles.get(normalizedPath)
                // Try with .base extension
                if (!baseData && !normalizedPath.endsWith(".base")) {
                  baseData = baseFiles.get(normalizedPath + ".base")
                }
                // Try slug format (spaces to dashes)
                if (!baseData) {
                  const slugPath = normalizedPath.replace(/\s+/g, "-")
                  baseData = baseFiles.get(slugPath) || baseFiles.get(slugPath + ".base")
                }
                // Try reversing slug format (dashes to slashes)
                if (!baseData) {
                  baseData = baseFiles.get(normalizedPath.replace(/-/g, "/"))
                }
                // Try with spaces preserved
                if (!baseData) {
                  for (const [key, value] of baseFiles.entries()) {
                    if (key.includes(normalizedPath) || normalizedPath.includes(key.replace(/\.base$/, ""))) {
                      baseData = value
                      break
                    }
                  }
                }
                
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
                    if (view.type === "cards" || view.type === "table") {
                      // Load all markdown files with their frontmatter
                      const allMarkdownFiles: Array<{
                        path: string
                        slug: string
                        frontmatter: any
                        title: string
                      }> = []
                      
                      for (const filePath of ctx.allFiles) {
                        if (filePath.endsWith(".md")) {
                          try {
                            const fullPath = join(ctx.argv.directory, filePath)
                            if (existsSync(fullPath)) {
                              const content = readFileSync(fullPath, "utf-8")
                              const { data: frontmatter } = matter(content)
                              const slug = slugifyFilePath(filePath as FilePath)
                              allMarkdownFiles.push({
                                path: filePath,
                                slug,
                                frontmatter: frontmatter || {},
                                title: frontmatter?.title || filePath,
                              })
                            }
                          } catch (err) {
                            // Skip files that can't be read
                          }
                        }
                      }

                      // Filter files based on view filters
                      let filteredFiles = allMarkdownFiles.filter((f) => {
                        if (!view.filters?.and) return true

                        return view.filters.and.every((filter) => {
                          if (filter.file?.inFolder) {
                            const folder = filter.file.inFolder
                            // Match folder path - handle both "01. posts" and "01.-posts" formats
                            const folderSlug = folder.replace(/\./g, "-").replace(/\s+/g, "-").toLowerCase()
                            if (!f.slug.startsWith(folderSlug + "/") && !f.slug.startsWith(folderSlug + "-")) {
                              return false
                            }
                          }
                          if (filter.file?.path?.contains) {
                            const pathContains = filter.file.path.contains
                            if (!f.path.includes(pathContains)) {
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
                          // Handle property checks like "!categories.isEmpty()"
                          for (const [key, value] of Object.entries(filter)) {
                            if (key.startsWith("!")) {
                              const prop = key.slice(1).replace(/\.isEmpty\(\)$/, "")
                              const propValue = f.frontmatter?.[prop]
                              if (prop === "categories" && (!propValue || (Array.isArray(propValue) && propValue.length === 0))) {
                                return false
                              }
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

                            // Handle note.property format (e.g., note.stage -> frontmatter.stage)
                            const propName = prop.startsWith("note.") ? prop.slice(5) : prop
                            
                            if (prop === "date" || propName === "date") {
                              // Dates would need to be parsed, but for now use frontmatter
                              aVal = a.frontmatter?.date ?? a.frontmatter?.published ?? ""
                              bVal = b.frontmatter?.date ?? b.frontmatter?.published ?? ""
                            } else if (prop === "title" || propName === "title" || prop === "file.name") {
                              aVal = a.title ?? ""
                              bVal = b.title ?? ""
                            } else {
                              aVal = a.frontmatter?.[propName] ?? ""
                              bVal = b.frontmatter?.[propName] ?? ""
                            }

                            // Handle numeric comparison for stage/lesson
                            const aNum = parseFloat(aVal)
                            const bNum = parseFloat(bVal)
                            if (!isNaN(aNum) && !isNaN(bNum)) {
                              if (aNum < bNum) return -1 * direction
                              if (aNum > bNum) return 1 * direction
                            } else {
                              if (aVal < bVal) return -1 * direction
                              if (aVal > bVal) return 1 * direction
                            }
                          }
                          return 0
                        })
                      }

                      // Group files if groupBy is specified
                      let groupedFiles: Map<string, typeof filteredFiles> | null = null
                      if (view.groupBy) {
                        groupedFiles = new Map()
                        const groupProp = view.groupBy.property.startsWith("note.") 
                          ? view.groupBy.property.slice(5)
                          : view.groupBy.property
                        
                        for (const f of filteredFiles) {
                          const groupKey = Array.isArray(f.frontmatter?.[groupProp])
                            ? f.frontmatter[groupProp][0] // Use first category if array
                            : f.frontmatter?.[groupProp] ?? "Other"
                          if (!groupedFiles.has(groupKey)) {
                            groupedFiles.set(groupKey, [])
                          }
                          groupedFiles.get(groupKey)!.push(f)
                        }
                      }

                      // Generate table HTML
                      const baseDir = pathToRoot(file.data.slug!)
                      
                      // Determine columns from order array or default
                      const columns = view.order || ["file.name", "stage", "lesson"]
                      
                      const getPropertyValue = (f: typeof filteredFiles[0], prop: string): string => {
                        if (prop === "file.name" || prop === "title") {
                          return f.title
                        }
                        const propName = prop.startsWith("note.") ? prop.slice(5) : prop
                        const value = f.frontmatter?.[propName]
                        return Array.isArray(value) ? value.join(", ") : (value?.toString() ?? "")
                      }

                      const getHeaderName = (prop: string): string => {
                        if (prop === "file.name") return "File Name"
                        if (prop === "note.stage" || prop === "stage") return "Stage"
                        if (prop === "note.lesson" || prop === "lesson") return "Lesson"
                        if (prop.startsWith("note.")) return prop.slice(5).charAt(0).toUpperCase() + prop.slice(6)
                        return prop.charAt(0).toUpperCase() + prop.slice(1)
                      }

                      const renderTableRows = (files: typeof filteredFiles) => {
                        return files.map((f) => {
                          const slug = f.slug
                          const href = `${baseDir}${slug}`
                          const cells = columns.map((col) => {
                            const value = getPropertyValue(f, col)
                            if (col === "file.name" || col === "title") {
                              return `<td><a href="${href}">${value}</a></td>`
                            }
                            return `<td>${value}</td>`
                          })
                          return `<tr>${cells.join("")}</tr>`
                        }).join("")
                      }

                      const tableHeaders = columns.map((col) => `<th>${getHeaderName(col)}</th>`).join("")

                      let tableHtml = ""
                      if (groupedFiles) {
                        // Render grouped tables
                        const sortedGroups = Array.from(groupedFiles.entries()).sort((a, b) => {
                          if (view.groupBy!.direction === "DESC") {
                            return b[0].localeCompare(a[0])
                          }
                          return a[0].localeCompare(b[0])
                        })
                        
                        tableHtml = sortedGroups.map(([groupName, groupFiles]) => {
                          return `
                            <div class="base-table-group">
                              <h3 class="base-table-group-title">${groupName}</h3>
                              <div class="base-table-container">
                                <table class="base-table">
                                  <thead>
                                    <tr>${tableHeaders}</tr>
                                  </thead>
                                  <tbody>
                                    ${renderTableRows(groupFiles)}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          `
                        }).join("")
                      } else {
                        tableHtml = `
                          <div class="base-table-container">
                            <table class="base-table">
                              <thead>
                                <tr>${tableHeaders}</tr>
                              </thead>
                              <tbody>
                                ${renderTableRows(filteredFiles)}
                              </tbody>
                            </table>
                          </div>
                        `
                      }

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
