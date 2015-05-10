SELECT c count, ssidName 
FROM SSID
INNER JOIN (
	SELECT COUNT(*) c, ssidId s 
	FROM MAC_SSID_Relation
	GROUP BY ssidId
	ORDER BY c DESC
	LIMIT :limit
) j
ON (s = ssidId)
WHERE ssidName IS NOT NULL AND ssidName != '';