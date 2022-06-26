import fs from "fs";
import { Level } from "level";

import { match, Query } from "./query";

/**
 * Base index options that all indexes will have
 */
export interface BaseIndexOptions {
  name: string;
  field: string;
}

/**
 * Options for a text index
 */
export interface TextInterfaceOptions {
  type: "text";
}

/**
 * Options for a number index
 */
export interface NumberInterfaceOptions {
  type: "number";
}

/**
 * Options that you can use when creating and configuring indexes
 */
export type IndexOptions = BaseIndexOptions &
  (TextInterfaceOptions | NumberInterfaceOptions);

/**
 * Options that can be used when searching
 */
export interface Search {
  /**
   * The index you would like to use when preforming the search
   */
  index: string;
  /**
   * The query that will be used to get the results. NOTE: The field will only
   * be the one the index is on.
   */
  query: {
    /**
     * All documents that have a key matching this term
     */
    $eq?: string;
    /**
     * All documents will be returned that starts with this term
     */
    $startsWith?: string;
  };
  /**
   * TODO(ade): Implement a optional filter that can be used for a more complex
   * search over multiple fields
   */
  // filter?: Query;
}

/**
 * Configuration options for the database
 */
export interface Config {
  /**
   * The file path to the root of the database.
   */
  root: string;
}

/**
 * Internal database metadata
 */
interface Meta {
  /**
   * A list of all the current indexes on the database with there configuration
   */
  indexes: { [key: string]: { field: string; type: "text" | "number" } };
}

/**
 * A document database class
 */
export class Database<TKey = any, TValue = any> {
  /**
   * Internal configuration
   */
  private config: Config;
  /**
   * Internal metadata
   */
  private meta: Meta;
  /**
   * The internal level db storage engin
   */
  private db: Level<TKey, TValue>;
  /**
   * Setup for the document database
   */
  constructor(config: Config) {
    this.config = config;
    this.db = new Level<TKey, TValue>(this.config.root + "/db", {
      valueEncoding: "json",
    });

    if (!fs.existsSync(this.config.root + "/meta.json")) {
      this.meta = { indexes: {} };
    } else {
      this.meta = require(this.config.root + "/meta.json");
    }
  }
  /**
   * Updates the internal metadata saving it do disk
   */
  private updateMeta() {
    fs.writeFileSync(
      this.config.root + "/meta.json",
      JSON.stringify(this.meta)
    );
  }
  /**
   * Ensures the database is open and ready for use
   */
  public async open(): Promise<void> {
    await this.db.open();
    this.updateMeta();
  }
  /**
   * Inserts a document into the database
   */
  public async insert(key: TKey, document: TValue) {
    await this.db.put(key, document);
    // Update all of the indexes when a document has be inserted
    for (const name in this.meta.indexes) {
      await this.createIndex({ name, ...this.meta.indexes[name] });
    }
  }
  /**
   * Returns a generator with all the documents matching a query
   */
  public find(query: Query) {
    return this.filter(({ value }) => match(query, value));
  }
  /**
   * Returns a generator with all of the documents matching a user defined
   * callback. The callback must return or false regarding if the use the
   * document or not
   */
  public async *filter(
    callback: (params: { key: TKey; value: TValue }) => boolean
  ) {
    for await (const [key, value] of this.db.iterator()) {
      if (callback({ key, value })) {
        yield [key, value];
      }
    }
  }
  /**
   * Searches a index on with a query
   */
  public async search(search: Search): Promise<TValue[]> {
    const path = `${this.config.root}/index/${search.index}`;
    const indexDB = new Level<string, any[]>(path, { valueEncoding: "json" });
    await indexDB.open();

    let keys: any[] = [];

    // If the user want an equal query then we will do a straight key lookup
    if (typeof search.query.$eq !== "undefined") {
      try {
        keys = await indexDB.get(search.query.$eq);
      } catch {
        keys = [];
      }
    }

    // If the user wants a starts with then we can seek to the start of the
    // range and return all of the documents starting with the term and then
    // brake when we know there are no more
    if (typeof search.query.$startsWith !== "undefined") {
      const it = indexDB.iterator();
      it.seek(search.query.$startsWith);
      for await (const [key, value] of it) {
        if (key.startsWith(search.query.$startsWith)) {
          keys = keys.concat(value);
        } else {
          break;
        }
      }
    }

    await indexDB.close();

    // If there are documents that have been indexed return then all
    if (keys.length) {
      return this.db.getMany(keys);
    }

    return [];
  }
  /**
   * Run all of the operations in the callback in a transaction only updating
   * the indexes when all of the operations are complete.
   */
  public async transaction(callback: (db: this) => Promise<void>) {
    const _this = {
      ...this,
      insert: async (key: TKey, document: TValue) => {
        await this.db.put(key, document);
      },
    };

    await callback(_this);

    for (const name in this.meta.indexes) {
      await this.createIndex({ name, ...this.meta.indexes[name] });
    }
  }
  /**
   * Create a new index configuration supplied
   */
  public async createIndex(index: IndexOptions) {
    const path = `${this.config.root}/index/${index.name}`;
    const indexDB = new Level<string, any[]>(path, { valueEncoding: "json" });
    await indexDB.open();

    switch (index.type) {
      case "number":
      case "text":
        for await (const [key, value] of this.db.iterator()) {
          const indexKey = (value as any)[index.field];
          let indexValue: any[];

          try {
            indexValue = await indexDB.get(indexKey);
          } catch (e) {
            indexValue = [];
          }

          if (!indexValue.includes(key)) {
            indexValue.push(key);
            await indexDB.put(indexKey, indexValue);
          }
        }
        break;
    }

    this.meta.indexes[index.name] = {
      field: index.field,
      type: index.type,
    };

    this.updateMeta();
    await indexDB.close();
  }
  /**
   * Gets a document by its key
   */
  public async get(key: TKey): Promise<TValue> {
    return await this.db.get(key);
  }
  /**
   * Close the database flushing everything to disk. If you want to use the
   * database after calling this function you will need to call `open` first
   */
  public async close(): Promise<void> {
    this.updateMeta();
    await this.db.close();
  }
}

export default Database;
