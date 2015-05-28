SELECT p.macId macId, COUNT, LEAST(timeMin, MIN(s.time)) timeMin, GREATEST(timeMax, MAX(s.time)) timeMax, p.signalStrength signalStrength, m.macAddress macAddress, m.macAnnotation macAnnotation, o.model model
FROM (
	SELECT macId, signalStrength, COUNT(*) `count`, MIN(`time`) timeMin, MAX(`time`) timeMax
	FROM (
		SELECT macId, `time`, signalStrength
		FROM `WifiActivityPacket`
		WHERE `time` > UNIX_TIMESTAMP() - :timeFrameSeconds
		ORDER BY `time` DESC
	) p
	GROUP BY macId
) p
INNER JOIN `WifiSSIDPacket` s
	ON (p.macId = s.macId)
INNER JOIN `MACAddress` m
	ON (p.macId = m.macId)
INNER JOIN `OUI` o
	ON (m.ouiId = o.ouiId)
GROUP BY p.macId;