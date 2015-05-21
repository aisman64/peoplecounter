old=$(hostname)
for file in \
   /etc/hostname \
   /etc/hosts \
   /etc/ssh/ssh_host_rsa_key.pub \
   /etc/ssh/ssh_host_dsa_key.pub \
   /etc/ssh/ssh_host_ecdsa_key.pub \
   /etc/motd
do
   [ -f $file ] && sed -i.old -e "s:$old:$new:g" $file
done
