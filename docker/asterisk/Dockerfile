FROM debian:bookworm-slim

LABEL maintainer="Asterisk Management UI"
LABEL description="Asterisk PBX with PJSIP, ARI, and PostgreSQL Realtime"

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    asterisk \
    asterisk-core-sounds-en \
    asterisk-core-sounds-en-wav \
    asterisk-moh-opsound-wav \
    asterisk-modules \
    odbc-postgresql \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create asterisk user directories
RUN mkdir -p /var/lib/asterisk/sounds \
    /var/spool/asterisk \
    /var/log/asterisk \
    /var/run/asterisk \
    && chown -R asterisk:asterisk /var/lib/asterisk \
    /var/spool/asterisk \
    /var/log/asterisk \
    /var/run/asterisk \
    /etc/asterisk

# Copy configuration files
COPY config/ /etc/asterisk/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
# SIP
EXPOSE 5060/udp
EXPOSE 5060/tcp
EXPOSE 5061/tcp
# ARI
EXPOSE 8088
EXPOSE 8089
# RTP (adjust range as needed)
EXPOSE 10000-10100/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD asterisk -rx "core show version" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["asterisk", "-f"]
