# Compute measure of "connectedness" for MAC addresses
# 	see: http://spirit.cs.ucdavis.edu/pubs/conf/Ningning_MILCOM12.pdf
SET div_precision_increment = 12;
SET @totalCount := (SELECT DISTINCT COUNT(ssidId) FROM MAC_SSID_Relation);

# 98fe94cd9440

# get macIds m1 and m2
SET @m1 := (SELECT macId FROM MACAddress WHERE macAddress = :macAddress1);
SET @m2 := (SELECT macId FROM MACAddress WHERE macAddress = :macAddress2);

# compute the sum of squares of for m1 (beta_x)
SELECT SUM(betaSquared) FROM (
	SELECT * 
	FROM (
		# get all SSIDs of m1
		SELECT DISTINCT r1.ssidId AS `r1.ssidId`
		FROM MAC_SSID_Relation r1
		WHERE macId = @m1
	) s1
	INNER JOIN (
		# compute all sums of squares of betas of all SSIDs of m1
		SELECT betaSquared, `r2.ssidId`
		FROM (
			SELECT (COUNT(*) / @totalCount) * (COUNT(*) / @totalCount) betaSquared, r2.ssidId AS `r2.ssidId`
			FROM MAC_SSID_Relation r2
			GROUP BY r2.ssidId
		) b1
	) b1
	ON (`r1.ssidId` = `r2.ssidId`)
)
AS betaSos1;