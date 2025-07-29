
sudo iptables -t nat -A PREROUTING -p udp --dport <port> -j DNAT --to-destination 10.66.66.6

sudo iptables -t nat -A PREROUTING -p tcp --dport <port> -j DNAT --to-destination 10.66.66.6:<port>

sudo iptables -t nat -A POSTROUTING -d 10.66.66.6 -p udp --dport <port> -j SNAT --to-source 10.66.66.1

sudo iptables -t nat -A POSTROUTING -d 10.66.66.6 -p tcp --dport <port> -j SNAT --to-source 10.66.66.1

