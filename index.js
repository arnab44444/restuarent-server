const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vwcukbn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const foodsCollection = client.db("restuarent-MS").collection("food");

    const orderCollection = client.db("restuarent-MS").collection("order");

    app.post("/foods", async (req, res) => {
      const newFood = req.body;
      console.log(newFood);

      const result = await foodsCollection.insertOne(newFood);

      res.send(result);
    });

    app.get("/foods", async (req, res) => {
      const result = await foodsCollection.find().toArray();
      res.send(result);
    });

    // food details

    app.get("/foodDetails/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await foodsCollection.findOne(query);

      res.send(result);
    });

    // food purchase

    app.get("/foodPurchase/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await foodsCollection.findOne(query);

      res.send(result);
    });

    // handle order

    app.post("/place-order/:foodId", async (req, res) => {
      const id = req.params.foodId;
      const orderData = req.body;
      const orderedQuantity = parseInt(orderData.quantity); // ensure it's a number

      console.log("Order received:", orderData);

      const result = await orderCollection.insertOne(orderData);

      if (result.acknowledged) {
        // ✅ subtract ordered quantity from foods collection
        await foodsCollection.updateOne(
          { _id: new ObjectId(id) },
          //{ $inc: { quantity: -orderedQuantity } }, // subtract user ordered quantity

          {
            $inc: {
              quantity: -orderedQuantity, // Decrease quantity
              purchasedCount: orderedQuantity, // Increase purchasedCount
            },
          }
        );
      }

      res.send(result);
    });

    // app.post("/place-order/:foodId", async (req, res) => {
    //   const id = req.params.foodId;
    //   const orderData = req.body;
    //   console.log("Order received:", orderData);

    //   const result = await orderCollection.insertOne(orderData);

    //   if (result.acknowledged) {
    //     // update quantity in coffees collection

    //     await foodsCollection.updateOne(
    //       { _id: new ObjectId(id) },
    //       { $inc: { quantity: -1 } }
    //     );
    //   }

    //   res.send(result);
    // });

    // my food page

    app.get("/my-food", async (req, res) => {
      const email = req.query.email;

      //console.log(email);

      const query = { buyerEmail: email };

      const result = await orderCollection.find(query).toArray();

      // milstone 12 e aggregate diye aro clearly sikhbo

      for (const order of result) {
        const orderId = order.foodId;
        const fullFoodData = await foodsCollection.findOne({
          _id: new ObjectId(orderId),
        });
        order.name = fullFoodData.name;
        order.image = fullFoodData.image;
        order.category = fullFoodData.category;
        order.price = fullFoodData.price;
        order.origin = fullFoodData.origin;
      }

      res.send(result);
    });

    // update

    app.get("/updateFood/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await foodsCollection.findOne(query);

      res.send(result);
    });

    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;

      const {
        _id,
        image,
        name,
        category,
        price,
        origin,
        quantity,
        description,
      } = req.body;

      const query = { _id: new ObjectId(id) };

      const updateData = {
        $set: {
          // _id,
          image,
          name,
          category,
          price,
          origin,
          description,
          quantity,
          // email,
          // displayName
        },
      };

      const result = await foodsCollection.updateOne(query, updateData);

      res.send(result);
    });

    //

    app.get(
      "/myfood-post",
      // verifyToken,

      async (req, res) => {
        const email = req.query.email;

        const query = { addedByEmail: email };
        const jobs = await foodsCollection.find(query).toArray();
        //console.log(email)

        // should use aggregate to have optimum data fetching

        // for (const food of foods) {
        //   const applicationQuery = { jobId: job._id.toString() };
        //   const application_count = await applicationsCollection.countDocuments(
        //     applicationQuery
        //   );
        //   job.application_count = application_count;
        // }
        res.send(jobs);
      }
    );

    // delet food

    app.delete("/cancel_Order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      try {
        // Find the order first
        const order = await orderCollection.findOne(query);

        if (!order) {
          return res.status(404).send({ message: "Order not found" });
        }

        const foodId = order.foodId; // Make sure each order includes this when created
        const orderQuantity = order.quantity || 1;

        // Delete the order
        const result = await orderCollection.deleteOne(query);

        if (result.deletedCount > 0) {
          // Increase food quantity in the food collection
          // await foodsCollection.updateOne(
          //   { _id: new ObjectId(foodId) },
          //   {
          //     $inc: { quantity: orderQuantity },
          //     purchasedCount: -orderQuantity,
          //   }
          // );
          await foodsCollection.updateOne(
            { _id: new ObjectId(foodId) },
            {
              $inc: {
                quantity: orderQuantity,
                purchasedCount: -orderQuantity, // this line was the problem before
              },
            }
          );
        }

        res.send(result);
      } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // app.delete("/cancel_Order/:id", async (req, res) => {
    //   const id = req.params.id;
    //   //console.log('to be deleted', id)

    //   const query = { _id: new ObjectId(id) };

    //   const result = await orderCollection.deleteOne(query);

    //   res.send(result);
    // });

    // nijer add kora food e order kora jabena

    app.post("/order", async (req, res) => {
      const order = req.body;

      const food = await foodsCollection.findOne({
        _id: new ObjectId(order.foodId),
      });

      if (!food) {
        return res.status(404).send({ message: "Food not found" });
      }

      // Check if buyer is the owner
      if (food.addedByEmail === order.buyerEmail) {
        return res
          .status(400)
          .send({ message: "You cannot order your own posted food." });
      }

      // Insert the order if valid
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    // top 6 purchase food

    // new-plant section last 6ta data

    // GET: Top 6 most purchased foods
    app.get("/top-purchased-foods", async (req, res) => {
      try {
        const topFoods = await foodsCollection
          .find()
          .sort({ purchasedCount: -1 }) // descending order
          .limit(6)
          .toArray();

        res.send(topFoods);
      } catch (error) {
        console.error("Error fetching top purchased foods:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("restuarent server is running");
});

app.listen(port, () => {
  console.log(`restuarent server is running on port ${port}`);
});
