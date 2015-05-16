SELECT COUNT(*) count, p.macId macId, macAddress
FROM WifiSSIDPacket p
INNER JOIN MacAddress a
ON (p.macId = a.macId)
GROUP BY macId
ORDER BY count DESC
LIMIT :limit;