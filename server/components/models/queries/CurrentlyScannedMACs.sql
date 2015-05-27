SELECT p.macId macId, count, MIN(s.time) timeMin, MAX(s.time) timeMax, m.macAddress macAddress, m.macAnnotation macAnnotation, o.model model
FROM (
	SELECT macId, COUNT(*) count
	FROM `WifiActivityPacket` p
	WHERE p.time > UNIX_TIMESTAMP() - :timeFrameSeconds
	GROUP BY macId
) p
INNER JOIN `WifiSSIDPacket` s
	ON (p.macId = s.macId)
INNER JOIN `MACAddress` m
	ON (p.macId = m.macId)
INNER JOIN `OUI` o
	ON (m.ouiId = o.ouiId)
GROUP BY p.macId;