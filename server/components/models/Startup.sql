/*DELIMITER $$

CREATE DEFINER=`root`@`%` PROCEDURE `store_packet`(
    IN mac CHAR(12), 
    IN sigstr INT,
    IN tstamp DECIMAL(16,6),
    IN seqn INT,
    IN ssid VARCHAR(32)
    )
BEGIN
DECLARE ct DATETIME DEFAULT 0;
DECLARE idMac INT DEFAULT 0;
DECLARE idSSID INT DEFAULT 0;
SET ct = NOW();
INSERT INTO MACAddress (mac, createdAt) VALUES(mac, ct)
    ON DUPLICATE KEY UPDATE macId=LAST_INSERT_ID(macId), updatedAt = ct;
SET idMac = LAST_INSERT_ID();
IF STRCMP(ssid, '') = 1 THEN
    INSERT INTO SSID (ssidName, createdAt) VALUES (ssid, ct)
        ON DUPLICATE KEY UPDATE ssidId=LAST_INSERT_ID(ssidId), updatedAt = ct;
    SET idSSID = LAST_INSERT_ID();
    INSERT INTO MAC_SSID_Relation (macId, ssidId) VALUES(idMac, idSSID)
        ON DUPLICATE KEY UPDATE relationId=LAST_INSERT_ID(relationId);
ELSE
    SET idSSID = NULL;
END IF;
INSERT INTO WifiPacket (time, signalStrength, seqnum, macId, ssidId, updatedAt)
    VALUES(tstamp, sigstr, seqn, idMac, idSSID, ct);
END*/
