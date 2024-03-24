//index.js
require('dotenv').config();
const { MongoClient} = require('mongodb');

// Construct the MongoDB URI using environment variables
const dbUri = process.env.MONGO_DB_ADDRESS;
const uri = dbUri.replace("<password>", process.env.MONGO_PASSWORD);
let client = null;

// Map to hold the instances of different databases
let dbInstances = new Map();


// Initialize the MongoDB client
if (process.env.SKIP_DB_INIT !== 'true') {
    client = new MongoClient(uri);

}

// Connect to MongoDB and return the requested database instance
// dbType should be either "wallet" for the wallet database
// or the Discord server ID for server-specific databases
async function connectDB(dbType) {
    if (!dbInstances.has(dbType)) {
        await client.connect();
        const dbInstance = client.db(dbType);
        dbInstances.set(dbType, dbInstance);
    }
    return dbInstances.get(dbType);
}


// Save a entry in the database
async function saveEntry(dbType, collection,entry) {
    const db = await connectDB(dbType);
    const result = await db.collection(collection).insertOne(entry);
    if(dbType === 'wallets'){
        console.log(`New Wallet created for ${entry.user} with public key ${entry.publicKey}`);
    }
}

// Find a wallet by ID
async function findEntryByID(dbType, collection,id) {
    const db = await connectDB(dbType);
    const result = await db.collection(collection).findOne({ _id: id });

    if (result) {
        if(dbType === 'wallets'){
            console.log(`Found a wallet in the collection for user with the id '${id}':`);
        }
        return result;
    } else {
        if(dbType === 'wallets'){
            console.log(`No wallet found for user with the id '${id}'`);
        }
        return false;
    }
}

// Save an encryption key entry in the database
async function saveKey(entry) {
    const db = await connectDB('wallets');
    const result = await db.collection('keys').insertOne(entry);
    console.log(`Key saved for user with ID: ${entry._id}`);
}

// Find an encryption key by ID
async function findKeyByID(id) {
    const db = await connectDB('wallets');
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
    if(dbType === 'wallets'){
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

async function findDocument(dbType, collection,id) {
    const db = await connectDB(dbType);
    const result = await db.collection(collection).find(id).toArray();
    return result;
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

process.on('SIGINT', async () => {
    await client.close();
    process.exit();
});

// Export the functions for use in other files
module.exports = { saveWallet: saveEntry, saveEntry, findOneWalletByID: findEntryByID, findEntryByID,saveKey, findKeyByID, removeEntry, incrementFields, findDocument ,findDocuments, updateDocument };
