export function splitQuery(query: string): string[] {
  const queries: string[] = []

  let bracketCount = 0,
      startIndex = 0

  for (let i = 0, len = query.length; i < len; i++) {
    switch (query[i]) {
      case '#':
        const lineEnd = query.indexOf('\n', i)
        i = lineEnd === -1 ? len : lineEnd
        break;
      case '\'':
      case '"':
        const quote = query[i]
        while (true) {
          const quoteEnd = query.indexOf(quote, i+1)
          i = quoteEnd === -1 ? len : quoteEnd
          if (quoteEnd === -1 || quoteEnd[i-1] !== '\\') break;
        }
        break;
      case '$':
        const marker = query.slice(i, query.indexOf('$', i+1)+1)
        const stringEnd = query.indexOf(marker, i+1)
        i = stringEnd === -1 ? len : stringEnd+marker.length
        break;
      case '{':
        bracketCount += 1
        break;
      case '}':
        bracketCount -= 1
        break;
      case ';':
        if (bracketCount === 0) {
          queries.push(query.slice(startIndex, i+1))
          startIndex = i+1
        }
        break;
    }
  }

  const finalQuery = query.slice(startIndex)

  if (finalQuery.trim()) {
    queries.push(finalQuery)
  }

  return queries
}
