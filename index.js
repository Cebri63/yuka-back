require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const formidable = require("express-formidable");
const cloudinary = require("cloudinary").v2;

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const validator = require("validator");

const app = express();
app.use(formidable());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
  avatar: {
    type: Object,
  },
  counter: {
    type: Number,
  },
  token: String,
  hash: String,
  salt: String,
});

const Product = mongoose.model("Product", {
  product_id: {
    type: String,
  },
  product_name: {
    type: String,
    default: "",
  },
  brands: {
    type: String,
  },
  nutriments: {
    type: Object,
  },
  nutrient_levels: {
    type: Object,
  },
  nutriscore_grade: {
    type: String,
  },
  nutriscore_score: {
    type: Number,
  },
  nova_group: {
    type: Number,
  },
  ecoscore_grade: {
    type: String,
  },
  date: {
    type: String,
  },
  image_url: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

app.post("/sign_up", async (req, res) => {
  if (validator.isEmail(req.fields.email) === false) {
    return res.status(400).json({ message: "Invalid email" });
  }

  const exist = await User.findOne({ email: req.fields.email });
  if (!exist) {
    const password = req.fields.password;
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);

    const newUser = new User({
      username: req.fields.username,
      email: req.fields.email,
      counter: 0,
      token: uid2(16),
      salt: salt,
      hash: hash,
    });

    // Upload profile picture
    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      folder: `/yuka/user/${newUser._id}`,
    });

    newUser.avatar = result;
    await newUser.save();

    res.json({
      _id: newUser._id,
      token: newUser.token,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      counter: newUser.counter,
    });
  } else {
    res.status(409).json({ message: "This email already has an account" });
  }
});

app.post("/log_in", async (req, res) => {
  const email = req.fields.email;
  const password = req.fields.password;

  const userFound = await User.findOne({ email: email });

  if (userFound) {
    const salt = userFound.salt;
    const hash = SHA256(password + salt).toString(encBase64);
    if (hash === userFound.hash) {
      res.json({
        _id: userFound._id,
        token: userFound.token,
        username: userFound.username,
        email: userFound.email,
        avatar: userFound.avatar,
        counter: userFound.counter,
      });
    } else {
      res.json({ error: "Invalid email/password" });
    }
  } else {
    res.json({ error: "User does not exists" });
  }
});

app.get("/user/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.json({
      _id: user._id,
      token: user.token,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      counter: user.counter,
    });
  } catch (error) {
    res.send(error.message);
  }
});

app.get("/products/:userId", async (req, res) => {
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
    console.log(req.fields);
    if (req.fields.product_id) {
      // All user's products
      let userProducts = await Product.find({ user: req.fields.user });
      // if the product already exists
      if (
        userProducts.some((item) => item.product_id === req.fields.product_id)
      ) {
        console.log("Product allready exists");
        res.status(409).json({ message: "This product already exists" });
      } else {
        // else create product
        const newProduct = new Product({
          product_id: req.fields.product_id,
          product_name: req.fields.name,
          brands: req.fields.brand,
          nutriments: req.fields.nutriments,
          nutriscore_grade: req.fields.nutriScore,
          nutriscore_score: req.fields.nutriscore_score,
          nutrient_levels: req.fields.nutrient_levels,
          nova_group: req.fields.nova_group,
          ecoscore_grade: req.fields.ecoscore_grade,
          date: req.fields.date,
          image_url: req.fields.image,
          user: req.fields.user,
        });

        // increment user counter
        const user = await User.findById(req.fields.user);
        user.counter++;
        await user.save();
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
    await Product.findOneAndDelete({ product_id: req.fields.product_id });
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server has started");
});
