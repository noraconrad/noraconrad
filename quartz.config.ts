import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Nora Conrad",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null, // Using Datafast instead (added in Head component)
    locale: "en-US",
    baseUrl: "stephconrad.com",
    ignorePatterns: ["private", "templates", ".obsidian", "quartz", "node_modules", "public", "docs"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Playfair Display",
        body: "Helvetica Neue",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#6b5444",
          dark: "#523e29",
          secondary: "#d793a5",
          tertiary: "#84a59d",
          highlight: "rgba(215, 147, 165, 0.15)",
          textHighlight: "#d793a588",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#d793a5",
          tertiary: "#84a59d",
          highlight: "rgba(215, 147, 165, 0.15)",
          textHighlight: "#d793a588",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ 
        enableInHtmlEmbed: true,
        enableYouTubeEmbed: true,
      }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.BaseFilesComponent(), // Simple transformer to convert transclude to component div
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.ExplicitPublish()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),  // Re-enabled to process folder index.md files
      Plugin.TagPage(),
      Plugin.CategoryPage(),  // Category pages for posts
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time and avoid emoji errors
      // Plugin.CustomOgImages(),
    ],
  },
}

export default config
