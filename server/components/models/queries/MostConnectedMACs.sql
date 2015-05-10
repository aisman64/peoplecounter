SELECT COUNT(*) count, macId
FROM MAC_SSID_Relation
GROUP BY macId
ORDER BY count DESC
LIMIT :limit;

# Query all SSIDs of some macId
-- SELECT * FROM MAC_SSID_Relation r
-- INNER JOIN SSID s
-- ON (r.ssidId = s.ssidId)
-- WHERE macId = :macId;