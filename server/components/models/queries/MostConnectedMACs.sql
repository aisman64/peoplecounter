SELECT COUNT(*) count, r.macId as macId, macAddress
FROM MAC_SSID_Relation r
INNER JOIN MacAddress a
ON (r.macId = a.macId)
GROUP BY macId
ORDER BY count DESC
LIMIT :limit;