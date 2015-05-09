SELECT * FROM WifiPacket p
	INNER JOIN MACAddress m
	ON (p.macId = m.macId)
	INNER JOIN SSID s
	ON (p.ssidId = s.ssidId)
	WHERE macAddress = ":macAddress"
	ORDER BY `time`
	LIMIT :limit