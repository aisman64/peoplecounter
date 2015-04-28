#!/bin/bash
. /peoplecounter/pc.cfg
if [ "$1" = 'start' ]; then
	host=`hostname`
	ntpdate -s ntp.nict.jp clock.tl.fukuoka-u.ac.jp clock.nc.fukuoka-u.ac.jp
	ntp-wait -v
	iw phy phy0 interface add mon0 type monitor
	ifconfig mon0 up
	tcpdump -n -N -q -i "$var2" -G 60 -w "/peoplecounter/pc_data/$dataset_$host_%s" -z gzip wlan type mgt subtype probe-req || wlan type mgt subtype probe-resp &
	exit
elif [ "$1" == 'stop' ]; then	
	killall -SIGINT tcpdump
	ifconfig mon0 down
	iw dev mon0 del
	exit
else
	echo "write ./monitor.sh start or ./monitor.sh stop for starting or stopping this program"
fi

