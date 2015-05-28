SELECT *
FROM (
	SELECT *
	FROM WifiSSIDPacket p
	ORDER BY time DESC
	LIMIT 50
) p
INNER JOIN MACAddress a
	ON (p.macId = a.macId)
INNER JOIN OUI o
	ON (a.ouiId = o.ouiId)
LEFT JOIN SSID s
	ON (s.ssidId = p.ssidId);