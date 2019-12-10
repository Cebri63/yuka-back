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
  useUnifiedTopology: true
});

const User = mongoose.model("User", {
  username: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  token: String,
  hash: String,
  salt: String
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
    type: String
  },
  date: {
    type: String
  },
  image: {
    type: String
  }
});

app.post("/sign_up", function(req, res) {
  if (validator.isEmail(req.body.email) === false) {
    return res.status(400).json({ message: "Invalid email" });
  }

  const password = req.body.password;
  const salt = uid2(16);
  const hash = SHA256(password + salt).toString(encBase64);

  const newUser = new User({
    account: {
      username: req.body.username,
      biography: req.body.biography
    },
    email: req.body.email,
    token: uid2(16),
    salt: salt,
    hash: hash
  });

  newUser.save(function(err, userSaved) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({
        _id: newUser._id,
        token: newUser.token,
        username: newUser.account.username
      });
    }
  });
});

app.post("/log_in", function(req, res) {
  const email = req.body.email;
  const password = req.body.password;

  User.findOne({ email: email }).exec(function(err, userFound) {
    const salt = userFound.salt;
    const hash = SHA256(password + salt).toString(encBase64);
    if (hash === userFound.hash) {
      res.json({
        _id: userFound._id,
        token: userFound.token,
        account: {
          username: userFound.account.username,
          biography: userFound.account.biography
        }
      });
    } else {
      res.json({ error: "Invalid email/password" });
    }
  });
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
