#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "PostgreSQL is ready!"

# Substitute environment variables in config files
envsubst < /etc/asterisk/res_config_pgsql.conf.template > /etc/asterisk/res_config_pgsql.conf
envsubst < /etc/asterisk/cdr_pgsql.conf.template > /etc/asterisk/cdr_pgsql.conf
envsubst < /etc/asterisk/ari.conf.template > /etc/asterisk/ari.conf

# Set permissions
chown -R asterisk:asterisk /etc/asterisk
chown -R asterisk:asterisk /var/lib/asterisk
chown -R asterisk:asterisk /var/spool/asterisk
chown -R asterisk:asterisk /var/log/asterisk
chown -R asterisk:asterisk /var/run/asterisk

echo "Starting Asterisk..."
exec "$@"
