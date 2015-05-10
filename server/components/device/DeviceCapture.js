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

<<<<<<< HEAD
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
=======
            Private: {
                onClientBootstrap: function() {
                }
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                storePacket: function(packet) {
                    if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                    return this.Instance.WifiPacket.storePacket(packet);
                }
            },
        }
    }),
>>>>>>> aisman
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var pcap;
        var sys;
        var exec;
        var Queue;
        return {
            __ctor: function() {
                ThisComponent = this;
                pcap = require('pcap');
                sys = require('sys');
                exec = require('child_process').exec;
                Queue = require('file-queue').Queue;
            },

            /**
             * This method is called by DeviceMain, once we are logged into the server!
             */
            puts: function(error, stdout, stderr) {
                sys.puts(stdout); 
            }, 

<<<<<<< HEAD
                // this.storePackets(packets);
            },

            storePackets: function(packets) {
            	// send packet to server
                return this.host.storePackets(packets)
                .then(function() {
                	// DB successfully stored packet
                })
                .catch(function(err) {
                	// something went wrong... anything at all. We want to re-send the packets...
                	// e.g. connection error, exception thrown, DB problems
                });
=======
            storePackets: function(packets) {
                // send packet to server
                return this.host.storePackets(packets)
                .then(function() {
                    // DB successfully stored packet
                })
                .catch(function(err) {
                    queue.push(packet, function(err) { 
                        if(err) throw err; 
                        queue.length(function(err,len) { console.log(len); });
                    });
                });
            },
 
            structToMac: function(struct) {
                var result = "";
                for(var i = 0; i<6; i++)
                        {
                        l = struct[i].toString(16);
                        result += l.length === 1 ? '0' + l: l;
		        }
        	return result;
            },

            preCapture: function() {
	        exec("ntpdate -s ntp.nict.jp clock.tl.fukuoka-u.ac.jp clock.nc.fukuoka-u.ac.jp", ThisComponent.puts);
            	exec("ntp-wait -v", ThisComponent.puts);
                exec("iw phy phy0 interface add mon0 type monitor", ThisComponent.puts);
                exec("ifconfig mon0 up", ThisComponent.puts);
            },
            processPacket: function(packet) {
                var result = {};
                result.mac = ThisComponent.structToMac(packet.payload.ieee802_11Frame.shost.addr);
                result.mac = structToMac(packet.payload.ieee802_11Frame.shost.addr);
                result.signalStrength = packet.payload.signalStrength;
                result.time = packet.pcap_header.tv_sec+(packet.pcap_header.tv_usec/1000000);
                result.seqnum = packet.payload.ieee802_11Frame.fragSeq >> 4;
                result.ssid = packet.payload.ieee802_11Frame.probe.tags[0].ssid;
                ThisComponent.storePacket(result): 
            },
            startCapturing: function() {
                pcap_session = pcap.createSession("mon0", "wlan type mgt subtype probe-req");
                pcap_session.on('packet', function(raw_packet) { 
                        var packet = pcap.decode.packet(raw_packet);
                        ThisComponent.processPacket(packet);
                        });
>>>>>>> aisman
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
