const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken')
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ilq1t0j.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization
  if(!authHeader){
    return res.status(401).send('unauthorized access')
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
    if(err){
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try{
    const productsCollections = client.db("resaleMarket").collection('products');
    const usersCollection = client.db("resaleMarket").collection("users");
    const bookingsCollection = client.db("resaleMarket").collection('bookings')
    const addedProductsCollection = client.db("resaleMarket").collection('addedProducts')
    const paymentsCollection = client.db("resaleMarket").collection('payments')
    
    app.get('/category', async(req, res) => {
      const query = {};
      const category = await productsCollections.find(query).toArray();
      res.send(category)
    });

    app.get('/category/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const category = await productsCollections.find(query).toArray();
      res.send(category)
    });

    app.get('/productCategory', async(req, res) => {
      const query = {}
      const result = await productsCollections.find(query).project({category: 1}).toArray();
      res.send(result);
    })

    
    // user get api
    app.get('/users', async(req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

      // delete user
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // allbuyers get api
    app.get('/allbuyers', async(req, res) => {
      const query = {role: 'buyer'};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });



    // user post api
    app.post('/users', async(req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // update user api
    app.put('/users/admin/:id', verifyJWT, async(req, res) => {
      const decodedEmail = req.decoded.email;

      const query = {email: decodedEmail};
      const user = await usersCollection.findOne(query);

      if(user?.role !== 'admin'){
        return res.status(403).send({message: 'forbidden access'})
      }

      const id = req.params.id;
      const filter = {_id: ObjectId(id)}
      const options = {upsert: true};
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    // user role route
    app.get('/users/admin/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email}
      const user = await usersCollection.findOne(query)
      res.send({role: user?.role});

    })

    // booking api
    app.get('/bookings', verifyJWT, async(req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if(email !== decodedEmail){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    app.post('/bookings', async(req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking)
      res.send(result);
    })

    // jwt api
    app.get('/jwt', async(req, res) => {
      const email = req.query.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "120h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({accessToken: ''})
    })

    // added product
    app.post('/addedproducts', async(req, res) => {
      const addedproduct = req.body;
      result = await addedProductsCollection.insertOne(addedproduct)
      res.send(result);
    })

    app.get('/addedproducts', async(req, res) => {
      const query = {}
      const addedProducts = await addedProductsCollection.find(query).toArray();
      res.send(addedProducts);
    });

    app.delete("/addedproducts/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await addedProductsCollection.deleteOne(filter);
      res.send(result);
    });

    // payment api
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          trasactionId: payment.trasactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

  } finally {

  }

}
run().catch(console.log())

app.get("/", async (req, res) => {
  res.send("resale market server is running");
});

app.listen(port, () => {
  console.log(`Resale market is running on ${port}`);
});
