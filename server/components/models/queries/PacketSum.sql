SELECT FROM_UNIXTIME(p.time -p.time%:timePeriod,  '%Y-%m-%d %H:%i:%S') as timeNearTo,COUNT(DISTINCT(p.macId)) as count
FROM WifiSSIDPacket p
WHERE p.time > UNIX_TIMESTAMP() - (:timePeriod*:pointLimit)
GROUP BY timeNearTo;
