//index.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Construct the MongoDB URI using environment variables
let uri;
let client = null;

if (process.env.MONGO_TYPE == "ATLAS") {
    const dbUri = process.env.MONGO_DB_ADDRESS;
    uri = dbUri.replace("<db_username>", process.env.MONGO_USER);
    uri = uri.replace("<password>", process.env.MONGO_PASSWORD);
}
else {
    uri = `mongodb://127.0.0.1:${process.env.MONGO_DB_PORT || "27017"}`;

}
// Map to hold the instances of different databases
let dbInstances = new Map();


// Initialize the MongoDB client
// if (process.env.SKIP_DB_INIT !== 'true') {
//     client = new MongoClient(uri);

// }

// Connect to MongoDB and return the requested database instance
// dbType should be either "wallet" for the wallet database
// or the Discord server ID for server-specific databases
async function connectDB(dbType) {
    if (!client) {
        client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    }

    if (!dbInstances.has(dbType)) {
        await client.connect();
        const dbInstance = client.db(dbType);
        dbInstances.set(dbType, dbInstance);
    }
    return dbInstances.get(dbType);
}


// Save a entry in the database
async function saveEntry(dbType, collection, entry) {
    try {
        const db = await connectDB(dbType);
        const result = await db.collection(collection).insertOne(entry);
        if (dbType === process.env.MONGO_DB_NAME) {
            console.log(`New Wallet created for ${entry.user} with public key ${entry.publicKey}`);
        }
    } catch (error) {
        console.error("Error saving entry:", error);
    }
}

// Find a wallet by ID
async function findEntryByID(dbType, collection, id) {
    const db = await connectDB(dbType);
    const result = await db.collection(collection).findOne({ _id: id });

    if (result) {
        if (dbType === process.env.MONGO_DB_NAME) {
            console.log(`Found a wallet in the collection for user with the id '${id}':`);
        }
        return result;
    } else {
        if (dbType === process.env.MONGO_DB_NAME) {
            console.log(`No wallet found for user with the id '${id}'`);
        }
        return false;
    }
}

// Save an encryption key entry in the database
async function saveKey(entry) {
    const db = await connectDB(process.env.MONGO_DB_NAME);
    const result = await db.collection('keys').insertOne(entry);
    console.log(`Key saved for user with ID: ${entry._id}`);
}

// Find an encryption key by ID
async function findKeyByID(id) {
    const db = await connectDB(process.env.MONGO_DB_NAME);
    const result = await db.collection('keys').findOne({ _id: id });

    if (result) {
        console.log(`Found a key in the collection for user with the id '${id}':`);
        return result;
    } else {
        console.log(`No key found for user with the id '${id}'`);
        return false;
    }
}

async function removeEntry(dbType, collection, id) {
    const db = await connectDB(dbType);
    await db.collection(collection).deleteOne({ _id: id });
    // Optionally, log the removal for debugging or auditing purposes
    if (dbType === process.env.MONGO_DB_NAME) {
        console.log(`Entry for ${id} removed from the ${collection} collection.`);
    }
}

// Function to increment specific fields in a user's database entry
async function incrementFields(dbType, collection, userId, fieldsToUpdate) {
    const db = await connectDB(dbType);
    await db.collection(collection).updateOne(
        { _id: userId },
        { $inc: fieldsToUpdate }
    );
}

async function findDocuments(dbType, collection) {
    const db = await connectDB(dbType);
    const result = await db.collection(collection).find({}).toArray();
    return result;
}
// Function to update a document in the collection
async function updateDocument(dbType, collectionName, query, update) {
    const db = await connectDB(dbType);
    const collection = db.collection(collectionName);

    try {
        const result = await collection.updateOne(query, { $set: update });
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Error updating document:', error);
        return false;
    }
}

// Function to add an item to an array field in a document
async function addItemToArray(dbType, collectionName, documentId, arrayField, newItem) {
    const db = await connectDB(dbType);
    const collection = db.collection(collectionName);

    try {
        const result = await collection.updateOne(
            { _id: documentId },
            { $push: { [arrayField]: newItem } }
        );
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Error adding item to array:', error);
        return false;
    }
}

process.on('SIGINT', async () => {
    await client.close();
    process.exit();
});

// Export the functions for use in other files
module.exports = { saveWallet: saveEntry, saveEntry, findOneWalletByID: findEntryByID, findEntryByID, saveKey, findKeyByID, removeEntry, incrementFields, findDocuments, updateDocument, addItemToArray };
