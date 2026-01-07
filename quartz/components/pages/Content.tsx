import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import BaseFileContent from "../BaseFileContent"

const Content: QuartzComponent = ({ fileData, tree, allFiles, ctx }: QuartzComponentProps) => {
  const content = htmlToJsx(fileData.filePath!, tree, BaseFileContent) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return <article class={classString}>{content}</article>
}

export default (() => Content) satisfies QuartzComponentConstructor
