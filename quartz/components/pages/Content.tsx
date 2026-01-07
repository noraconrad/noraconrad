import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import BaseFileContent from "../BaseFileContent"

const Content: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData, tree, allFiles, ctx } = props
  // Pass the component and all props to htmlToJsx so BaseFileContent can access them
  const content = htmlToJsx(fileData.filePath!, tree, {
    BaseFileContent,
    ...props,
  }) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return <article class={classString}>{content}</article>
}

export default (() => Content) satisfies QuartzComponentConstructor
