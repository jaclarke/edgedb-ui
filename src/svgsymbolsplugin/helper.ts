let svgSymbolsRoot: SVGElement

export function SVGSymbolsInsert(name: string, viewbox: string, content: string) {
  if (!svgSymbolsRoot) {
    svgSymbolsRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgSymbolsRoot.style.display = 'none'

    document.body.prepend(svgSymbolsRoot)
  }
  if (document.getElementById(name)) return;

  let symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol')
  symbol.id = name
  symbol.setAttribute('viewBox', viewbox)
  symbol.innerHTML = content

  svgSymbolsRoot.append(symbol)
}
