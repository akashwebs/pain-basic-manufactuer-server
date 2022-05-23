const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ouarn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// perform actions on the collection object

async function run() {
    try {
        client.connect()
        const productsCollection = client.db("paint_basic").collection("products");
        app.get('/products',async(req,res)=>{
            const products=await productsCollection.find().toArray()
            res.send(products)
        })

    } 
    finally {

    }
}



app.get('/', (req, res) => {
    res.send('paint basic server run')
})
app.listen(port, () => {
    console.log('successfully run paint basic', port)
})
run().catch(console.dir);