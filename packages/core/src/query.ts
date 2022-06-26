export type QueryItem = { $eq?: string } & { $neq?: string } & { $gt?: number };

export type Query = { [k: string]: QueryItem | Query[] };

export function evaluate(item: QueryItem, value: any) {
  for (const key in item) {
    switch (key) {
      case "$eq":
        return value === item.$eq;
      case "$neq":
        return value !== item.$neq;
      case "$gt":
        return value > (item.$gt || 0);
    }
  }

  return false;
}

export function match(query: Query, document: any): boolean {
  for (const key in query) {
    const value = query[key];
    switch (key) {
      case "$or":
        if (!Array.isArray(value)) {
          throw Error("Invalid query type for or. This must be an array");
        }

        return value.some((q: Query) => match(q, document));
      default:
        if (Array.isArray(value)) {
          throw Error(`Invalid query type of ${key}. Must be an object`);
        }

        if (key in document) {
          if (!evaluate(value, document[key])) {
            return false;
          }
        }
    }
  }

  return true;
}
