const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const slug = entry.target.id
    const tocEntryElements = document.querySelectorAll(`a[data-for="${slug}"]`)
    const windowHeight = entry.rootBounds?.height
    if (windowHeight && tocEntryElements.length > 0) {
      if (entry.boundingClientRect.y < windowHeight) {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.add("in-view"))
      } else {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.remove("in-view"))
      }
    }
  }
})

function toggleToc(this: HTMLElement) {
  const toc = this.closest(".toc") as HTMLElement
  if (!toc) return
  const isCurrentlyCollapsed = toc.classList.contains("collapsed") || this.classList.contains("collapsed")
  
  // Close all other collapsible sections
  const allCollapsibles = document.querySelectorAll(".explorer, .backlinks, .toc")
  allCollapsibles.forEach((section) => {
    if (section !== toc) {
      section.classList.add("collapsed")
      const sectionToggle = section.querySelector(".explorer-toggle, .social-links-toggle, .graph-toggle, .backlinks-toggle, .toc-header")
      const sectionContent = section.querySelector(".explorer-content, .social-links-content, .graph-content, .backlinks-content, .toc-content")
      if (sectionToggle) {
        sectionToggle.setAttribute("aria-expanded", "false")
        sectionToggle.classList.add("collapsed")
      }
      if (sectionContent) {
        sectionContent.setAttribute("aria-expanded", "false")
        sectionContent.classList.add("collapsed")
      }
    }
  })
  
  // Toggle current section
  if (isCurrentlyCollapsed) {
    this.classList.remove("collapsed")
    this.setAttribute("aria-expanded", "true")
    const content = this.nextElementSibling as HTMLElement | undefined
    if (content) {
      content.classList.remove("collapsed")
      content.setAttribute("aria-expanded", "true")
    }
  } else {
    this.classList.add("collapsed")
    this.setAttribute("aria-expanded", "false")
    const content = this.nextElementSibling as HTMLElement | undefined
    if (content) {
      content.classList.add("collapsed")
      content.setAttribute("aria-expanded", "false")
    }
  }
}

function setupToc() {
  for (const toc of document.getElementsByClassName("toc")) {
    const button = toc.querySelector(".toc-header")
    const content = toc.querySelector(".toc-content")
    if (!button || !content) return
    button.addEventListener("click", toggleToc)
    window.addCleanup(() => button.removeEventListener("click", toggleToc))
  }
}

document.addEventListener("nav", () => {
  setupToc()

  // update toc entry highlighting
  observer.disconnect()
  const headers = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
  headers.forEach((header) => observer.observe(header))
})
