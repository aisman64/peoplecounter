	SELECT deviceId, COUNT(DISTINCT macId) count
	FROM `peoplecounter`.`WifiSSIDPacket` 
	WHERE :includeDevices AND `time`>=(UNIX_TIMESTAMP()- :timeFrameSeconds)
	GROUP BY `deviceId`
UNION
	SELECT 0 deviceId, COUNT(DISTINCT macId) count
	FROM `peoplecounter`.`WifiSSIDPacket` 
	WHERE `time`>=(UNIX_TIMESTAMP()- :timeFrameSeconds)
;