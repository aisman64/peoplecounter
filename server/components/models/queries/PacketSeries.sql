SELECT FROM_UNIXTIME(FLOOR(p.time/ :timePeriod )*:timePeriod) as timeNearTo,COUNT(DISTINCT(p.macId)) as count, deviceId
FROM WifiSSIDPacket p
WHERE p.time > UNIX_TIMESTAMP() - :timeRangeFromNow
GROUP BY timeNearTo, deviceId
ORDER BY timeNearTo DESC
LIMIT 500;
