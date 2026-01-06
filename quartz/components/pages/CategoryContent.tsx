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

interface CategoryContentOptions {
  sort?: SortFn
  numPages: number
}

const defaultOptions: CategoryContentOptions = {
  numPages: 10,
}

export default ((opts?: Partial<CategoryContentOptions>) => {
  const options: CategoryContentOptions = { ...defaultOptions, ...opts }

  const CategoryContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props
    const slug = fileData.slug

    if (!(slug?.startsWith("category/") || slug === "category")) {
      throw new Error(`Component "CategoryContent" tried to render a non-category page: ${slug}`)
    }

    const category = simplifySlug(slug.slice("category/".length) as FullSlug)
    const allPagesWithCategory = (category: string) =>
      allFiles.filter((file) =>
        (file.frontmatter?.categories ?? []).flatMap(getAllSegmentPrefixes).includes(category),
      )

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")
    if (category === "/") {
      const categories = [
        ...new Set(
          allFiles.flatMap((data) => data.frontmatter?.categories ?? []).flatMap(getAllSegmentPrefixes),
        ),
      ].sort((a, b) => a.localeCompare(b))
      const categoryItemMap: Map<string, QuartzPluginData[]> = new Map()
      for (const category of categories) {
        categoryItemMap.set(category, allPagesWithCategory(category))
      }
      return (
        <div class="popover-hint">
          <article class={classes}>
            <p>{content}</p>
          </article>
          <p>{categories.length} {categories.length === 1 ? 'category' : 'categories'} total.</p>
          <div>
            {categories.map((category) => {
              const pages = categoryItemMap.get(category)!
              const listProps = {
                ...props,
                allFiles: pages,
              }

              const contentPage = allFiles.filter((file) => file.slug === `category/${category}`).at(0)

              const root = contentPage?.htmlAst
              const content =
                !root || root?.children.length === 0
                  ? contentPage?.description
                  : htmlToJsx(contentPage.filePath!, root)

              const categoryListingPage = `/category/${category}` as FullSlug
              const href = resolveRelative(fileData.slug!, categoryListingPage)

              return (
                <div>
                  <h2>
                    <a class="internal tag-link" href={href}>
                      {category}
                    </a>
                  </h2>
                  {content && <p>{content}</p>}
                  <div class="page-listing">
                    <p>
                      {pages.length} {pages.length === 1 ? 'item' : 'items'} with this category.
                      {pages.length > options.numPages && (
                        <>
                          {" "}
                          <span>
                            Showing first {options.numPages}.
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
      const pages = allPagesWithCategory(category)
      const listProps = {
        ...props,
        allFiles: pages,
      }

      return (
        <div class="popover-hint">
          <article class={classes}>{content}</article>
          <div class="page-listing">
            <p>{pages.length} {pages.length === 1 ? 'item' : 'items'} with this category.</p>
            <div>
              <PageList {...listProps} sort={options?.sort} />
            </div>
          </div>
        </div>
      )
    }
  }

  CategoryContent.css = concatenateResources(style, PageList.css)
  return CategoryContent
}) satisfies QuartzComponentConstructor
