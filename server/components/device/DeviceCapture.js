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
            storePackets: function(packets) {
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
                return Promise.map(packets, function(packet) {
	                // add deviceId to packet
	                packet.deviceId = device.deviceId;

	                // TODO: run findOrCreate on SSID and MACAddress, and only store their ids in WifiPacket table

                    // insert packet into DB
                    // make sure, the fields of `packet` match the table definition in WifiPacket (sequelize.define)
                    // see: http://sequelize.readthedocs.org/en/latest/api/model/index.html#createvalues-options-promiseinstance
                    return Shared.WifiPacket.Model.create(packet);
                });
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

            storePackets: function(packets) {
                // send packet to server
                return this.host.storePackets(packets)
                .then(function() {
                    // DB successfully stored packet
                })
                .catch(function(err) {
                    queue.push(packets[0], function(err) { 
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
            execAsync: function(cmd) {
                return new Promise(function(resolve, reject) {
                    exec(cmd, function(err, stdout, stderr) {
                        if(err) {
                            console.log(stdout);
                            console.log(stderr);
                            //reject(err);
                            resolve();
                        }
                        else {
                            console.log(stdout);
                            console.log(stderr);
                            resolve();
                        }
                    });
                });       
            },
            preCapture: function() {
                return Promise.join(
	            ThisComponent.execAsync("/usr/sbin/ntpdate -s ntp.nict.jp clock.tl.fukuoka-u.ac.jp clock.nc.fukuoka-u.ac.jp"),
            	    ThisComponent.execAsync("ntp-wait -v"),
                    ThisComponent.execAsync("iw phy phy0 interface add mon0 type monitor"),
                    ThisComponent.execAsync("ifconfig mon0 up"),
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
                ThisComponent.storePackets([result]);
            },
            startCapturing: function() {
                if (!pcap) return;
                ThisComponent.preCapture()
                .then(function() {
                    var pcap_session = pcap.createSession("mon0", "wlan type mgt subtype probe-req");
                    pcap_session.on('packet', function(raw_packet) { 
                        var packet = pcap.decode.packet(raw_packet);
                        ThisComponent.processPacket(packet);
                    });
                });
            },

            onCurrentUserChanged: function(privsChanged) {

            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});
