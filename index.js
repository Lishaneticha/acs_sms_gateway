require("dotenv").config();
const express = require("express");
const app = express();
const { RABBIT_URI } = "amqp://localhost" || process.env;
const { API_PORT } = process.env;
const port = process.env.PORT || API_PORT;
const controller = require('./controllers/smsController');

app.use(express.json())
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: "100mb"}));
app.use(bodyParser.urlencoded({limit: "100mb", extended: true, parameterLimit:100000}));
app.listen(port,() => {
    console.log(`server is running on port ${port}`)
})

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

app.get("/sendSMS",async (req,res)=>{
    var result = ""
    try{
        //console.log("aid: "+req.query.aid, "pin: "+req.query.pin, "mnumber: "+req.query.mnumber, "signature: "+req.query.signature, "message: "+req.query.message)
        console.log(req.query)
        var phone = req.query.mnumber
        var message = req.query.message
        var arr = [[phone, message]]
        result = await depositToQueue(arr)
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
    res.json({"responsecode": "0","response": result})
})

app.post("/sendSMS",async (req,res)=>{
    var result = ""
    try{
        console.log(req.body)
        var phone = req.body.recipient
        var message = req.body.message
        var arr = [[phone, message]]
        result = await depositToQueue(arr)
    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
    res.json({"responsecode": "0","response": result})
})

app.post("/sendBulkSMS", async (req, res)=>{
    var result = ""
    try{
        console.log(req.body)
        var phones = req.body.recipients
        var message = req.body.message

        var arr = []

        phones.forEach(async phone =>{
            arr.push([phone, message])
        });

        result = await depositToQueue(arr)

    }catch(ex){
        console.log(ex)
        res.sendStatus(500)
    }
    res.json({"responsecode": "0","response": result})
})

