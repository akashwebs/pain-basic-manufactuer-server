const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express()
const cors = require('cors');
const { JsonWebTokenError } = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const res = require('express/lib/response');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const reviewCollection = client.db("paint_basic").collection("review");
        // verify admin 
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const requisterRole = await userCollection.findOne({ email: decodedEmail });
            if (requisterRole.role === 'admin') {
                next()
            } else {
                res.status(403).send({ message: 'forbidden' })
            }

        }

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
        //add post
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result)
        })
        // delet product
        app.delete('/product/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id:ObjectId(id) }
            const result = await productsCollection.deleteOne(filter)
            res.send(result)
        })
        // post order 
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })
        app.get('/orders/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const orders = await orderCollection.find(query).toArray()
            res.send(orders)
        })
        // get all orders
        app.get('/orders', verifyJwt,verifyAdmin, async (req, res) => {
  
            const orders = await orderCollection.find().toArray()
            res.send(orders)
        })

        app.post('/create-payment-intent', verifyJwt, async(req, res) =>{
            const service = req.body;
            const price = service.price;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });
      
        
        

        // update paid stutatus
        app.put('/orders/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const pay = req.body;
            
            if (!id) { return }
            const filter = { _id:ObjectId(id) }
            
            const updateDoc = {
                $set: pay
            };
            const result = await orderCollection.updateOne(filter, updateDoc)
            res.send({ result });
        })
        app.delete('/orders/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email }
            const result = await orderCollection.deleteOne(filter)
            res.send(result)
        })
        app.get('/paymentOrder/:id',async(req,res)=>{
            const id=req.params.id;

            const query={_id:ObjectId(id)}
            const result =await orderCollection.findOne(query)
            res.send(result)
        })
      
        // jwt token send to cliet side
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;

            if (!email) { return }
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRATE, { expiresIn: '1h' })
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, option)
            res.send({ result, token });
        })
        // update user
        app.put('/updateuser/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const updateUser = req.body;

            if (!email) { return }

            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: updateUser
            };
            const result = await userCollection.updateOne(filter, updateDoc, option)
            res.send({ result });
        })
        //post reivew
        app.post('/reivew', verifyJwt, async (req, res) => {
            const reivew = req.body;
           
            const result = await reviewCollection.insertOne(reivew)
            res.send(result)
        })

        // get user
        app.get('/user', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const result = await userCollection.findOne({ email })
            res.send(result)
        })
        app.get('/users', verifyJwt, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })
        // make admin
        app.put('/user/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send({ result });
        })

        // delete user
        
        app.delete('/user/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email }
            const result = await userCollection.deleteOne(filter)
            res.send(result)
        })

        // for check role  and sohw user route
        app.get('/admin/:email', verifyJwt,verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user?.role === 'admin'
            res.send({ admin: isAdmin })
        })
        app.get('/allReivew',async(req,res)=>{
            const result=await reviewCollection.find().toArray();
            res.send(result)
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