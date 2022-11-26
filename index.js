const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

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

async function run() {
  try{
    const productsCollections = client.db("resaleMarket").collection('products');

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
    })
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
