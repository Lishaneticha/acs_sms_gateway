
const SmsLog = require("../model/smsLog");

exports.createSMSLog = async (phone, message, status, request_id)=>{
  return new Promise(async function(resolve, reject) {
    await SmsLog.create({phone: phone, message: message, status: status, req_id: request_id}).then(function(){
        console.log("Single Data created")  // Success
        resolve('Success')
    }).catch(function(error){
        console.log(error)      // Failure
        reject('Fail')
    });
  }) 
}

exports.createBulkSMSLog = async (msgArry)=>{
  return new Promise(async function(resolve, reject) {
    await SmsLog.insertMany(msgArry).then(function(){
        console.log("Bulk Data inserted")  // Success
        resolve('Success')
    }).catch(function(error){
        console.log(error)      // Failure
        reject('Fail')
    });
  })    
}

exports.updateSMSLog = async (id, status, retry_at, part_size)=>{
  SmsLog.findByIdAndUpdate(id, {status: status, retry_at: retry_at, part_size: part_size}, 
    function (err, docs) {
      if (err){
          console.log(err)
      }
      else{
          // console.log("phone updated: ", docs);
      }
    });
}
