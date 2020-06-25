// Modified from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
const TypedArray = Object.getPrototypeOf(Uint8Array)

export function deepSeal<T>(object: T): T {
  const propNames = Object.getOwnPropertyNames(object);
  
  for (let name of propNames) {
    let value = object[name];

    if(value && typeof value === "object" && !(value instanceof TypedArray)) { 
      deepSeal(value);
    }
  }

  return Object.seal(object);
}

export function wraparoundIndex(num: number, min: number, max: number) {
  return num < min ? max : (num > max ? min : num);
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatName(name: string, hiddenModuleNames = ['default']) {
  const [module, objectName] = name.split('::')
  return hiddenModuleNames.includes(module)  ? objectName : name
}
