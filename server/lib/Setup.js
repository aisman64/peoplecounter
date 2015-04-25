"use strict";

var fs = require('fs');
var path = require('path');

var NodeUtil = require('./NodeUtil');
var SequelizeUtil = require('./SequelizeUtil');
var appConfig = require('../appConfig');

var autoIpFname = 'auto_ip.txt';


var Setup = {
    // checkInstallation: function() {
    //     // check & init DB and when done, get external IP
    //     return SequelizeUtil.initModels()

    //     // write external IP to file
    //     .then(this.getIp.bind(this));
    // },

    // get external IP
    getIp: function() {
        // make sure that auto ip file exists (so setup at least won't fail)
        if (!fs.existsSync(autoIpFname)) {
            fs.writeFileSync(autoIpFname, 'localhost');
        }

        // get external IP
        NodeUtil.getExternalIp(function(err, ipAddr) {
            if (err) {
                throw new Error('Could not get external IP: ' + err.stack || err);
            }

            // write IP to file for Wiki
            fs.writeFileSync(autoIpFname, ipAddr);
        });
    }
};

module.exports = Setup;