import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import yaml from "js-yaml"
import { FilePath, slugifyFilePath, simplifySlug } from "../util/path"
import { BuildCtx } from "../util/ctx"
import { QuartzPluginData } from "../plugins/vfile"
import style from "./styles/listPage.scss"
import { concatenateResources } from "../util/resources"

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
      "file.inFolder"?: string
      "file.tags.contains"?: string
      "file.path.contains"?: string
      [key: string]: any
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
  imageAspectRatio?: number
  columnSize?: Record<string, number>
  layout?: string
}

interface BaseFile {
  views?: BaseFileView[]
}

interface Options {
  baseFileName?: string
}

type MarkdownFile = {
  path: string
  slug: string
  frontmatter: any
  title: string
  dates: {
    created?: Date
    modified?: Date
    published?: Date
  }
}

function loadBaseFile(ctx: BuildCtx, baseFileName: string): BaseFile | null {
  // Try to find the .base file
  const possiblePaths = [
    baseFileName,
    baseFileName + ".base",
    join(ctx.argv.directory, baseFileName),
    join(ctx.argv.directory, baseFileName + ".base"),
  ]

  for (const possiblePath of possiblePaths) {
    if (existsSync(possiblePath)) {
      try {
        const content = readFileSync(possiblePath, "utf-8")
        return yaml.load(content) as BaseFile
      } catch (err) {
        console.warn(`Failed to load .base file ${possiblePath}:`, err)
      }
    }
  }

  // Also try to find in ctx.allFiles
  const baseFilePaths = ctx.allFiles.filter((fp) => 
    fp.endsWith(".base") && (
      fp.includes(baseFileName) || 
      fp.endsWith(baseFileName + ".base") ||
      fp.split("/").pop() === baseFileName ||
      fp.split("/").pop() === baseFileName + ".base"
    )
  )

  for (const baseFilePath of baseFilePaths) {
    try {
      const fullPath = join(ctx.argv.directory, baseFilePath)
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf-8")
        return yaml.load(content) as BaseFile
      }
    } catch (err) {
      console.warn(`Failed to load .base file ${baseFilePath}:`, err)
    }
  }

  return null
}

function processBaseFile(
  baseFile: BaseFile,
  allFiles: QuartzPluginData[],
  ctx: BuildCtx,
): string {
  if (!baseFile.views || baseFile.views.length === 0) {
    return "<p>No views defined in .base file</p>"
  }

  const view = baseFile.views[0]
  if (view.type !== "cards" && view.type !== "table") {
    return `<p>Unsupported view type: ${view.type}</p>`
  }

  // Convert allFiles to MarkdownFile format
  const allMarkdownFiles: MarkdownFile[] = allFiles
    .filter((file) => file.slug && file.frontmatter?.publish === true)
    .map((file) => ({
      path: file.filePath || "",
      slug: file.slug!,
      frontmatter: file.frontmatter || {},
      title: file.frontmatter?.title || file.slug.split("/").pop() || "",
      dates: {
        created: file.dates?.created,
        modified: file.dates?.modified,
        published: file.dates?.published,
      },
    }))

  // Filter files
  let filteredFiles = allMarkdownFiles
  if (view.filters?.and) {
    filteredFiles = allMarkdownFiles.filter((f) => {
      return view.filters!.and!.every((filter) => {
        // Handle file.inFolder
        if (filter["file.inFolder"]) {
          const folder = filter["file.inFolder"].replace(/^["']|["']$/g, "").trim()
          const folderSlug = folder.replace(/\./g, "-").replace(/\s+/g, "-").toLowerCase()
          if (!f.slug.startsWith(folderSlug + "/") && !f.slug.startsWith(folderSlug + "-")) {
            return false
          }
        }
        // Handle file.tags.contains
        if (filter["file.tags.contains"]) {
          const tag = filter["file.tags.contains"].replace(/^["']|["']$/g, "").trim()
          const tags = f.frontmatter?.tags ?? []
          if (!tags.includes(tag)) {
            return false
          }
        }
        // Handle file.path.contains
        if (filter["file.path.contains"]) {
          const pathContains = filter["file.path.contains"].replace(/^["']|["']$/g, "").trim()
          if (!f.path.includes(pathContains) && !f.slug.includes(pathContains.replace(/\s+/g, "-").toLowerCase())) {
            return false
          }
        }
        // Handle !categories.isEmpty()
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
  }

  // Sort files
  if (view.sort) {
    filteredFiles = filteredFiles.sort((a, b) => {
      for (const sortRule of view.sort!) {
        const prop = sortRule.property
        const direction = sortRule.direction === "DESC" ? -1 : 1
        const propName = prop.startsWith("note.") ? prop.slice(5) : prop

        let aVal: any
        let bVal: any

        if (prop === "date" || propName === "date") {
          aVal = a.dates?.published?.getTime() ?? a.dates?.modified?.getTime() ?? a.dates?.created?.getTime() ?? 0
          bVal = b.dates?.published?.getTime() ?? b.dates?.modified?.getTime() ?? b.dates?.created?.getTime() ?? 0
        } else if (prop === "title" || propName === "title" || prop === "file.name") {
          aVal = a.title ?? ""
          bVal = b.title ?? ""
        } else {
          aVal = a.frontmatter?.[propName] ?? ""
          bVal = b.frontmatter?.[propName] ?? ""
        }

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

  // Group files
  let groupedFiles: Map<string, MarkdownFile[]> | null = null
  if (view.groupBy) {
    groupedFiles = new Map()
    const groupProp = view.groupBy.property.startsWith("note.") 
      ? view.groupBy.property.slice(5)
      : view.groupBy.property

    for (const f of filteredFiles) {
      let groupKey: string = "Other"
      if (Array.isArray(f.frontmatter?.[groupProp])) {
        const firstValue = f.frontmatter[groupProp][0]
        groupKey = firstValue != null ? String(firstValue) : "Other"
      } else if (f.frontmatter?.[groupProp] != null) {
        groupKey = String(f.frontmatter[groupProp])
      }
      
      if (!groupedFiles.has(groupKey)) {
        groupedFiles.set(groupKey, [])
      }
      groupedFiles.get(groupKey)!.push(f)
    }

    // Sort within groups
    if (view.sort) {
      for (const [_, groupFiles] of groupedFiles.entries()) {
        groupFiles.sort((a, b) => {
          for (const sortRule of view.sort!) {
            const prop = sortRule.property
            const direction = sortRule.direction === "DESC" ? -1 : 1
            const propName = prop.startsWith("note.") ? prop.slice(5) : prop

            let aVal: any
            let bVal: any

            if (prop === "date" || propName === "date") {
              aVal = a.dates?.published?.getTime() ?? a.dates?.modified?.getTime() ?? a.dates?.created?.getTime() ?? 0
              bVal = b.dates?.published?.getTime() ?? b.dates?.modified?.getTime() ?? b.dates?.created?.getTime() ?? 0
            } else if (prop === "title" || propName === "title" || prop === "file.name") {
              aVal = a.title ?? ""
              bVal = b.title ?? ""
            } else {
              aVal = a.frontmatter?.[propName] ?? ""
              bVal = b.frontmatter?.[propName] ?? ""
            }

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
    }
  }

  // Generate HTML
  const columns = view.order || ["file.name", "stage", "lesson"]
  const isCardView = view.type === "cards" || view.layout === "cards"

  const getPropertyValue = (f: MarkdownFile, prop: string): string => {
    if (prop === "file.name" || prop === "title") {
      return f.title
    }
    const propName = prop.startsWith("note.") ? prop.slice(5) : prop
    const value = f.frontmatter?.[propName]
    if (value === undefined || value === null) return ""
    return Array.isArray(value) ? value.join(", ") : (value?.toString() ?? "")
  }

  const getHeaderName = (prop: string): string => {
    if (prop === "file.name") return "File Name"
    if (prop === "title") return "Title"
    if (prop === "note.stage" || prop === "stage") return "Stage"
    if (prop === "note.lesson" || prop === "lesson") return "Lesson"
    if (prop.startsWith("note.")) {
      const name = prop.slice(5)
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return prop.charAt(0).toUpperCase() + prop.slice(1)
  }

  if (isCardView) {
    const renderCard = (f: MarkdownFile) => {
      const simpleSlug = simplifySlug(f.slug)
      const href = `/${simpleSlug}`
      const title = f.title
      const categories = Array.isArray(f.frontmatter?.categories) 
        ? f.frontmatter.categories.join(", ")
        : f.frontmatter?.categories || ""

      let imageHtml = ""
      if (view.image) {
        const imageProp = view.image.startsWith("note.") ? view.image.slice(5) : view.image
        const imageName = f.frontmatter?.[imageProp]
        if (imageName) {
          // imageName might be just a filename or include a relative path (e.g., "images/photo.jpg")
          const fileDir = f.path.substring(0, f.path.lastIndexOf("/"))
          let imagePath: string
          if (fileDir) {
            const dirSlug = simplifySlug(slugifyFilePath(fileDir as FilePath))
            // If imageName already includes a path (like "images/photo.jpg"), use it as-is
            // Otherwise, just append the filename
            if (imageName.includes("/")) {
              // Image path is relative to the file directory
              const imagePathParts = imageName.split("/")
              const imagePathSlug = imagePathParts.map(part => 
                simplifySlug(slugifyFilePath(part as FilePath))
              ).join("/")
              imagePath = `/${dirSlug}/${imagePathSlug}`
            } else {
              // Just a filename, append directly
              imagePath = `/${dirSlug}/${imageName}`
            }
          } else {
            // File is in root, image is relative to root
            if (imageName.includes("/")) {
              const imagePathParts = imageName.split("/")
              const imagePathSlug = imagePathParts.map(part => 
                simplifySlug(slugifyFilePath(part as FilePath))
              ).join("/")
              imagePath = `/${imagePathSlug}`
            } else {
              imagePath = `/${imageName}`
            }
          }
          const aspectRatio = view.imageAspectRatio || 0.8
          imageHtml = `<div class="base-card-image" style="aspect-ratio: ${aspectRatio};">
            <img src="${imagePath}" alt="${title}" />
          </div>`
        }
      }

      return `
        <div class="base-card">
          <a href="${href}" class="base-card-link">
            ${imageHtml}
            <div class="base-card-content">
              <h3 class="base-card-title">${title}</h3>
              ${categories ? `<div class="base-card-categories">${categories}</div>` : ""}
            </div>
          </a>
        </div>
      `
    }

    if (groupedFiles) {
      const sortedGroups = Array.from(groupedFiles.entries()).sort((a, b) => {
        const aKey = a[0] || ""
        const bKey = b[0] || ""
        if (view.groupBy!.direction === "DESC") {
          return bKey.localeCompare(aKey)
        }
        return aKey.localeCompare(bKey)
      })

      return sortedGroups.map(([groupName, groupFiles]) => {
        return `
          <div class="base-card-group">
            <h3 class="base-card-group-title">${groupName}</h3>
            <div class="base-cards-container">
              ${groupFiles.map(renderCard).join("")}
            </div>
          </div>
        `
      }).join("")
    } else {
      return `
        <div class="base-cards-container">
          ${filteredFiles.map(renderCard).join("")}
        </div>
      `
    }
  } else {
    // Table view
    const tableHeaders = columns.map((col) => `<th>${getHeaderName(col)}</th>`).join("")

    const renderTableRows = (files: MarkdownFile[]) => {
      return files.map((f) => {
        const simpleSlug = simplifySlug(f.slug)
        const href = `/${simpleSlug}`
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

    if (groupedFiles) {
      const sortedGroups = Array.from(groupedFiles.entries()).sort((a, b) => {
        const aKey = a[0] || ""
        const bKey = b[0] || ""
        if (view.groupBy!.direction === "DESC") {
          return bKey.localeCompare(aKey)
        }
        return aKey.localeCompare(bKey)
      })

      return sortedGroups.map(([groupName, groupFiles]) => {
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
      return `
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
  }
}

export default ((opts?: Options) => {
  const BaseFileContent: QuartzComponent = (props: QuartzComponentProps & { baseFileName?: string }) => {
    const { allFiles, ctx } = props
    // Get baseFileName from props (passed from jsx.tsx) or from opts
    const baseFileName = props.baseFileName || opts?.baseFileName

    if (!baseFileName) {
      return <p>No base file specified</p>
    }

    const baseFile = loadBaseFile(ctx, baseFileName)
    if (!baseFile) {
      return <p>Base file not found: {baseFileName}</p>
    }

    const html = processBaseFile(baseFile, allFiles, ctx)
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  BaseFileContent.css = concatenateResources(style)
  return BaseFileContent
}) satisfies QuartzComponentConstructor
