SELECT FROM_UNIXTIME(FLOOR(p.time/ :timePeriod )*:timePeriod) as timeNearTo,COUNT(DISTINCT(p.macId)) as count
FROM WifiPacket p
WHERE p.time > UNIX_TIMESTAMP() - :timeRangeFromNow AND deviceId = :deviceId
GROUP BY timeNearTo
ORDER BY timeNearTo DESC
LIMIT 100;
