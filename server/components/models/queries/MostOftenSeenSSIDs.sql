SELECT c count, ssidName 
FROM SSID
INNER JOIN (
	SELECT COUNT(*) c, ssidId s 
	FROM WifiPacket
	GROUP BY ssidId
	ORDER BY c DESC
	LIMIT :limit
) j
ON (s = ssidId)