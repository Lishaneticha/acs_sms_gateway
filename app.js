require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const { API_PORT } = process.env;
const port = process.env.PORT || API_PORT;
const controller = require('./controllers/smsController');
const smsLogController = require('./controllers/smsLogController');

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./model/user");
const SmsLog = require("./model/smsLog");
const auth = require("./middleware/auth");

var uuid = require('uuid');

const app = express();

app.use(express.json())
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: "100mb"}));
app.use(bodyParser.urlencoded({limit: "100mb", extended: true, parameterLimit:100000}));

const queue = 'acs_sms_messages_1';
const amqp = require('amqplib/callback_api');

async function doWork(rawData){
  if(rawData) {
    try{
      rawData.forEach(async raw =>{
        await controller.sendSMS(raw[0],raw[1],raw[2])
      });
    }catch(e){
      console.log(`There was an error >> `,e);
     }
  }
}

async function findAndSendSMS(request_id){
  try{
    // Find all new messages that reached their retry time
    const newMessages = await SmsLog.find({status: 5, req_id: request_id});
    if(newMessages && newMessages.length){
      var arr = []
      newMessages.forEach(async newMessage =>{
          arr.push([newMessage._id, newMessage.phone, newMessage.message])
      });

      await doWork(arr) 
      
    }else{
      console.log("no new message")
    }
  } catch (err) {
    console.log(err);
  }
}

app.get("/init",async (req,res)=>{
    try{
        console.log(`SMS Gateway is Running on port ${port} ...`)
        res.json({success:true, "message":"SMS gateway is running"})
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
})

app.get("/sendSMS",async (req,res)=>{
  var request_id = uuid.v1()
    try{
        //console.log("aid: "+req.query.aid, "pin: "+req.query.pin, "mnumber: "+req.query.mnumber, "signature: "+req.query.signature, "message: "+req.query.message)
        console.log(req.query)
        var phone = req.query.mnumber
        var message = req.query.message
        if(!phone || phone == "" || !message || message == "") {
            res.json({"responsecode": "1","response": "phone and message required"})
        }else{
          await smsLogController.createSMSLog(phone, message, 5, request_id).then((result) =>{
            res.json({"responsecode": "0","response": result})
            findAndSendSMS(request_id)
          }).catch((result) =>{
            console.log(result)
            res.sendStatus(500)
          })
        }
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
})

app.post("/sendSMS",async (req,res)=>{
  var request_id = uuid.v1()
    try{
        console.log(req.body)
        var phone = req.body.recipient
        var message = req.body.message
        if(!phone || phone == "" || !message || message == "") {
            res.json({"responsecode": "1","response": "phone and message required"})
        }else{
          await smsLogController.createSMSLog(phone, message, 5,request_id).then((result) =>{
            res.json({"responsecode": "0","response": result})
            findAndSendSMS(request_id)
          }).catch((result) =>{
            console.log(result)
            res.sendStatus(500)
          })
        }
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
})

app.post("/sendBulkSMS", async (req, res)=>{
  var request_id = uuid.v1()
    try{
        console.log(req.body)
        var phones = req.body.recipients
        var message_ = req.body.message

        if(!phones || phones.length == 0 || !message_ || message_ == "") {
            res.json({"responsecode": "1","response": "phones and message required"})
        }else{
            var arr = []
            phones.forEach(async phone_ =>{
                if(!(phone_ == "") && phone_) arr.push({phone: phone_, message: message_, status: 5, req_id: request_id})
            });
            if(arr.length > 0) {
              await smsLogController.createBulkSMSLog(arr).then((result) =>{
                res.json({"responsecode": "0","response": result})
                findAndSendSMS(request_id)
              }).catch((result) =>{
                console.log(result)
                res.sendStatus(500)
              })
            }
        }
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
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
      res.sendStatus(500)
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
    }else{
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500)
  }
});

app.post("/smsLog", async (req, res) => {
  try {
    var status_ = req.body.status
    var start = new Date(req.body.start+'T00:00:00.000Z').toISOString()
    var end = new Date(req.body.end+'T23:59:59.999Z').toISOString()

    // Validate if user exist in our database
    const smsLog = await SmsLog.find({status: status_, created_at: { $gte: start, $lte: end }});
    if (smsLog && smsLog.length) {
      res.status(200).json(smsLog);
    }else{
      res.status(200).send("No SMS log recoreded.");
    }
    
  } catch (err) {
    console.log(err);
    res.sendStatus(500)
  }
});

app.post("/smsCount", async (req, res) => {
  try {
    var status_ = req.body.status
    var start = new Date(req.body.start+'T00:00:00.000Z').toISOString()
    var end = new Date(req.body.end+'T23:59:59.999Z').toISOString()

    // Validate if user exist in our database
    const smsCount = await SmsLog.count({status: status_, created_at: { $gte: start, $lte: end }});
    if (smsCount > 0) {
      res.status(200).json(smsCount);
    }else{
      res.status(200).send("No SMS log recoreded.");
    }
    
  } catch (err) {
    console.log(err);
    res.sendStatus(500)
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

//Publish a failed message every 30 minutes. 
setInterval(async function() {
  try{
    let currentDate = new Date().toISOString();
    // Find all failed messages that reached their retry time
    const faildMessages = await SmsLog.find({ status: 1,  retry_at: { $lte: currentDate}});
    if(faildMessages && faildMessages.length){
      //console.log("failed message",faildMessages)
      var arr = []
      faildMessages.forEach(async faildMessage =>{
          arr.push([faildMessage._id, faildMessage.phone, faildMessage.message])
      });
      await doWork(arr)
    }else{
      console.log("no failed message")
    }
  } catch (err) {
    console.log(err);
  }
}, (1000*60*30));

module.exports = app;

