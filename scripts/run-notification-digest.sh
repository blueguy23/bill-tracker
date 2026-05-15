#!/bin/bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
cd /home/garci/projects/bill-tracker && npx tsx scripts/cron-notification-digest.ts "$@"
