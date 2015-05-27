SELECT COUNT(*) count, r.macId AS macId, macAddress, macAnnotation, o.model AS model
FROM MAC_SSID_Relation r
INNER JOIN MACAddress a
ON (r.macId = a.macId)
LEFT OUTER JOIN OUI o
ON (a.ouiId = o.ouiId)
GROUP BY macId
ORDER BY count DESC
LIMIT 10;