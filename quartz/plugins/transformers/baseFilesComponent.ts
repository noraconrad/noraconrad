import { QuartzTransformerPlugin } from "../types"
import { Root, Html } from "mdast"
import { visit } from "unist-util-visit"

/**
 * Simple transformer that converts ![[notes.base]] syntax to a component call
 * This works by replacing the transclude block with a custom HTML element
 * that the BaseFileContent component can process
 */
export const BaseFilesComponent: QuartzTransformerPlugin = () => {
  return {
    name: "BaseFilesComponent",
    markdownPlugins() {
      return [
        () => {
          return (tree: Root, file) => {
            visit(tree, "html", (node: Html) => {
              // Look for transclude blocks that reference .base files
              const transcludeMatch = node.value.match(
                /<blockquote[^>]*class="transclude"[^>]*data-url="([^"]+\.base)"[^>]*>/i,
              )
              
              if (transcludeMatch) {
                const baseFilePath = transcludeMatch[1]
                // Extract just the filename (without path and extension)
                const baseFileName = baseFilePath
                  .replace(/^.*\//, "") // Remove path
                  .replace(/\.base$/, "") // Remove extension
                
                // Replace with a custom element that the component can find
                node.value = node.value.replace(
                  /<blockquote[^>]*class="transclude"[^>]*data-url="[^"]+\.base"[^>]*>.*?<\/blockquote>/is,
                  `<div class="base-file-component" data-base-file="${baseFileName}"></div>`,
                )
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
