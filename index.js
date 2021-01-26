require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const validator = require("validator");

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const User = mongoose.model("User", {
  username: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  token: String,
  hash: String,
  salt: String,
});

const Product = mongoose.model("Product", {
  product_id: {
    type: String,
  },
  name: {
    type: String,
    default: "",
  },
  brand: {
    type: String,
  },
  nutriScore: {
    type: String,
  },
  date: {
    type: String,
  },
  image: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

app.post("/sign_up", async (req, res) => {
  if (validator.isEmail(req.body.email) === false) {
    return res.status(400).json({ message: "Invalid email" });
  }

  const password = req.body.password;
  const salt = uid2(16);
  const hash = SHA256(password + salt).toString(encBase64);

  const newUser = new User({
    username: req.body.username,
    email: req.body.email,
    token: uid2(16),
    salt: salt,
    hash: hash,
  });

  await newUser.save();

  res.json({
    _id: newUser._id,
    token: newUser.token,
    username: newUser.username,
  });
});

app.post("/log_in", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const userFound = await User.findOne({ email: email });

  if (userFound) {
    const salt = userFound.salt;
    const hash = SHA256(password + salt).toString(encBase64);
    if (hash === userFound.hash) {
      res.json({
        _id: userFound._id,
        token: userFound.token,
        username: userFound.username,
      });
    } else {
      res.json({ error: "Invalid email/password" });
    }
  } else {
    res.json({ error: "User does not exists" });
  }
});

app.get("/:userId", async (req, res) => {
  console.log(req.params.userId);

  try {
    let all = await Product.find({ user: req.params.userId });
    if (all) {
      res.json(all);
    } else {
      res.json(null);
    }
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/create", async (req, res) => {
  try {
    if (req.body.product_id) {
      // All user's products
      let userProducts = await Product.find({ user: req.body.user });
      // if the product already exists
      if (
        userProducts.some((item) => item.product_id === req.body.product_id)
      ) {
        console.log("Product allready exists");
        res.status(409).json({ message: "This product already exists" });
      } else {
        // else create product
        const newProduct = new Product({
          product_id: req.body.product_id,
          name: req.body.name,
          brand: req.body.brand,
          nutriScore: req.body.nutriScore,
          date: req.body.date,
          image: req.body.image,
          user: req.body.user,
        });
        await newProduct.save();
        res.status(200).json(newProduct);
      }
    } else {
      res.status(400).json({ message: "Bad Request" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/delete", async (req, res) => {
  try {
    await Product.findOneAndDelete({ product_id: req.body.product_id });
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server has started");
});
