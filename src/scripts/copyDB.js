import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

async function copyDatabase() {
  const client = new MongoClient(process.env.DB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const adminDb = client.db().admin();

    // List all databases
    const { databases } = await adminDb.listDatabases();
    const dbNames = databases.map((db) => db.name);

    if (!dbNames.includes("LeaveMS-Live")) {
      console.log("Database LeaveMS-Live not found.");
      return;
    }

    console.log("LeaveMS-Live found. Copying data...");

    const sourceDb = client.db("LeaveMS-Live");
    const targetDb = client.db("LeaveMS");

    // List collections in source database
    const collections = await sourceDb.listCollections().toArray();

    for (const collection of collections) {
      const collectionName = collection.name;
      const sourceCollection = sourceDb.collection(collectionName);
      const targetCollection = targetDb.collection(collectionName);

      // Fetch all documents
      const documents = await sourceCollection.find().toArray();

      if (documents.length > 0) {
        // Insert into target collection
        await targetCollection.insertMany(documents);
        console.log(
          `Copied ${documents.length} documents into ${collectionName}`
        );
      } else {
        console.log(`No documents found in ${collectionName}`);
      }
    }

    console.log("Database copy completed.");
  } catch (error) {
    console.error("Error copying database:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

copyDatabase();
