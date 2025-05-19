// Import required libraries
const express = require('express');                      
const { MongoClient, ObjectId } = require('mongodb');  

// Initialize express app
const app = express();
const port = 4000; // Port to run the server on

// MongoDB connection details
const uri = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB_NAME || 'todo_db';
let db; // This will hold the database connection after connecting

// Middleware to parse JSON in request bodies
app.use(express.json());

// Connect to MongoDB 
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    // Save the connected database
    db = client.db(dbName);
    console.log('Connected to MongoDB');

    // CREATE - Add a new to-do item
    app.post('/todos', async (req, res) => {
      try {
        const result = await db.collection('todos').insertOne(req.body); // Insert request body
        res.status(201).json(result); // Return inserted result
      } catch (err) {
        res.status(500).send('Create failed'); // Error response
      }
    });

    // READ ALL - Get list of all to-do items
    app.get('/todos', async (req, res) => {
      try {
        const todos = await db.collection('todos').find().toArray(); // Fetch all todos
        res.json(todos); // Return todos as JSON
      } catch (err) {
        res.status(500).send('Read failed');
      }
    });

    // READ ONE - Get a single to-do item by ID
    app.get('/todos/:id', async (req, res) => {
      try {
        const todo = await db.collection('todos').findOne({ _id: new ObjectId(req.params.id) }); // Find by _id
        if (!todo) return res.status(404).send('Not found');
        res.json(todo);
      } catch (err) {
        res.status(500).send('Read failed');
      }
    });

    // UPDATE - Update a to-do item by ID
    app.put('/todos/:id', async (req, res) => {
      try {
        const result = await db.collection('todos').updateOne(
          { _id: new ObjectId(req.params.id) },  // Match by ID
          { $set: req.body }                     // Update with new fields
        );
        res.json(result);
      } catch (err) {
        res.status(500).send('Update failed');
      }
    });

    // DELETE - Delete a to-do item by ID
    app.delete('/todos/:id', async (req, res) => {
      try {
        const result = await db.collection('todos').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result); // Return delete result
      } catch (err) {
        res.status(500).send('Delete failed');
      }
    });

    // Start the server only after DB is connected
    app.listen(port, () => {
      console.log(`To-Do API running at http://localhost:${port}`);
    });
  })
  .catch(err => {
    // Log DB connection error and exit
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
