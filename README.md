# Frost Sprinkler

Reads weather from a Davis Weather Station and controls valves via OpenSprinkler.

Using ValTown to send emails currently -- make sure you set `EMAIL_KEY` in `.env` file.


```sh
# setup
git clone git@github.com:ccorcos/frost-sprinkler.git
cd frost-sprinkler
npm install
```

Setup the `.env` file.
```sh
EMAIL_URL=https://chet-email.web.val.run
EMAIL_KEY=XXX
WEATHERLINK_URL=http://XXX.local/v1/current_conditions
OPENSPRINKLER_URL=http://IP/cm?pw=XXX&sid=23
ON_BELOW_F=35
```

Add to systemd and start.

```sh
npm install -g add-to-systemd
add-to-systemd frost-sprinkler "$(which npm) start"

# start
sudo systemctl start frost-sprinkler.service

# check the logs
sudo systemctl status frost-sprinkler.service
journalctl -f -u frost-sprinkler.service
```