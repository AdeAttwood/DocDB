import fs from "node:fs";
import Database from "./database";
/**
 * All of the config options that you can use to configure the doc db instance
 */
export interface Config {
  /**
   * The root directory where all of the data will be stored
   */
  root: string;
}

/**
 * The main database instance
 */
export class Instance {
  private config: Config;
  /**
   * Sets up the database instance
   */
  constructor(config: Config) {
    this.config = config;

    if (!fs.existsSync(this.root())) {
      fs.mkdirSync(this.root(), { recursive: true });
    }
  }
  /**
   * Get the root directory where all of the databases are stored
   */
  private root(): string {
    return `${this.config.root}/databases`;
  }
  /**
   * List all of the databases in the instance
   */
  public databases(): string[] {
    return fs.readdirSync(this.root());
  }
  /**
   * Creates a new database and returns the database object
   */
  public createDatabase(name: string): Database {
    const root = `${this.root()}/${name}`;
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }

    return new Database({ root });
  }
}

export default Instance;
