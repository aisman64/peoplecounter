SELECT deviceId, COUNT(DISTINCT macId) count
FROM `peoplecounter`.`WifiSSIDPacket` 
WHERE `time`>=(UNIX_TIMESTAMP()-30000000);