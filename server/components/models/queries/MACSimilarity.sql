
/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */
# Compute measure of "connectedness" for MAC addresses
#     see: http://spirit.cs.ucdavis.edu/pubs/conf/Ningning_MILCOM12.pdf
SET div_precision_increment = 12;
SET @totalCount := (SELECT DISTINCT COUNT(ssidId) FROM MAC_SSID_Relation);

# 98fe94cd9440

# get macIds m1 and m2
SET @m1 := (SELECT macId FROM MACAddress WHERE macAddress = :macAddress1);
SET @m2 := (SELECT macId FROM MACAddress WHERE macAddress = :macAddress2);

DROP FUNCTION IF EXISTS computeBetaSumOfSquares;
DELIMITER $$
CREATE FUNCTION computeBetaSumOfSquares(m INT UNSIGNED) RETURNS DECIMAL(30, 12)
BEGIN
    DECLARE betaSumOfSquares DECIMAL(30, 12);

    # compute the sum of squares of for macId m (beta_x)
    SELECT SUM(betaSquared)
    FROM (
        SELECT * 
        FROM (
            # get all SSIDs of m
            SELECT DISTINCT r1.ssidId AS `r1.ssidId`
            FROM MAC_SSID_Relation r1
            WHERE macId = m
        ) r1
        INNER JOIN (
            # compute all sums of squares of betas of all SSIDs of m
            SELECT betaSquared, `r2.ssidId`
            FROM (
                SELECT (@totalCount / COUNT(*)) * (@totalCount / COUNT(*)) betaSquared, r2.ssidId AS `r2.ssidId`
                FROM MAC_SSID_Relation r2
                GROUP BY r2.ssidId
            ) r2
        ) r2
        ON (`r1.ssidId` = `r2.ssidId`)
    ) betaSos1
    INTO betaSumOfSquares;

	RETURN betaSumOfSquares;
END $$
DELIMITER; $$

SELECT computeBetaSumOfSquares(@m1);
