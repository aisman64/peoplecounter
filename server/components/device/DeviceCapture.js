/**
 * Capture device packets, send them to server and store them.
 * Queue and re-send them later if not connected.
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
                packet.deviceId = device.deviceId;
                // call stored procedure to take care of packet insertion
                return sequelize.query('CALL storePacket(?, ?, ?, ?, ?, ?);', { 
                    replacements: [
                        packet.mac,
                        packet.signalStrength,
                        packet.time,
                        packet.seqnum,
                        packet.ssid || '',
                        packet.deviceId
                    ],
                    type: sequelize.QueryTypes.RAW
                });
                // .spread(function() {

                // });
            },
            storePacket2: function(packet) {
            	var user = this.Instance.User.currentUser;
                if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                var device = this.Instance.DeviceMain.getCurrentDevice();
                if (!device) {
                	// internal error: something went wrong in our authentication process
                	throw new Error('Device was logged in with its user account, but device entry was not ready: ' +
                		user.userName);
                }
                packet.deviceId = device.deviceId;
                // call stored procedure to take care of packet insertion
                return sequelize.query('CALL storePacket2(?, ?, ?, ?, ?);', { 
                    replacements: [
                        packet.mac,
                        packet.signalStrength,
                        packet.time,
                        packet.seqnum,
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
        var promisify;

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
                promisify = require("promisify-node");
            },

            /**
             * Send packet to server or put in queue, if we failed.
             */
            storePacket: function(packet) {
                // send packet to server
                return this.host.storePacket(packet)
                .then(function() {
                    Instance.DeviceLog.logStatus("packet sent successfully!");
                    // DB successfully stored packet
                })
                .catch(function(err) {
                    Instance.DeviceLog.logError('storePacket on Host failed - ' + err.stack, true);

                    // could not send packet to server -> Store in queue...
                    return new Promise(function(resolve, reject) {
                        queue.push(packet, function(err) {
                            if(err) reject(err);
                            else {
                                // TODO: Why query length here?
                                queue.length(function(err,len) { console.log(len); });
                                resolve();
                            }
                        });  
                    });
                });
            },
 
            storePacket2: function(packet) {
                // send packet to server
                return this.host.storePacket2(packet)
                .then(function() {
                    Instance.DeviceLog.logStatus("packet2 sent successfully!");
                    // DB successfully stored packet
                })
                .catch(function(err) {
                    Instance.DeviceLog.logError('storePacket2 on Host failed - ' + err.stack, true);

                    // could not send packet to server -> Store in queue...
                    return new Promise(function(resolve, reject) {
                        queue.push(packet, function(err) {
                            if(err) reject(err);
                            else {
                                // TODO: Why query length here?
                                queue.length(function(err,len) { console.log(len); });
                                resolve();
                            }
                        });  
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
                            Instance.DeviceLog.logError('ntpdate failed - ' + err.stack || err, true); 
                        }),
            	    Instance.DeviceMain.execAsync("ntp-wait -v")
                        .catch(function(err) {
                            Instance.DeviceLog.logError('ntp-wait failed - ' + err.stack || err, true); 
                        }),
                    Instance.DeviceMain.execAsync("iw phy phy0 interface add mon0 type monitor")
                        .catch(function(err) {
                            Instance.DeviceLog.logError('iw failed - ' + err.stack || err, true); 
                        }),
                    Instance.DeviceMain.execAsync("ifconfig mon0 up")
                        .catch(function(err) {
                            Instance.DeviceLog.logError('ifconfig failed - ' + err.stack || err, true); 
                        }),
                    new Promise(function(resolve, reject) {  
                        queue = new Queue('tmp/', function(err, stdout, stderr) {
                            if(err) return reject(err);
                            ThisComponent.flushQueue();
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
                return ThisComponent.storePacket(result);
            },

            basicProcessor: function(packet) {
                var result = {};
                result.signalStrength = packet.payload.signalStrength;
                result.mac = ThisComponent.structToMac(packet.payload.ieee802_11Frame.shost.addr);
                result.seqnum = packet.payload.ieee802_11Frame.fragSeq >> 4;
                result.time = packet.pcap_header.tv_sec+(packet.pcap_header.tv_usec/1000000);
                if(packet.payload.signalStrength >= -50) {
                    return ThisComponent.storePacket2(result);
                }
            },


            flushQueue: function() {
                Instance.DeviceLog.logStatus('flushQueue', true);
                var dummies = [];
                queue.length(function(err, length) {
                    if (!length) return;
                    
                    for(var i=0; i<length; i++) {
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
                                            resolve();
                                        }
                                    });
                                })
                                .catch(function(err) {
                                    rollback(function(err2) {
                                        if (err2) {
                                            Instance.DeviceLog.logError('Unable to rollback: ' + err2.stack, true);
                                        }
                                        //reject(err);
                                        resolve();
                                    });
                                });
                            });
                        });
                    }, {
                        concurrency: 5              // how many packets in-flight, at the same time
                    })
                    .then(function() {
                        Instance.DeviceLog.logStatus('DeviceCapture file queue flushed!', true);
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
                Instance.DeviceLog.logStatus('Preparing DeviceCapture...', true);

                ThisComponent.preCapture()
                .then(function() {
                    Instance.DeviceLog.logStatus('Starting DeviceCapture...', true);

                    var device = Instance.DeviceMain.getCurrentDevice(); 
                    var jobType = Instance.WifiSnifferDevice.DeviceJobType;
                    var pcap_session;
                    if(device.currentJobType == jobType.ActivitySniffer) {
                        pcap_session = pcap.createSession("mon0", "wlan type mgt");
                        pcap_session.on('packet', function(raw_packet) {
                            return Promise.resolve()
                            .then(function() {
                                var packet = pcap.decode.packet(raw_packet);
                                return ThisComponent.basicProcessor(packet);
                            });
                        });
                    }
                    else {
                        pcap_session = pcap.createSession("mon0", "wlan type mgt subtype probe-req");
                        pcap_session.on('packet', function(raw_packet) { 
                            return Promise.resolve()
                            .then(function() {
                                var packet = pcap.decode.packet(raw_packet);
                                return ThisComponent.processPacket(packet);
                            })
                            .catch(function(err) {
                                Instance.DeviceLog.logError('DeviceCapture.processPacket failed  - ' + err.stack, true);
                            });
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
