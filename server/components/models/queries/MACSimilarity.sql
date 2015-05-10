# Compute measure of "connectedness" for MAC addresses
# 	see: http://spirit.cs.ucdavis.edu/pubs/conf/Ningning_MILCOM12.pdf
SET div_precision_increment = 12;
SET @totalCount := (SELECT DISTINCT COUNT(ssidId) FROM MAC_SSID_Relation);

# get macIds m1 and m2
SET @m1 := (SELECT macId FROM MACAddress WHERE macAddress = :macAddress1);
SET @m2 := (SELECT macId FROM MACAddress WHERE macAddress = :macAddress2);

# compute all betas
SELECT * FROM (
	SELECT (COUNT(*) / @totalCount) beta, ssidId
	FROM MAC_SSID_Relation
	GROUP BY ssidId
) betas;

# get all SSIDs of m1
SELECT * FROM (
	SELECT DISTINCT ssidId FROM MAC_SSID_Relation WHERE macId = 
);

# compute the sum of squares of for m1 (beta_x)
SELECT * FROM (
	
) betas_x;