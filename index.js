const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express()
const cors = require('cors');
const { JsonWebTokenError } = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ouarn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unathuraization error' })
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRATE, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })

}
async function run() {
    try {
        client.connect()
        const productsCollection = client.db("paint_basic").collection("products");
        const orderCollection = client.db("paint_basic").collection("orders");
        const userCollection = client.db("paint_basic").collection("user");
        //get all products data
        app.get('/products', async (req, res) => {
            const products = await productsCollection.find().toArray()
            res.send(products)
        })
        // get single product data 
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const product = await productsCollection.findOne(query)
            res.send(product);
        })
        // post order 
        app.post('/orders',async(req,res)=>{
            const order=req.body;
            const result=await orderCollection.insertOne(order)
             res.send(result)
        })
        // jwt token send to cliet side
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            if(!email){return}
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRATE, { expiresIn: '1h' })
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, option)
            res.send({ result, token });
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