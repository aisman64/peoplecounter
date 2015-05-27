SELECT r.macId, macAddress, macAnnotation, o.model AS model, r.createdAt createdAt
FROM MAC_SSID_Relation r
INNER JOIN MACAddress a
ON (r.macId = a.macId)
LEFT OUTER JOIN OUI o
ON (a.ouiId = o.ouiId)
GROUP BY r.macId
ORDER BY r.createdAt DESC
LIMIT :limit;