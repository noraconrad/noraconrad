---
title: notes
publish: true
---

```dataviewjs

const posts = dv.pages('#posts')
  .filter(p => p.publish === true)
  .sort(p => p.date, 'desc');

const html = `
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
  ${posts.map(p => `
    <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <img src="${p.coverImage}" alt="${p.title}" style="width: 100%; height: 200px; object-fit: cover;">
      <h4 style="padding: 12px; margin: 0; font-size: 14px; line-height: 1.3;">${p.title}</h4>
    </div>
  `).join('')}
</div>
`;

dv.paragraph(html);
```
![[notes.base]]
