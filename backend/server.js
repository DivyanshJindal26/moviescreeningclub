import express from "express";
import mongoose from "mongoose";
import { User, Volunteer, Admin } from "./userModel.js";
import QR from "./userModel.js";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cors from "cors";
import { config } from "dotenv";
config({ path: "../screening/.env" });
const app = express();
import { createServer } from "http";
const https = createServer(app);
import bcrypt from 'bcrypt';
import jwt  from "jsonwebtoken";
app.use(cors());

mongoose.connect("mongodb+srv://aryanjain:qwertyuiop@msccluster.as7t56y.mongodb.net/?retryWrites=true&w=majority&appName=msccluster",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

const PORT = 8000;

app.use(bodyParser.json());


app.post("/signup", (req, res) => {
  const { name, phoneNumber, designation, email, password } = req.body;
  const newUser = new User({ name, phoneNumber, designation, email, password });
  newUser
    .save()
    .then((savedUser) => {
      console.log("User details saved:", savedUser);
      res.status(200).json(savedUser);
    })
    .catch((error) => {
      console.error("Error saving User:", error);
      res.status(500).json({ error: "Error saving User" });
    });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    // console.log(user.password);
    if (!User) {
      return res.status(404).json({ error: "user not found" });
    }
    let passwordMatch = false;
    if(user.password===password){
      passwordMatch=true;
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: "invalid email or password" });
    }
    const token = jwt.sign({ userId: user._id }, "your-secret-key", {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/saveQR", (req, res) => {
  const { email, paymentId, validity } = req.body;
  const newQR = new QR({ email, paymentId, validity });
  newQR.save()
    .then((savedQR) => {
      console.log("QR details saved:", savedQR);
      res.status(200).json(savedQR);
    })
    .catch((error) => {
      console.error("Error saving QR:", error);
      res.status(500).json({ error: "Error saving QR" });
    });
});


app.post("/send-email", (req, res) => {
  const { email, membership, paymentId, qrCodes } = req.body;

  // Create a transporter using nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL, // Using environment variables for email and password
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Payment Successful",
    text: `Your payment was successful. Membership: ${membership}`,
    attachments: qrCodes.map((qrCodeData, index) => ({
      filename: `QR_${index + 1}.jpg`,
      content: qrCodeData.split("base64,")[1],
      encoding: "base64",
    })),
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent:", info.response);
      res.status(200).send("Email sent successfully");
    }
  });
});

app.post("/checkPayment", async (req, res) => {
  try {
    const paymentId = req.body.paymentId;

    // Query the database to check if the payment ID exists
    const payment = await QR.findOne({ paymentId });

    if (!payment) {
      res.json({ exists: false });
    } else {
      const currentDate = new Date();
      const validityDate = new Date(payment.registrationDate);

      if (currentDate > validityDate) {
        res.json({ exists: true, validityPassed: true });
      } else {
        if (payment.used) {
          res.json({ exists: true, validityPassed: false, alreadyScanned: true });
        } else {
          payment.used = true;
          await payment.save();
          res.json({ exists: true, validityPassed: false, alreadyScanned: false });
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
