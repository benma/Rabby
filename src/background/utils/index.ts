import * as ethUtil from 'ethereumjs-util';
export { default as createPersistStore } from './persisitStore';

// {a:{b: string}} => {1: 'a.b'}
// later same [source] value will override [result] key generated before
const retrieveValuePath = (obj) => {
  const arr = [...Object.entries(obj)];
  const result = {};
  const parentKey: string[] = [];
  let lastParent;

  while (arr.length) {
    const curNode = arr.shift();
    const [key, value] = curNode!;
    if (lastParent && lastParent[key] !== value) {
      parentKey.pop();
    }

    if (typeof value === 'object') {
      arr.unshift(...Object.entries(value!));
      parentKey.push(key);
      lastParent = value;
    } else if (typeof value === 'string') {
      result[value] = `${[...parentKey, key].join('.')}`;
    }
  }

  return result;
};

export const underline2Camelcase = (str: string) => {
  return str.replace(/_(.)/g, (m, p1) => p1.toUpperCase());
};

export { retrieveValuePath };
export { default as PromiseFlow } from './promiseFlow';

export function normalizeAddress(input: number | string): string {
  if (!input) {
    return '';
  }

  if (typeof input === 'number') {
    const buffer = ethUtil.toBuffer(input);
    input = ethUtil.bufferToHex(buffer);
  }

  if (typeof input !== 'string') {
    let msg = 'eth-sig-util.normalize() requires hex string or integer input.';
    msg += ` received ${typeof input}: ${input}`;
    throw new Error(msg);
  }

  return ethUtil.addHexPrefix(input);
}

export function serializeFnArgs(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      const originMethod = target[prop];

      if (
        typeof originMethod === 'function' &&
        // [symbol] and [_...] function are taken as private method, just return origin method
        typeof prop === 'string' &&
        !prop.startsWith('_')
      ) {
        return (...args) => {
          let data;
          try {
            data = JSON.parse(JSON.stringify(args));
          } catch (err) {
            console.log('[rabby] serilize function arguments failed', err);
          }

          // eslint-disable-next-line prefer-spread
          return originMethod.apply(target, data);
        };
      }
      return originMethod;
    },
  });
}
