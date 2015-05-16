/**
 * Kicks off device code!
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Includes: [
        // add all device-only components here
    ],

    /**
     * Everything defined in `Base` is available on Host and Client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { return {
        /**
         * 
         */
        initBase: function() {
            
        },
    };}),

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        return {
            __ctor: function() {
            },
            initHost: function() {
            },

        Private: {
            onClientBootstrap: function() {
            }
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            storePacket: function(packet) {
            	var user = this.Instance.User.currentUser;
                if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                var device = this.Instance.DeviceMain.getCurrentDevice();
                if (!device) {
                	// internal error: something went wrong in our authentication process
                	throw new Error('Device was logged in with its user account, but device entry was not ready: ' +
                		user.userName);
                }

                // TODO: Dataset management (must be controlled in front-end)
                // Shared.WifiDataSet...
                // this.Instance.WifiDataSet...
                
                // insert everything, and wait for it all to finish
                //return Promise.map(packets, function(packet) {
                // add deviceId to packet
                packet.deviceId = device.deviceId;

                // TODO: run findOrCreate on SSID and MACAddress, and only store their ids in WifiSSIDPacket table

                // insert packet into DB
                // make sure, the fields of `packet` match the table definition in WifiSSIDPacket (sequelize.define)
                // see: http://sequelize.readthedocs.org/en/latest/api/model/index.html#createvalues-options-promiseinstance
                //return Shared.WifiSSIDPacket.Model.create(packet);
                //});

                // call stored procedure to take care of packet insertion
                return sequelize.query('CALL storePacket(?, ?, ?, ?, ?, ?);', { 
                    replacements: [
                        packet.mac,
                        packet.signalStrength,
                        packet.time,
                        packet.seqnum,
                        packet.ssid,
                        packet.deviceId
                    ],
                    type: sequelize.QueryTypes.RAW
                });
                // .spread(function() {

                // });
            }
        },
    }}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var pcap;
        var sys;
        var exec;
        var Queue;
        var queue;
        var promisify = require("promisify-node");
        return {
            __ctor: function() {
                ThisComponent = this;
                try {
                    pcap = require('pcap');
                }
                catch (err) {
                    console.error('[ERROR] pcap is not available');
                }
                sys = require('sys');
                exec = require('child_process').exec;
                Queue = require('file-queue').Queue;
            },

            /**
             * This method is called by DeviceMain, once we are logged into the server!
             */

            storePacket: function(packet) {
                // send packet to server
                return this.host.storePacket(packet)
                .then(function() {
                    console.log("Packet sent successfully");
                    // DB successfully stored packet
                })
                .catch(function(err) {
                    console.error(err.stack);
                    queue.push(packet, function(err) { 
                        if(err) throw err; 
                        queue.length(function(err,len) { console.log(len); });
                    });
                });
            },
 
            structToMac: function(struct) {
                var result = "";
                var l;
                for(var i = 0; i<6; i++)
                        {
                        l = struct[i].toString(16);
                        result += l.length === 1 ? '0' + l: l;
		        }
        	   return result;
            },


            preCapture: function() {
                return Promise.join(
	            Instance.DeviceMain.execAsync("/usr/sbin/ntpdate -s ntp.nict.jp clock.tl.fukuoka-u.ac.jp clock.nc.fukuoka-u.ac.jp")
                        .catch(function(err) {
                        //    console.log(err.stack || err); 
                        }),
            	    Instance.DeviceMain.execAsync("ntp-wait -v")
                        .catch(function(err) {
                        //    console.log(err.stack || err); 
                        }),
                    Instance.DeviceMain.execAsync("iw phy phy0 interface add mon0 type monitor")
                        .catch(function(err) {
                        //    console.log(err.stack || err); 
                        }),
                    Instance.DeviceMain.execAsync("ifconfig mon0 up")
                        .catch(function(err) {
                         //   console.log(err.stack || err); 
                        }),
                    new Promise(function(resolve, reject) {  
                        queue = new Queue('tmp/', function(err, stdout, stderr) {
                            if(err)
                                reject(err);
                            else
                                resolve();
                        });
                    })
                );
            },

            processPacket: function(packet) {
                var result = {};
                result.mac = ThisComponent.structToMac(packet.payload.ieee802_11Frame.shost.addr);
                result.signalStrength = packet.payload.signalStrength;
                result.time = packet.pcap_header.tv_sec+(packet.pcap_header.tv_usec/1000000);
                result.seqnum = packet.payload.ieee802_11Frame.fragSeq >> 4;
                result.ssid = packet.payload.ieee802_11Frame.probe.tags[0].ssid;
                ThisComponent.storePacket(result);
            },

            basicProcessor: function(packet) {
                var result = {};
                result.signalStrength = packet.payload.signalStrength;
                result.mac = ThisComponent.structToMac(packet.payload.ieee802_11Frame.shost.addr);
                result.seqnum = packet.payload.ieee802_11Frame.fragSeq >> 4;
                result.time = packet.pcap_header.tv_sec+(packet.pcap_header.tv_usec/1000000);
                if(result.signalStrength >= -15)
                    console.log(result.mac);
                    //ThisComponent.storePacket(result);
            },


            flushQueue: function() {
                console.log("Flush Queue");
                var dummies = [];
                exec("ls tmp/new/*.galileo | wc -l", function(error, stdout, stderr) {
                    var length = parseInt(stdout);
                    for(var i=0; i<length; i++)
                        {
                        dummies.push(0);
                        }
                    return Promise.map(dummies, function(dummy) {
                        return new Promise(function(resolve, reject) {
                            queue.tpop(function(err, packet, commit, rollback) {
                                if (err)
                                    {
                                    reject(err);
                                    }
                                ThisComponent.host.storePacket(packet)
                                .then(function() {
                                    commit(function(err) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            console.log("Stored Packet Uploaded");
                                            resolve();
                                        }
                                    });
                                })
                                .catch(function(err) {
                                    rollback(function(err2) {
                                        if (err2) {
                                            console.error('[ERROR] Unable to rollback: ' + err2.stack);
                                        }
                                        reject(err);
                                    });
                                });
                            });
                        });
                    }, {
                        concurrency: 5              // how many packets in-flight, at the same time
                    });
                });

                /*queue.length(function(err, length) {
                    for(var i=0; i<5; i++) {
                        queue.tpop(function(err, packet, commit, rollback) {
                            ThisComponent.host.storePacket(packet)
                                .then(function() { commit(function(err) { if(err) throw err; console.log("Stored Packet uploaded");})})
                                .catch(function() { rollback(function(err) { if (err) throw err; console.log("Stored Packet Problem");})});
                        }); 
                    }
                });*/
            },

            startCapturing: function(device) {
                if (!pcap) return;
                if (this.isCapturing) return;   // don't do anything

                this.isCapturing = true;
                console.log('[STATUS] Starting capturing...');

                ThisComponent.preCapture()
                .then(function() {
                    var jobType = Instance.WifiSnifferDevice.DeviceJobType;
                    var pcap_session;
                    if(device.currentJobType == jobType.ActivitySniffer) {
                        pcap_session = pcap.createSession("mon0", "wlan type mgt || wlan type data");
                        pcap_session.on('packet', function(raw_packet) {
                            var packet = pcap.decode.packet(raw_packet);
                            ThisComponent.basicProcessor(packet); 
                        });   
                    }
                    else {
                        pcap_session = pcap.createSession("mon0", "wlan type mgt subtype probe-req");
                        pcap_session.on('packet', function(raw_packet) { 
                            var packet = pcap.decode.packet(raw_packet);
                            ThisComponent.processPacket(packet);
                        });
                    }
                });
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});
