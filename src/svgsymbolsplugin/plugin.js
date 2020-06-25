"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SVGSymbolsPlugin {
  constructor() {
    this.test = /\.svg$/;
  }
  init(context) {
    context.allowExtension(".svg");
  }
  transform(file) {
    file.loadContents();
    let content = file.contents,
        filename = file.relativePath.split(/\/|\\/).pop().split('.')[0],
        viewbox = (content.match(/viewBox="(.+?)"/)||[])[1],
        symbolContent = ((content.match(/<svg[\s\S]*?>([\s\S]*)<\/svg>/)||[])[1] || '').trim()
    
    file.contents = `window.SVGSymbolsInsert(${JSON.stringify(filename)}, ${JSON.stringify(viewbox)}, ${JSON.stringify(symbolContent)});
module.exports = '#${filename}'`
  }
}
// exports.SVGSymbolsPlugin = SVGSymbolsPlugin;
exports.SVGSymbolsPlugin = () => {
  return new SVGSymbolsPlugin();
};
