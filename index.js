require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Product = mongoose.model("Product", {
  product_id: {
    type: String
  },
  name: {
    type: String,
    default: ""
  },
  brand: {
    type: String
  },
  nutriScore: {
    type: Number
  },
  date: {
    type: String
  },
  image: {
    type: String
  }
});

app.get("/", async (req, res) => {
  try {
    let all = await Product.find();
    res.json(all);
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/create", async (req, res) => {
  try {
    let product = await Product.findOne({ product_id: req.body.product_id });
    if (product) {
      res.json({ message: "This product already exists" });
    } else {
      const newProduct = new Product({
        product_id: req.body.product_id,
        name: req.body.name,
        brand: req.body.brand,
        nutriScore: req.body.nutriScore,
        date: req.body.date,
        image: req.body.image
      });
      await newProduct.save();
      res.json(newProduct);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server has started");
});
