const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

//firebase admin SDK for JWT
const admin = require("firebase-admin");
const serviceAccount = require("./Firebase-admin-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//mongoDB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@rafis-cluster.wpt21fe.mongodb.net/?appName=Rafis-cluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db('Fast_Parcel');
    const parcelCollection = db.collection('parcels');
    const usersCollection = db.collection('users');
    const ridersCollection = db.collection('riders');

    //custom middleware for header
    const varifyFBToken = async(req,res,next)=>{
      const authHeader = req.headers.authorization;
      if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'})
      }

      const token = authHeader.split(' ')[1];
      if(!token){
        return res.status(401).send({message: 'unauthorized access'})
      }

      //varify the token
      try{
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
      }
      catch(error){
        return res.status(403).send({message : 'forbidden access'})
      }



    }
   

    //add new parcels
    app.post('/addpercel', async (req,res)=>{
        const newParcel = req.body;
        newParcel.createdAt = new Date();
        const result = await parcelCollection.insertOne(newParcel);
        res.status(201).send(result);
    })

    //get all parcels
    app.get('/parcels',varifyFBToken, async(req,res)=>{
        const userEmail = req.query.email;
        const query = userEmail ? { senderEmail: userEmail} : {};
        const options = {
          sort: {createdAt: -1}
        };

        const parcels = await parcelCollection.find(query,options).toArray();
        res.send(parcels);
    })

    //Delete Parcel
    app.delete('/parcels/:id',varifyFBToken, async (req,res) => {
      const id = req.params.id;
      const result = await parcelCollection.deleteOne({ _id: new ObjectId(id)});

      if(result.deletedCount === 0){
        return res.status(404).send({massege: 'Parcel Not Found'});
      }

      res.send(result)
    })

    //adding users to DB
    app.post('/users', async (req,res)=>{
       const email = req.body.email;
       const userExists = await usersCollection.findOne({email});

       if(userExists){
        return res.status(200).send({message: 'user already exists'});
       }
       else{
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
       }
    })

    //Add new Rider to DB
    app.post('/riders', async(req,res)=>{
      const rider = req.body;
      const result = await ridersCollection.insertOne(rider);
      res.send(result)
    })


   
   
   
   
   
   
   
   
   
   
   
   
   
   
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
		res.send('server running')
});


app.listen(port, ()=>{
		console.log("running on port", port);
});

