var config = require('../config/smsConfig') 
var smpp = require("smpp");

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
        var gsm = require('gsm');
        var info = gsm(message);
        
        var session = smpp.connect('smpp://'+connectionIp+":"+remotePort);
        //This is a unique id present in each message part
        var concat_ref = this.concat_ref++; 

        var part_id = 0;
        info.parts.forEach(async function(part) {
            part_id++;
            var udh = new Buffer(6);
            udh.write(String.fromCharCode(0x5), 0); //Length of UDF
            udh.write(String.fromCharCode(0x0), 1); //Indicator for concatenated message
            udh.write(String.fromCharCode(0x3), 2); //  Subheader Length ( 3 bytes)
            udh.write(String.fromCharCode(concat_ref), 3); //Same reference for all concatenated messages
            udh.write(String.fromCharCode(info.sms_count), 4); //Number of total messages in the concatenation
            udh.write(String.fromCharCode(part_id), 5); 
        var pdu = await session.bind_transceiver({ system_id:  username, password: password });
        // console.log("Line 29")
            if(pdu) {
                try{
                    if (pdu.command_status == 0 || pdu == true) {
                        console.log("Sending ...")
                        session.submit_sm({
                            destination_addr: recipient,         // To Phone Number
                            source_addr: shortcode,             // From Number or Sender ID
                            registered_delivery: 1, 
                            short_message: { udh:udh, message:part } , 
                        }, function(pdu) {
                            if (pdu.command_status == 0) {
                                console.log("message sent OK",recipient)
                                // res.json({"responsecode": "0","response": "Success"})
                                end_test_ts = Math.floor(new Date() / 1000)
                                session.destroy();
                                return true
                            } else {
                                console.log("PDU")
                                console.log(pdu)
                                console.log("message sending failed",recipient);
                                // res.json({"responsecode": "1","response": "Failed"})
                                end_test_ts = Math.floor(new Date() / 1000)
                                session.destroy();
                                return true
                                // process.exit()
                            }
                        });

                        session.on('deliver_sm', function(pdu) {
                            console.log(pdu)
                            if (pdu.esm_class == 4) {
                            var shortMessage = pdu.short_message;
                            console.log('Received DR: %s', shortMessage.trim());
                            session.send(pdu.response());
                            }
                        });

                        session.on('error', function(e) {
                            // empty callback to catch emitted errors to prevent exit due unhandled errors
                            if (e.code === "ETIMEDOUT") {
                                // TIMEOUT
                                console.log("TIMEOUT")
                                //res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                // res.json({"responsecode": "1","response": e.code})
                            } else if (e.code === "ECONNREFUSED") {
                                // CONNECTION REFUSED
                                console.log("CONNECTION REFUSED")
                                //res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                // res.json({"responsecode": "1","response": e.code})
                            } else {
                                // OTHER ERROR
                                console.log("OTHER ERROR")
                                // res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                // res.json({"responsecode": "1","response": e.code})
                            }
                        });
                        return true
                    }else{
                        console.log("pdu command status not 0")
                        session.destroy();
                        return false
                    }
                }catch(ex){
                    console.log(ex)
                    return false
                }
                // console.log("Pdu start",pdu)
                
            }else{
                return false
            }
        });
    } catch (ex) {
        console.log(ex)
        return false
    }
}

function sendBulkMessage(message,phones){
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
    var gsm = require('gsm');
    var info = gsm(message);
    
    var session = smpp.connect('smpp://'+connectionIp+":"+remotePort);

    var i = 0;
    var failed_phones = [];

    return new Promise(function(resolve, reject) {

        phones.forEach(async recipient =>{
            console.log(recipient+" sending ...")
            try {
                //This is a unique id present in each message part
                var concat_ref = this.concat_ref++; 
        
                var part_id = 0;
                info.parts.forEach(async function(part) {
                    part_id++;
                    var udh = new Buffer(6);
                    udh.write(String.fromCharCode(0x5), 0); //Length of UDF
                    udh.write(String.fromCharCode(0x0), 1); //Indicator for concatenated message
                    udh.write(String.fromCharCode(0x3), 2); //  Subheader Length ( 3 bytes)
                    udh.write(String.fromCharCode(concat_ref), 3); //Same reference for all concatenated messages
                    udh.write(String.fromCharCode(info.sms_count), 4); //Number of total messages in the concatenation
                    udh.write(String.fromCharCode(part_id), 5); 
                var pdu = await session.bind_transceiver({ system_id:  username, password: password });
                // console.log("Line 29")
                    if(pdu) {
                        try{
                            if (pdu.command_status == 0 || pdu == true) {
                                console.log("Sending ...")
                                session.submit_sm({
                                    destination_addr: recipient,         // To Phone Number
                                    source_addr: shortcode,             // From Number or Sender ID
                                    registered_delivery: 1, 
                                    short_message: { udh:udh, message:part } , 
                                }, function(pdu) {
                                    if (pdu.command_status == 0) {
                                        console.log("message sent OK",recipient)
                                        // res.json({"responsecode": "0","response": "Success"})
                                        end_test_ts = Math.floor(new Date() / 1000)
                                        session.destroy();
                                        // return true
                                    } else {
                                        console.log("PDU")
                                        console.log(pdu)
                                        console.log("message sending failed",recipient);
                                        // res.json({"responsecode": "1","response": "Failed"})
                                        end_test_ts = Math.floor(new Date() / 1000)
                                        session.destroy();
                                        // return false
                                        // process.exit()
                                    }
                                });
                                
                                session.on('deliver_sm', function(pdu) {
                                    console.log(pdu)
                                    if (pdu.esm_class == 4) {
                                    var shortMessage = pdu.short_message;
                                    console.log('Received DR: %s', shortMessage.trim());
                                    session.send(pdu.response());
                                    }
                                });

                                session.on('error', function(e) {
                                    i++//count
                                    // empty callback to catch emitted errors to prevent exit due unhandled errors
                                    if (e.code === "ETIMEDOUT") {
                                        // TIMEOUT
                                        //res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                        // res.json({"responsecode": "1","response": e.code})
                                        failed_phones.push(recipient)
                                        if(i == phones.length) resolve(failed_phones)
                                    } else if (e.code === "ECONNREFUSED") {
                                        // CONNECTION REFUSED
                                        console.log("CONNECTION REFUSED")
                                        //res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                        // res.json({"responsecode": "1","response": e.code})
                                        // return false
                                        failed_phones.push(recipient)
                                        if(i == phones.length) resolve(failed_phones)
                                    } else {
                                        // OTHER ERROR
                                        console.log("OTHER ERROR")
                                        // res.json({success:false, "phone": recipient, "code": e.code, "error message": e.message})
                                        // res.json({"responsecode": "1","response": e.code})
                                        // return 
                                        failed_phones.push(recipient)
                                        if(i == phones.length) resolve(failed_phones)
                                    }
                                });
                                // return true
                            }else{
                                console.log("pdu command status not 0")
                                session.destroy();
                                // return false
                            }
                        }catch(ex){
                            console.log(ex)
                            // return false
                        }
                        // console.log("Pdu start",pdu)
                        
                    }else{
                        // return false
                    }
                });
            } catch (ex) {
                console.log(ex)
                // return false
            }
        });

        
    })
}