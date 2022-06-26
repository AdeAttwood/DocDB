<div align="center">

# Doc DB Core

The core embeddable document database

</div>

## Usage

Create  a new database and ensure it is open ready for using

```typescript
const db = new Database({ root: "/tmp/database" });
await db.open();
```

Insert some data

```typescript
const json = JSON.parse(
  fs.readFileSync("~/json.json", "utf8")
);

for (const data of json.data) {
  await db.insert(data.id, data);
}
```


Run a query on the data matching where the card type is 'comment' or
'post'

```typescript
const it = db.find({
  $or: [
    { type: { $eq: "comment" } },
    { type: { $eq: "post" } }
  ],
});
```

Loop though all of the results of the query

```typescript
for await (const [_, value] of it) {
  console.log(value.type);
}
```


Create a text index called "tile:text" on the field title in the document

```typescript
await db.createIndex({ name: "title:text", field: "title", type: "text" });
```

Search the index of titles that start with 'Node JS'

```typescript
const items = await db.search({
  index: "title:text",
  query: { $startsWith: "Node JS" },
});
```

Log out all of the card names

```typescript
console.log(items.map((item) => item.title));
```

Indexes are updated after every insert. If you wrap your inserts in a
transaction they are the indexes are not updated until all of the inserts have
been completed

```typescript
await db.transaction(async (db) => {
  for (const data of json.data) {
    await db.insert(data.id, data);
  }
});
```

Close the database when you have finished

```typescript
await db.close();
```