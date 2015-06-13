SELECT FROM_UNIXTIME(FLOOR(p.time/ :timePeriod )*:timePeriod,  '%Y-%m-%d %H:%i:%S') as timeNearTo,COUNT(DISTINCT(p.macId)) as count
FROM WifiSSIDPacket p
WHERE p.time > UNIX_TIMESTAMP() - (:timePeriod*25)
GROUP BY timeNearTo;
