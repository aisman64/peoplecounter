SELECT FROM_UNIXTIME(FLOOR(p.time/ :timePeriod )*:timePeriod) as timeNearTo,COUNT(DISTINCT(p.macId)) as count, deviceId
FROM WifiSSIDPacket p
WHERE p.time > UNIX_TIMESTAMP() - (:timePeriod*100)
GROUP BY timeNearTo, deviceId
ORDER BY timeNearTo DESC;
