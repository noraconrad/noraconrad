import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer({
      title: "Map",
      folderDefaultState: "open",
      folderClickBehavior: "link",
      useSavedState: false,
      filterFn: (node) => {
        // Show all folders
        if (node.isFolder) {
          // Hide the "tags" folder
          if (node.slugSegment === "tags") {
            return false
          }
          return true
        }
        // For files, only show index.md files
        if (node.slugSegment === "index") {
          return true
        }
        // Hide all other individual files
        return false
      },
    }),
    // Component.Graph(), // Hidden for now
    Component.SocialLinks({
      links: {
        YouTube: "https://youtube.com/@NoraConrad",
        LinkedIn: "https://www.linkedin.com/in/stephanienoraconrad/",
        Pinterest: "https://www.pinterest.com/NoraConradCom/",
        "Newsletter": "https://rooted.noraconrad.com",
      },
    }),
  ],
  right: [],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      title: "Map",
      folderDefaultState: "open",
      folderClickBehavior: "link",
      useSavedState: false,
      filterFn: (node) => {
        // Show all folders
        if (node.isFolder) {
          // Hide the "tags" folder
          if (node.slugSegment === "tags") {
            return false
          }
          return true
        }
        // For files, only show index.md files
        if (node.slugSegment === "index") {
          return true
        }
        // Hide all other individual files
        return false
      },
    }),
    // Component.Graph(), // Hidden for now
    Component.SocialLinks({
      links: {
        YouTube: "https://youtube.com/@NoraConrad",
        LinkedIn: "https://www.linkedin.com/in/stephanienoraconrad/",
        Pinterest: "https://www.pinterest.com/NoraConradCom/",
        "Newsletter": "https://rooted.noraconrad.com",
      },
    }),
  ],
  right: [],
}
