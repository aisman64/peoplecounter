var sys = require('sys');
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout) }
exec("ntpdate -s ntp.nict.jp clock.tl.fukuoka-u.ac.jp clock.nc.fukuoka-u.ac.jp", puts);
exec("ntp-wait -v", puts);
exec("iw phy phy0 interface add mon0 type monitor", puts);
exec("ifconfig mon0 up", puts);
var pcap = require('pcap');
pcap_session = pcap.createSession("mon0", "wlan type mgt subtype probe-req");
pcap_session.on('packet', function(raw_packet) { 
	var packet = pcap.decode.packet(raw_packet);
	console.log(packet);
	});
