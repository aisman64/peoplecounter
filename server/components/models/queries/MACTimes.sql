SELECT macId, MIN(time) min, MAX(time) max
FROM WifiSSIDPacket
GROUP BY macId