import { Components, Jsx, toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Node, Root } from "hast"
import { Fragment, jsx, jsxs } from "preact/jsx-runtime"
import { trace } from "./trace"
import { type FilePath } from "./path"

// Store component props context
let componentContext: any = null

export function setComponentContext(context: any) {
  componentContext = context
}

const customComponents: Components = {
  table: (props) => (
    <div class="table-container">
      <table {...props} />
    </div>
  ),
  div: (props: any) => {
    // Handle base-file-component divs
    const className = (props.className || props.class) as string | string[]
    const classArray = Array.isArray(className) ? className : (className ? [className] : [])
    if (classArray.includes("base-file-component")) {
      const baseFileName = props["data-base-file"] as string
      if (baseFileName && componentContext) {
        const BaseFileContentConstructor = componentContext.BaseFileContent
        if (BaseFileContentConstructor) {
          // BaseFileContent is a constructor function, so we need to instantiate it first
          // Then pass baseFileName and all context props
          const BaseFileContentComponent = BaseFileContentConstructor()
          return <BaseFileContentComponent baseFileName={baseFileName} {...componentContext} />
        }
      }
    }
    return <div {...props} />
  },
}

export function htmlToJsx(fp: FilePath, tree: Node, context?: any) {
  if (context) {
    setComponentContext(context)
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
