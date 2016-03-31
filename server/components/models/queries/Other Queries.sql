
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
# Get graph of small depth and starting at given macId
SELECT m1.ssidId, m2.macId, ssidName
FROM mac_ssid_relation m1
INNER JOIN mac_ssid_relation m2
	ON (m1.ssidId = m2.ssidId)
INNER JOIN SSID s
	ON (m1.ssidId = s.ssidId)
WHERE m1.macId = 20 AND ssidName != '';



# Get some graphs of small depth and "interesting size"
SELECT *
FROM (
	SELECT COUNT(*) c, macId, ssidId, macId2, ssidName
	FROM (
		SELECT m1.macId macId, m1.ssidId ssidId, m2.macId macId2, ssidName
		FROM mac_ssid_relation m1
		INNER JOIN mac_ssid_relation m2
			ON (m1.ssidId = m2.ssidId)
		INNER JOIN SSID s
			ON (m1.ssidId = s.ssidId)
		WHERE ssidName != 'csie'
	) g
	GROUP BY macId
) g2
WHERE c > 100;



# Get all relations with ssidName
SELECT *
FROM mac_ssid_relation r
INNER JOIN (SELECT ssidId, ssidName FROM SSID) s
	ON (r.ssidId = s.ssidId);


# Get all number of SSIDs for each macId, given they have at least the given amount
SELECT COUNT(*) c, r.macId, ssidName
FROM (SELECT DISTINCT macId FROM mac_ssid_relation) r2
INNER JOIN mac_ssid_relation r
	ON (r.macId = r2.macId)
INNER JOIN (SELECT ssidId, ssidName FROM SSID) s
	ON (r.ssidId = s.ssidId)
WHERE ssidName != ''
GROUP BY r.macId
HAVING c > 3;


# Get pairs of MAC addresses with the greatest amount of common networks


# Hone in on echos (same packet received many times)
SELECT macId, seqnum, deviceId, COUNT(*) c
FROM WifiSSIDPacket
GROUP BY macId, seqnum, deviceId
HAVING c > 1
ORDER BY c DESC
LIMIT 10;
