SELECT p.macId macId, timeMin, timeMax, m.macAddress macAddress, m.macAnnotation macAnnotation, o.model model
FROM (
	SELECT p.macId macId, MIN(p.time) timeMin, MAX(p.time) timeMax
	FROM `WifiSSIDPacket` p
	INNER JOIN (
		SELECT DISTINCT macId
		FROM `WifiActivityPacket`
		WHERE `time` > UNIX_TIMESTAMP() - :timeFrameSeconds
		ORDER BY `time` DESC
	) pp
		ON (p.macId = pp.macId)
	GROUP BY p.macId
) p
INNER JOIN `MACAddress` m
	ON (p.macId = m.macId)
INNER JOIN `OUI` o
	ON (m.ouiId = o.ouiId);