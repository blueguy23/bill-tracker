# Crontab Entries

Documented crontab entries for this project. Apply with `crontab -e`.

```crontab
# SimpleFIN sync — every 2 hours
0 */2 * * * /home/garci/projects/bill-tracker/scripts/cron-sync.sh >> /home/garci/projects/bill-tracker/logs/sync.log 2>&1

# Budget rollover — 1st of each month at 00:05
5 0 1 * * /home/garci/projects/bill-tracker/scripts/run-budget-rollover.sh >> /home/garci/projects/bill-tracker/logs/rollover.log 2>&1

# Notification digest — daily at 08:00
0 8 * * * /home/garci/projects/bill-tracker/scripts/run-notification-digest.sh >> /home/garci/projects/bill-tracker/logs/digest.log 2>&1

# Heartbeat check — every 4 hours at :30 (offset from sync)
# Alerts via Discord if sync hasn't succeeded within 4 hours
30 1,5,9,13,17,21 * * * /home/garci/projects/bill-tracker/scripts/cron-heartbeat-check.sh >> /home/garci/projects/bill-tracker/logs/heartbeat.log 2>&1
```
