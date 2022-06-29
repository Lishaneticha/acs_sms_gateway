require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const { RABBIT_URI } = "amqp://localhost" || process.env;
const { API_PORT } = process.env;
const port = process.env.PORT || API_PORT;
const controller = require('./controllers/smsController');

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./model/user");
const auth = require("./middleware/auth");

const app = express();

app.use(express.json())
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: "100mb"}));
app.use(bodyParser.urlencoded({limit: "100mb", extended: true, parameterLimit:100000}));

const Worker = {};
const queue = 'acs_sms_messages';
const amqp = require('amqplib/callback_api');

function doWork(rawData){
  if(rawData) {
    try{
      let json = JSON.parse(rawData);
      controller.sendSMS(json[0],json[1])
    }catch(e){
      console.log(`There was an error in queue ${queue}>> `,e);
     }
  }
}

//Send sms to queue
function depositToQueue(messages){

    return new Promise(function(resolve, reject) {

        amqp.connect(RABBIT_URI, function(error0, connection) {
            if (error0) {
                throw error0;
            }
            connection.createChannel(function(error1, channel) {
                if (error1) {
                    resolve('Fail')
                    throw error1;
                }

                channel.assertQueue(queue, {
                    durable: false
                });
                
                for(const msg of messages) {
                    var json = JSON.stringify(msg);
                    channel.sendToQueue(queue, Buffer.from(json), {persistent: true});
                    console.log(" [x] Sent %s", json);
                }

                resolve('Success')

            });
            setTimeout(function() {
                connection.close();
            }, 500);
        });
    })
}

//Receive from queue and send SMS
amqp.connect(RABBIT_URI, function(error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }
      channel.assertQueue(queue, {
        durable: false
      });
       channel.consume(queue, function(msg) {
        console.log(" [x] Received %s", msg.content.toString());
        doWork(msg.content.toString());
        //wait and requeue for error
      }, {
           noAck: true
      });
    });
  });

app.get("/init",async (req,res)=>{
    try{
        console.log(`SMS Gateway is Running on port ${port} ...`)
        res.json({success:true, "message":"SMS gateway is running"})
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
})

app.get("/sendSMS",auth,async (req,res)=>{
    var result = null
    try{
        //console.log("aid: "+req.query.aid, "pin: "+req.query.pin, "mnumber: "+req.query.mnumber, "signature: "+req.query.signature, "message: "+req.query.message)
        console.log(req.query)
        var phone = req.query.mnumber
        var message = req.query.message
        if(!phone || !message) {
            res.json({"responsecode": "1","response": "phone and message required"})
        }else{
            var arr = [[phone, message]]
            result = await depositToQueue(arr)
        }
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
    if(result) res.json({"responsecode": "0","response": result})
})

app.post("/sendSMS",auth,async (req,res)=>{
    var result = null
    try{
        console.log(req.body)
        var phone = req.body.recipient
        var message = req.body.message
        if(!phone || !message) {
            res.json({"responsecode": "1","response": "phone and message required"})
        }else{
            var arr = [[phone, message]]
            result = await depositToQueue(arr)
        }
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
    if(result) res.json({"responsecode": "0","response": result})
})

app.post("/sendBulkSMS",auth, async (req, res)=>{
    var result = null
    try{
        console.log(req.body)
        var phones = req.body.recipients
        var message = req.body.message

        if(!phones || !message) {
            res.json({"responsecode": "1","response": "phones and message required"})
        }else{
            var arr = []
            phones.forEach(async phone =>{
                arr.push([phone, message])
            });
            result = await depositToQueue(arr)
        }
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
    if(result) res.json({"responsecode": "0","response": result})
})

app.post("/register", async (req, res) => {
    try {
      // Get user input
      const { first_name, last_name, email, password } = req.body;
  
      // Validate user input
      if (!(email && password && first_name && last_name)) {
        res.status(400).send("All input is required");
      }
  
      // check if user already exist
      // Validate if user exist in our database
      const oldUser = await User.findOne({ email });
  
      if (oldUser) {
        return res.status(409).send("User Already Exist. Please Login");
      }
  
      //Encrypt user password
      encryptedPassword = await bcrypt.hash(password, 10);
  
      // Create user in our database
      const user = await User.create({
        first_name,
        last_name,
        email: email.toLowerCase(), // sanitize: convert email to lowercase
        password: encryptedPassword,
      });
  
      // console.log(user._id, email, process.env.TOKEN_KEY)
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      // save user token
      user.token = token;
  
      // return new user
      res.status(201).json(user);
    } catch (err) {
      console.log(err);
    }
  });
  
  app.post("/login", async (req, res) => {
    try {
      // Get user input
      const { email, password } = req.body;
  
      // Validate user input
      if (!(email && password)) {
        res.status(400).send("All input is required");
      }
      // Validate if user exist in our database
      const user = await User.findOne({ email });
  
      if (user && (await bcrypt.compare(password, user.password))) {
        // Create token
        const token = jwt.sign(
          { user_id: user._id, email },
          process.env.TOKEN_KEY,
          {
            expiresIn: "2h",
          }
        );
  
        // save user token
        user.token = token;
  
        // user
        res.status(200).json(user);
      }
      res.status(400).send("Invalid Credentials");
    } catch (err) {
      console.log(err);
    }
  });
  
  app.get("/welcome", auth, (req, res) => {
    res.status(200).send("Welcome to acs SMS gateway 🙌 ");
  });
  
  // This should be the last route else any after it won't work
  app.use("*", (req, res) => {
    res.status(404).json({
      success: "false",
      message: "Page not found",
      error: {
        statusCode: 404,
        message: "You reached a route that is not defined on this server",
      },
    });
  });
  
  module.exports = app;

