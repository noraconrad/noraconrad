import { Components, Jsx, toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Node, Root } from "hast"
import { Fragment, jsx, jsxs } from "preact/jsx-runtime"
import { trace } from "./trace"
import { type FilePath } from "./path"

// Import BaseFileContent - we'll pass it via context
let BaseFileContentComponent: any = null

export function setBaseFileContentComponent(component: any) {
  BaseFileContentComponent = component
}

const customComponents: Components = {
  table: (props) => (
    <div class="table-container">
      <table {...props} />
    </div>
  ),
  div: (props: any) => {
    // Handle base-file-component divs
    const className = (props.className || props.class) as string
    if (className && className.includes("base-file-component")) {
      const baseFileName = props["data-base-file"] as string
      if (baseFileName && BaseFileContentComponent) {
        return <BaseFileContentComponent baseFileName={baseFileName} />
      }
    }
    return <div {...props} />
  },
}

export function htmlToJsx(fp: FilePath, tree: Node, baseFileContent?: any) {
  if (baseFileContent) {
    setBaseFileContentComponent(baseFileContent)
  }
  try {
    return toJsxRuntime(tree as Root, {
      Fragment,
      jsx: jsx as Jsx,
      jsxs: jsxs as Jsx,
      elementAttributeNameCase: "html",
      components: customComponents,
    })
  } catch (e) {
    trace(`Failed to parse Markdown in \`${fp}\` into JSX`, e as Error)
  }
}
