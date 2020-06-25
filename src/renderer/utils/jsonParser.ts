// Modified from https://github.com/douglascrockford/JSON-js/blob/107fc93c94aa3a9c7b48548631593ecf3aac60d2/json_parse.js
/*
    json_parse.js
    2016-05-02

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    This file creates a json_parse function.

        json_parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = json_parse(text, function (key, value) {
                var a;
                if (typeof value === "string") {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

export class JSONNumber {
  constructor(public val: string) {
    if (!isFinite(Number(val))) {
      error("Bad number")
    }
  }
}

const escapee = {
  "\"": "\"",
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t"
}

let at: number
let ch: string
let text: string

function error(m: string) {
  throw new SyntaxError(`${m} at position ${at}`)
}

function next(c?: string) {
  // If a c parameter is provided, verify that it matches the current character.
  if (c && c !== ch) {
    error("Expected '" + c + "' instead of '" + ch + "'");
  }

  // Get the next character. When there are no more characters,
  // return the empty string.
  return ch = text.charAt(at++)
}

function number() {
  // Parse a number value.
  let string = ""

  if (ch === "-") {
    string = "-"
    next("-")
  }
  while (ch >= "0" && ch <= "9") {
    string += ch
    next()
  }
  if (ch === ".") {
    string += "."
    while (next() && ch >= "0" && ch <= "9") {
      string += ch
    }
  }
  if (ch === "e" || ch === "E") {
    string += ch
    next()
    // @ts-ignore
    if (ch === "-" || ch === "+") {
      string += ch
      next()
    }
    while (ch >= "0" && ch <= "9") {
      string += ch
      next()
    }
  }

  return new JSONNumber(string)
}

function string() {
  // Parse a string value.
  let value = ""

  // When parsing for string values, we must look for " and \ characters.
  if (ch === "\"") {
    while (next()) {
      if (ch === "\"") {
        next()
        return value
      }
      if (ch === "\\") {
        next()
        if (ch === "u") {
          let uffff = 0
          for (let i = 0; i < 4; i += 1) {
            const hex = parseInt(next(), 16)
            if (!isFinite(hex)) {
              break
            }
            uffff = uffff * 16 + hex
          }
          value += String.fromCharCode(uffff)
        } else if (escapee[ch] !== undefined) {
          value += escapee[ch]
        } else {
          break
        }
      } else {
        value += ch
      }
    }
  }
  error("Bad string")
}

function white() {
  // Skip whitespace.
  while (ch && ch <= " ") {
    next()
  }
}

function word() {
  // true, false, or null.
  switch (ch) {
    case "t":
      next("t")
      next("r")
      next("u")
      next("e")
      return true
    case "f":
      next("f")
      next("a")
      next("l")
      next("s")
      next("e")
      return false
    case "n":
      next("n")
      next("u")
      next("l")
      next("l")
      return null
  }
  error("Unexpected '" + ch + "'")
}

function array() {
  // Parse an array value.
  const arr = []

  if (ch === "[") {
    next("[")
    white()
    // @ts-ignore
    if (ch === "]") {
      next("]")
      return arr // empty array
    }
    while (ch) {
      arr.push(value())
      white()
      // @ts-ignore
      if (ch === "]") {
        next("]")
        return arr
      }
      next(",")
      white()
    }
  }
  error("Bad array")
}

function object() {
  // Parse an object value.
  // var key;
  const obj = {}

  if (ch === "{") {
    next("{")
    white()
    // @ts-ignore
    if (ch === "}") {
      next("}")
      return obj // empty object
    }
    while (ch) {
      const key = string()
      white()
      next(":")
      if (obj.hasOwnProperty(key)) {
        error("Duplicate key '" + key + "'")
      }
      obj[key] = value()
      white()
      // @ts-ignore
      if (ch === "}") {
        next("}")
        return obj
      }
      next(",")
      white()
    }
  }
  error("Bad object")
}

function value(): any {
  // Parse a JSON value. It could be an object, an array, a string, a number,
  // or a word.

  white()
  switch (ch) {
    case "{":
      return object()
    case "[":
      return array()
    case "\"":
      return string()
    case "-":
      return number()
    default:
      return (ch >= "0" && ch <= "9")
        ? number()
        : word()
  }
}

export function JSONParse(source: string, reviver?: (this: any, key: string, value: any) => any) {
  text = source
  at = 0
  ch = " "

  const result = value()
  
  white()
  if (ch) {
    error("Syntax error")
  }

  // If there is a reviver function, we recursively walk the new structure,
  // passing each name/value pair to the reviver function for possible
  // transformation, starting with a temporary root object that holds the result
  // in an empty key. If there is not a reviver function, we simply return the
  // result.

  return (typeof reviver === "function")
    ? (function walk(holder, key) {
      const val = holder[key]
      if (val && typeof val === "object" && !(val instanceof JSONNumber)) {
        for (let k in val) {
          if (val.hasOwnProperty(k)) {
            const v = walk(val, k)
            if (v !== undefined) {
              val[k] = v
            } else {
              delete val[k]
            }
          }
        }
      }
      return reviver.call(holder, key, val)
    }({"": result}, ""))
    : result
}
