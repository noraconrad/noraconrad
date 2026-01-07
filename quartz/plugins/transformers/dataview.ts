import { QuartzTransformerPlugin } from "../types"
import { Root, Code, Html } from "mdast"
import { visit } from "unist-util-visit"
import { BuildCtx } from "../../util/ctx"
import { QuartzPluginData } from "../vfile"
import { FilePath, joinSegments } from "../../util/path"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import matter from "gray-matter"
import { slugifyFilePath } from "../../util/path"

interface DataviewContext {
  allFiles: FilePath[]
  currentFile: QuartzPluginData
  ctx: BuildCtx
}

/**
 * Loads and parses a markdown file to extract frontmatter
 */
function loadFileData(filePath: FilePath, ctx: BuildCtx): QuartzPluginData | null {
  try {
    const fullPath = join(ctx.argv.directory, filePath)
    if (!existsSync(fullPath) || !filePath.endsWith(".md")) {
      return null
    }

    const content = readFileSync(fullPath, "utf-8")
    const { data: frontmatter } = matter(content)
    
    // Only include published files
    if (frontmatter?.publish !== true && frontmatter?.publish !== "true") {
      return null
    }

    const slug = slugifyFilePath(filePath)
    
    // Parse dates
    const dateStr = frontmatter?.date || frontmatter?.published || frontmatter?.created
    const lastmodStr = frontmatter?.lastmod || frontmatter?.modified
    const dates = {
      created: dateStr ? new Date(dateStr) : undefined,
      modified: lastmodStr ? new Date(lastmodStr) : undefined,
      published: dateStr ? new Date(dateStr) : undefined,
    }

    return {
      filePath,
      slug,
      frontmatter: frontmatter || {},
      dates,
    } as QuartzPluginData
  } catch (err) {
    return null
  }
}

/**
 * Creates a mock Dataview API object that mimics Obsidian's Dataview
 */
function createDataviewAPI(ctx: DataviewContext) {
  const { allFiles, ctx: buildCtx } = ctx

  // Load all markdown files
  const loadedFiles: QuartzPluginData[] = []
  for (const filePath of allFiles) {
    const fileData = loadFileData(filePath, buildCtx)
    if (fileData) {
      loadedFiles.push(fileData)
    }
  }

  // Mock page object
  class MockPage {
    constructor(private file: QuartzPluginData) {}

    get filePath() {
      return this.file.filePath
    }

    get title() {
      return this.file.frontmatter?.title || this.file.filePath
    }

    get date() {
      return this.file.frontmatter?.date || this.file.dates?.modified
    }

    get publish() {
      return this.file.frontmatter?.publish !== false
    }

    get coverImage() {
      return this.file.frontmatter?.coverImage
    }

    get tags() {
      const tags = this.file.frontmatter?.tags || []
      return Array.isArray(tags) ? tags : [tags]
    }

    get categories() {
      const categories = this.file.frontmatter?.categories || []
      return Array.isArray(categories) ? categories : [categories]
    }

    // Allow access to any frontmatter field
    get(prop: string) {
      return this.file.frontmatter?.[prop]
    }
  }

  // Mock pages collection
  class MockPages {
    private pages: MockPage[]

    constructor(files: QuartzPluginData[] | MockPage[]) {
      if (files.length > 0 && files[0] instanceof MockPage) {
        this.pages = files as MockPage[]
      } else {
        this.pages = (files as QuartzPluginData[]).map((f) => new MockPage(f))
      }
    }

    // Support tag queries like #posts
    where(predicate: (p: MockPage) => boolean): MockPages {
      const filtered = this.pages.filter(predicate)
      return new MockPages(filtered)
    }

    filter(predicate: (p: MockPage) => boolean): MockPages {
      return this.where(predicate)
    }

    sort(selector: (p: MockPage) => any, direction: "asc" | "desc" = "asc"): MockPages {
      const sorted = [...this.pages].sort((a, b) => {
        const aVal = selector(a)
        const bVal = selector(b)
        if (aVal === bVal) return 0
        if (direction === "asc") {
          return aVal < bVal ? -1 : 1
        } else {
          return aVal > bVal ? -1 : 1
        }
      })
      return new MockPages(sorted)
    }

    map<T>(selector: (p: MockPage) => T): T[] {
      return this.pages.map(selector)
    }

    get length() {
      return this.pages.length
    }

    [Symbol.iterator]() {
      return this.pages[Symbol.iterator]()
    }
  }

  // Create mock dv object
  const dv = {
    pages: (query?: string) => {
      let files = loadedFiles

      // Handle tag queries like #posts
      if (query && query.startsWith("#")) {
        const tag = query.slice(1).toLowerCase()
        files = files.filter((f) => {
          const tags = f.frontmatter?.tags || []
          const tagArray = Array.isArray(tags) ? tags : [tags]
          return tagArray.some((t: string) => {
            const tagStr = String(t).toLowerCase()
            return tagStr === tag || tagStr.endsWith(`/${tag}`)
          })
        })
      }

      return new MockPages(files)
    },
    paragraph: (html: string) => html,
  }

  return dv
}

/**
 * Executes DataviewJS code and returns the rendered HTML
 */
function executeDataviewJS(code: string, ctx: DataviewContext): string {
  try {
    // Create mock Dataview API
    const dv = createDataviewAPI(ctx)

    // Wrap the code in a function to capture the output
    let output = ""
    const mockDv = {
      ...dv,
      paragraph: (html: string) => {
        output = html
        return html
      },
    }

    // Execute the code with the mock dv object
    // Use Function constructor to create a safe execution context
    const func = new Function("dv", code)
    func(mockDv)

    // If no output was captured, return a debug message
    if (!output) {
      console.warn("DataviewJS executed but no output from dv.paragraph()")
      return `<div class="dataview-warning">DataviewJS executed but no output. Make sure to call dv.paragraph(html) with your HTML.</div>`
    }

    return output
  } catch (error: any) {
    console.error("Error executing DataviewJS:", error)
    return `<div class="dataview-error">Error executing DataviewJS: ${error?.message || error}</div>`
  }
}

export const Dataview: QuartzTransformerPlugin<{}> = () => {
  return {
    name: "Dataview",
    markdownPlugins(ctx: BuildCtx) {
      return [
        () => {
          return (tree: Root, file) => {
            visit(tree, "code", (node: Code, index: number | undefined, parent: any) => {
              if (node.lang === "dataviewjs" || node.lang === "dataview") {
                // Get current file data
                const currentFile = file.data as QuartzPluginData

                // Check if allFiles is available
                if (!ctx.allFiles || ctx.allFiles.length === 0) {
                  console.warn("Dataview: ctx.allFiles is not available yet")
                  const errorNode: Html = {
                    type: "html",
                    value: `<div class="dataview-error">Dataview: Files not loaded yet. This may be a build order issue.</div>`,
                  }
                  if (parent && typeof index === "number") {
                    parent.children[index] = errorNode
                  }
                  return
                }

                // Execute the DataviewJS code
                const html = executeDataviewJS(node.value, {
                  allFiles: ctx.allFiles as FilePath[],
                  currentFile,
                  ctx,
                })

                if (html && parent && typeof index === "number") {
                  // Replace the code node with an HTML node containing the rendered output
                  const htmlNode: Html = {
                    type: "html",
                    value: html,
                  }
                  parent.children[index] = htmlNode
                } else if (parent && typeof index === "number") {
                  // Even if html is empty, replace to avoid showing code block
                  const htmlNode: Html = {
                    type: "html",
                    value: `<div class="dataview-empty">DataviewJS executed but returned no content.</div>`,
                  }
                  parent.children[index] = htmlNode
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
