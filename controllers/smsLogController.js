
const SmsLog = require("../model/smsLog");

exports.createSMSLog = async (phone, message, status, retry_at)=>{
    try {
    
        // Create smsLog in our database
        const smsLog = await SmsLog.create({
          phone: phone,
          message: message,
          status: status, 
          retry_at: retry_at,
        });
    
        console.log(smsLog)
      } catch (err) {
        console.log(err);
      }
}
