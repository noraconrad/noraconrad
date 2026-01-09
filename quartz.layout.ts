import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import HomeLink from "./quartz/components/HomeLink"

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
    HomeLink(),
    Component.Explorer({
      folderDefaultState: "collapsed", // Collapsed by default
      folderClickBehavior: "link", // Link to index page when clicked
      useSavedState: false,
      mapFn: (node) => {
        // Use title from folder index file if available
        if (node.isFolder) {
          // For folders, node.data contains the index file's ContentDetails
          // Check if we have title data from the index file
          const folderTitle = node.data?.title
          if (folderTitle && folderTitle !== "index" && folderTitle !== node.slugSegment) {
            node.displayName = folderTitle
          }
        }
        return node
      },
      filterFn: (node) => {
        // Only show specific top-level folders
        if (node.isFolder) {
          // Allowed folder slugs (as they appear in URLs after slugification)
          const allowedFolderSlugs = [
            "01.-posts",
            "02.-curriculums", 
            "03.-templates",
            "04.-rambles",
            "05.-projects",
            "pages" // for about page
          ]
          
          // Check if this is a top-level folder
          // Top-level folders have slugs like "01.-posts/index" (one segment before /index)
          const slugParts = node.slug?.split("/").filter(p => p && p !== "index") || []
          const isTopLevel = slugParts.length === 1
          
          if (isTopLevel) {
            // Match by slug segment
            const slugSegment = node.slugSegment?.toLowerCase() || ""
            return allowedFolderSlugs.some(folderSlug => 
              folderSlug.toLowerCase() === slugSegment
            )
          }
          // Hide nested folders
          return false
        }
        // Hide all files (we only want folders)
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
    HomeLink(),
    Component.Explorer({
      folderDefaultState: "collapsed", // Collapsed by default
      folderClickBehavior: "link", // Link to index page when clicked
      useSavedState: false,
      mapFn: (node) => {
        // Use title from folder index file if available
        if (node.isFolder) {
          // For folders, node.data contains the index file's ContentDetails
          // Check if we have title data from the index file
          const folderTitle = node.data?.title
          if (folderTitle && folderTitle !== "index" && folderTitle !== node.slugSegment) {
            node.displayName = folderTitle
          }
        }
        return node
      },
      filterFn: (node) => {
        // Only show specific top-level folders
        if (node.isFolder) {
          // Allowed folder slugs (as they appear in URLs after slugification)
          const allowedFolderSlugs = [
            "01.-posts",
            "02.-curriculums", 
            "03.-templates",
            "04.-rambles",
            "05.-projects",
            "pages" // for about page
          ]
          
          // Check if this is a top-level folder
          // Top-level folders have slugs like "01.-posts/index" (one segment before /index)
          const slugParts = node.slug?.split("/").filter(p => p && p !== "index") || []
          const isTopLevel = slugParts.length === 1
          
          if (isTopLevel) {
            // Match by slug segment
            const slugSegment = node.slugSegment?.toLowerCase() || ""
            return allowedFolderSlugs.some(folderSlug => 
              folderSlug.toLowerCase() === slugSegment
            )
          }
          // Hide nested folders
          return false
        }
        // Hide all files (we only want folders)
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
