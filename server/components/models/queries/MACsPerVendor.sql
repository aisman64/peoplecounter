(
	SELECT model vendor, SUM(count) macCount
	FROM (
		SELECT ouiId, COUNT(*) count, createdAt createdAt
		FROM MACAddress
		WHERE createdAt > :since
		GROUP BY ouiId
	 	ORDER BY count DESC
	) a
	INNER JOIN OUI o
		ON (o.ouiId = a.ouiId)
	GROUP BY model
)

UNION

(
	SELECT '' as vendor, COUNT(*) macCount
	FROM MACAddress
	WHERE createdAt > :since AND (ouiId = 0 OR ouiId IS NULL)
)
ORDER BY macCount DESC

# STR_TO_DATE('2015-05-30 00:00:00', '%Y-%m-%d %H:%i:%s')