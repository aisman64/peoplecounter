old=$(hostname)
for file in \
   /etc/exim4/update-exim4.conf.conf \
   /etc/printcap \
   /etc/hostname \
   /etc/hosts \
   /etc/ssh/ssh_host_rsa_key.pub \
   /etc/ssh/ssh_host_dsa_key.pub \
   /etc/motd \
   /etc/ssmtp/ssmtp.conf
do
   [ -f $file ] && sed -i.old -e "s:$old:$new:g" $file
done
