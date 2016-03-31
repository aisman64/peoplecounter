/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

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
