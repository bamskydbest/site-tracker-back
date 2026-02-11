declare module 'json2csv' {
  interface FieldInfo<T> {
    label: string;
    value: string | ((row: T) => string);
  }

  interface ParserOptions<T = unknown> {
    fields?: FieldInfo<T>[];
  }

  export class Parser<T = unknown> {
    constructor(opts?: ParserOptions<T>);
    parse(data: T[]): string;
  }
}
