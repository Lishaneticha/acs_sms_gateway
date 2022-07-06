var config = require('../config/smsConfig') 
var smpp = require("smpp");
var moment = require('moment');
const controller = require('./smsLogController');

exports.sendSMS = function (recipient, message){
    try {
        // connectionIp: remote Ip for sms
        // remotePort remote port
        // username: tele username
        // password: tele's password
        // shortcode: company shortcode

        var connectionIp = config.connectionIp
        var remotePort = config.remotePort
        var username = config.username
        var password = config.password
        var shortcode = config.shortcode
        // var gsm = require('gsm');
        var splitter = require('split-sms');
        
        var info = splitter.split(message);
        
        var session = smpp.connect('smpp://'+connectionIp+":"+remotePort);
        //This is a unique id present in each message part
        var concat_ref = this.concat_ref++; 

        var part_id = 0;
        var i = 0;
        info.parts.forEach(async function(part) {
            part_id++;
            var udh = Buffer.alloc(6);
            udh.write(String.fromCharCode(0x5), 0); //Length of UDF
            udh.write(String.fromCharCode(0x0), 1); //Indicator for concatenated message
            udh.write(String.fromCharCode(0x3), 2); //  Subheader Length ( 3 bytes)
            udh.write(String.fromCharCode(concat_ref), 3); //Same reference for all concatenated messages
            udh.write(String.fromCharCode(info.parts.length), 4); //Number of total messages in the concatenation
            udh.write(String.fromCharCode(part_id), 5); 
        var pdu = await session.bind_transceiver({ system_id:  username, password: password });
        // console.log("Line 29")
            if(pdu) {
                try{
                    if (pdu.command_status == 0 || pdu == true) {
                        console.log("Sending ...")

                        if(info.parts.length == 1){
                            session.submit_sm({
                                destination_addr: recipient,         // To Phone Number
                                source_addr: shortcode,             // From Number or Sender ID
                                registered_delivery: 1, 
                                short_message: { message:part.content } , 
                            }, function(pdu) {
                                if (pdu.command_status == 0) {
                                    console.log("message sent OK",recipient, part.content)
                                    // res.json({"responsecode": "0","response": "Success"})
                                    return true
                                } else {
                                    console.log("PDU")
                                    console.log(pdu)
                                    console.log("message sending failed",recipient);
                                    // res.json({"responsecode": "1","response": "Failed"})
                                    var retry_at = moment(new Date()).add(30, 'm').toDate();
                                    controller.createSMSLog(recipient, message, 1, retry_at)
                                    session.destroy();
                                    return true
                                    // process.exit()
                                }
                            });
                        }else{
                            session.submit_sm({
                                destination_addr: recipient,         // To Phone Number
                                source_addr: shortcode,             // From Number or Sender ID
                                registered_delivery: 1, 
                                short_message: { udh:udh, message:part.content } , 
                            }, function(pdu) {
                                if (pdu.command_status == 0) {
                                    i++
                                    console.log("message sent OK",recipient, part.content)
                                    // res.json({"responsecode": "0","response": "Success"})
                                    return true
                                } else {
                                    i++
                                    console.log("PDU")
                                    console.log(pdu)
                                    console.log("message sending failed",recipient);
                                    // res.json({"responsecode": "1","response": "Failed"})
                                    if(i == info.parts.length) {
                                        var retry_at = moment(new Date()).add(30, 'm').toDate();
                                        controller.createSMSLog(recipient, message, 1, retry_at)
                                    }
                                    session.destroy();
                                    return true
                                    // process.exit()
                                }
                            });
                        }

                        session.on('deliver_sm', function(pdu) {
                            // console.log(pdu)
                            var retry_at = null
                            if (pdu.esm_class == 4) {
                                // var shortMessage = pdu.short_message;
                                console.log('Received DR ...');
                                session.send(pdu.response());
                                controller.createSMSLog(recipient, part.content, 3, retry_at)
                            }else{
                                controller.createSMSLog(recipient, part.content, 0, retry_at)
                            }

                            session.destroy();
                        });

                        session.on('error', function(e) {
                            i++
                            // empty callback to catch emitted errors to prevent exit due unhandled errors
                            if (e.code === "ETIMEDOUT") {
                                // TIMEOUT
                                console.log("TIMEOUT")
                                //res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                // res.json({"responsecode": "1","response": e.code})
                                if(i == info.parts.length) {
                                    var retry_at = moment(new Date()).add(30, 'm').toDate();
                                    controller.createSMSLog(recipient, message, 1, retry_at)
                                }
                            } else if (e.code === "ECONNREFUSED") {
                                // CONNECTION REFUSED
                                console.log("CONNECTION REFUSED")
                                //res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                // res.json({"responsecode": "1","response": e.code})
                                if(i == info.parts.length) {
                                    var retry_at = moment(new Date()).add(30, 'm').toDate();
                                    controller.createSMSLog(recipient, message, 1, retry_at)
                                }
                            } else {
                                // OTHER ERROR
                                console.log("OTHER ERROR")
                                // res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                // res.json({"responsecode": "1","response": e.code})
                                if(i == info.parts.length) {
                                    var retry_at = moment(new Date()).add(30, 'm').toDate();
                                    controller.createSMSLog(recipient, message, 1, retry_at)
                                }
                            }
                        });
                        return true
                    }else{
                        console.log("pdu command status not 0")
                        i++
                        if(i == info.parts.length) {
                            var retry_at = moment(new Date()).add(30, 'm').toDate();
                            controller.createSMSLog(recipient, message, 1, retry_at)
                        }
                        session.destroy();
                        return false
                    }
                }catch(ex){
                    var retry_at = moment(new Date()).add(30, 'm').toDate();
                    controller.createSMSLog(recipient, message, 1, retry_at)
                    console.log(ex)
                    return false
                }
                // console.log("Pdu start",pdu)
                
            }else{
                var retry_at = moment(new Date()).add(30, 'm').toDate();
                controller.createSMSLog(recipient, message, 1, retry_at)
                return false
            }
        });
    } catch (ex) {
        var retry_at = moment(new Date()).add(30, 'm').toDate();
        controller.createSMSLog(recipient, message, 1, retry_at)
        console.log(ex)
        return false
    }
}