/**
 * TODO: Migrate to server/components/device/DeviceCapture component
 */
"use strict";

var pcap = require('pcap');
var sys = require('sys');
var exec = require('child_process').exec;
var Queue = require('file-queue').Queue;

function puts(error, stdout, stderr) 
	{ 
	sys.puts(stdout); 
	}

function start()
	{
	exec("ntpdate -s ntp.nict.jp clock.tl.fukuoka-u.ac.jp clock.nc.fukuoka-u.ac.jp", puts);
	exec("ntp-wait -v", puts);
	exec("iw phy phy0 interface add mon0 type monitor", puts);
	exec("ifconfig mon0 up", puts);
	}

function structToMac(struct)
	{
	var result = "";
	for(var i = 0; i<6; i++)
		{
		l = struct[i].toString(16);
		result += l.length === 1 ? '0' + l: l;
		}
	return result;
	}

function capture()
	{
	pcap_session = pcap.createSession("mon0", "wlan type mgt subtype probe-req");
	pcap_session.on('packet', function(raw_packet) { 
		var packet = pcap.decode.packet(raw_packet);
		queue.push(packet, 
			function(err) { 
				if(err) throw err; 
				queue.length(function(err,len) { console.log(len); });
			});
		//console.log(packet);
		//console.log(structToMac(packet.payload.ieee802_11Frame.shost.addr));
		});
	}

start();
queue = new Queue('tmp/', capture);
