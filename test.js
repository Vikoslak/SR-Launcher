const request = require('request');
const fs = require('fs');
var url = "http://localhost/srdownload/sr_patch01.tre";
var file = fs.createWriteStream("Z:\\SRTest\\sr_patch01.tre");
request(url).on('error', err => {
    process.send("download error " + err);
    file.close();
    fs.unlink(dest);
    if (cb) cb(err.message);
})
.on('close', e=>console.log('done'))
.pipe(file);
