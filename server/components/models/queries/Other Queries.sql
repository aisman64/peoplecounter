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
FROM WifiPacket
GROUP BY macId, seqnum, deviceId
HAVING c > 1
ORDER BY c DESC
LIMIT 10;