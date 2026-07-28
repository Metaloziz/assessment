/** Convert Notion enhanced markdown snippets to GitHub-flavored markdown. */
export function notionContentToMd(raw) {
  let text = raw
  const contentMatch = text.match(/<content>\n?([\s\S]*?)\n?<\/content>/)
  if (contentMatch) text = contentMatch[1]

  text = text
    .replace(/\\~/g, '~')
    .replace(/\\\\\(\\\\log_2 N\\\\\)/g, 'log₂(N)')
    .replace(/```plain text/g, '```text')
    .replace(/<https?:\/\/([^>]+)>/g, 'https://$1')
    .replace(/\t/g, '')
    .replace(/Ответ для собеседовании/g, 'Ответ для собеседования')

  text = text.replace(/<table header-row="true">([\s\S]*?)<\/table>/g, (_, inner) => {
    const rows = [...inner.matchAll(/<tr>\s*([\s\S]*?)\s*<\/tr>/g)].map((m) =>
      [...m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) =>
        c[1].replace(/\n/g, ' ').replace(/\|/g, '\\|').trim(),
      ),
    )
    if (!rows.length) return ''
    const header = rows[0]
    const sep = header.map(() => '---')
    const body = rows.slice(1)
    return [
      `| ${header.join(' | ')} |`,
      `| ${sep.join(' | ')} |`,
      ...body.map((r) => `| ${r.join(' | ')} |`),
    ].join('\n')
  })

  text = text.replace(/\n{3,}/g, '\n\n').trim()
  if (!text.endsWith('\n')) text += '\n'
  return text
}
