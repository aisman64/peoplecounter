#!/bin/sh

dbName="peoplecounter"
dbUser="root"
dbPass="r00t"
dbCharset="utf8"


backupRoot="../backup"


echo "Enter number of file you want to import:"

shopt -s nullglob

sqlFiles=($backupRoot/*.sql)
iFile=0

for file in "${sqlFiles[@]}"
do
	((iFile++))
	echo "$iFile: $file";
done

read fileNumber

file=${sqlFiles[fileNumber-1]}

if [ -z "$file" ]; then
	echo "Invalid selection."
	exit -1
fi

echo "selected $fileNumber: $file"


echo "importing database..."
mysql --user=$dbUser --password=$dbPass --database=$dbName --default_character_set=$dbCharset < $file

echo "finished"
exit 0