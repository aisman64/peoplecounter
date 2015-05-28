SELECT a.macId macId, a.macAddress macAddress, a.macAnnotation macAnnotation, o.model model
FROM MACAddress a
LEFT OUTER JOIN OUI o
ON (a.ouiId = o.ouiId)
WHERE macAnnotation IS NOT NULL;
