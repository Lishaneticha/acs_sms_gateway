// function resolveAfter2Seconds() {
//     return new Promise(resolve => {
//       setTimeout(() => {
//         resolve('resolved');
//       }, 2000);
//     });
//   }
  
//   async function asyncCall() {
//     console.log('calling');
//     const result = await resolveAfter2Seconds();
//     console.log(result);
//     // expected output: "resolved"
//   }
  
//   asyncCall();
  
var splitter = require('split-sms');
var gsm = require('gsm');
var info = splitter.split('Dear Lishan ET,\n\nThis is to inform you that your account 0000000110103 has been activated and now you can enjoy various services offered by our bank.\nFor more de');
var info1 = gsm('Dear Lishan ET,\n\nThis is to inform you that your account 0000000110103 has been activated and now you can enjoy various services offered by our bank.\nFor more details of the transaction, please contact your nearest Bank branch or call Phone Banking.\n\n\nRegards,\nAhadu Bank ፩');

// console.log(info.parts.length)
// info.parts.forEach(async function(part) {
//   console.log(part.content)
// })

// console.log(info)

// var part_id = 0
// var concat_ref = this.concat_ref++
// info.parts.forEach(async function(part) {
  // part_id++;
  // var udh = Buffer.alloc(6, 0, 'ascii');
  // udh.write(String.fromCharCode(0x5), 0); //Length of UDF
  // udh.write(String.fromCharCode(0x0), 1); //Indicator for concatenated message
  // udh.write(String.fromCharCode(0x3), 2); //  Subheader Length ( 3 bytes)
  // udh.write(String.fromCharCode(concat_ref), 3); //Same reference for all concatenated messages
  // udh.write(String.fromCharCode(info.parts.length), 4); //Number of total messages in the concatenation
  // udh.write(String.fromCharCode(part_id), 5); 
  // console.log( part.content, part.content.length)
// })

// info1.parts.forEach(async function(part) {
//   part_id++;
//   var udh = Buffer.alloc(6, 0, 'ascii');
//   udh.write(String.fromCharCode(0x5), 0); //Length of UDF
//   udh.write(String.fromCharCode(0x0), 1); //Indicator for concatenated message
//   udh.write(String.fromCharCode(0x3), 2); //  Subheader Length ( 3 bytes)
//   udh.write(String.fromCharCode(concat_ref), 3); //Same reference for all concatenated messages
//   udh.write(String.fromCharCode(info1.sms_count), 4); //Number of total messages in the concatenation
//   udh.write(String.fromCharCode(part_id), 5); 
//   // console.log(udh, part, part.length, 'gsm')
// })

var TD = "20220816T15:06:56"
console.log(new Date(TD.substring(0,4)+"-"+TD.substring(4,6)+"-"+TD.substring(6,8)+""+TD.substring(8,TD.length)))
console.log(new Date("2022-08-16T15:06:56"))

