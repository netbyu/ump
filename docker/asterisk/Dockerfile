FROM debian:bookworm-slim AS builder

LABEL maintainer="Asterisk Management UI"
LABEL description="Asterisk PBX with PJSIP, ARI, and PostgreSQL Realtime"

ARG ASTERISK_VERSION=21.12.0

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    gnupg \
    ca-certificates \
    libncurses5-dev \
    libssl-dev \
    libxml2-dev \
    libsqlite3-dev \
    uuid-dev \
    libjansson-dev \
    libedit-dev \
    libspeex-dev \
    libspeexdsp-dev \
    libgsm1-dev \
    libsrtp2-dev \
    libpq-dev \
    unixodbc-dev \
    libcurl4-openssl-dev \
    libnewt-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and build Asterisk
WORKDIR /usr/src
RUN wget -q https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz \
    && tar xzf asterisk-${ASTERISK_VERSION}.tar.gz \
    && cd asterisk-${ASTERISK_VERSION} \
    && (contrib/scripts/get_mp3_source.sh || true) \
    && ./configure --with-pjproject-bundled --with-jansson-bundled \
    && make menuselect.makeopts \
    && menuselect/menuselect \
        --enable res_ari \
        --enable res_ari_applications \
        --enable res_ari_asterisk \
        --enable res_ari_bridges \
        --enable res_ari_channels \
        --enable res_ari_device_states \
        --enable res_ari_endpoints \
        --enable res_ari_events \
        --enable res_ari_mailboxes \
        --enable res_ari_model \
        --enable res_ari_playbacks \
        --enable res_ari_recordings \
        --enable res_ari_sounds \
        --enable res_http_websocket \
        --enable res_pjsip \
        --enable res_pjsip_acl \
        --enable res_pjsip_authenticator_digest \
        --enable res_pjsip_caller_id \
        --enable res_pjsip_dialog_info_body_generator \
        --enable res_pjsip_diversion \
        --enable res_pjsip_dlg_options \
        --enable res_pjsip_dtmf_info \
        --enable res_pjsip_empty_info \
        --enable res_pjsip_endpoint_identifier_anonymous \
        --enable res_pjsip_endpoint_identifier_ip \
        --enable res_pjsip_endpoint_identifier_user \
        --enable res_pjsip_exten_state \
        --enable res_pjsip_header_funcs \
        --enable res_pjsip_logger \
        --enable res_pjsip_messaging \
        --enable res_pjsip_mwi \
        --enable res_pjsip_mwi_body_generator \
        --enable res_pjsip_nat \
        --enable res_pjsip_notify \
        --enable res_pjsip_one_touch_record_info \
        --enable res_pjsip_outbound_authenticator_digest \
        --enable res_pjsip_outbound_publish \
        --enable res_pjsip_outbound_registration \
        --enable res_pjsip_path \
        --enable res_pjsip_pidf_body_generator \
        --enable res_pjsip_pidf_digium_body_supplement \
        --enable res_pjsip_pidf_eyebeam_body_supplement \
        --enable res_pjsip_publish_asterisk \
        --enable res_pjsip_pubsub \
        --enable res_pjsip_refer \
        --enable res_pjsip_registrar \
        --enable res_pjsip_rfc3326 \
        --enable res_pjsip_sdp_rtp \
        --enable res_pjsip_send_to_voicemail \
        --enable res_pjsip_session \
        --enable res_pjsip_sips_contact \
        --enable res_pjsip_t38 \
        --enable res_pjsip_transport_websocket \
        --enable res_pjsip_xpidf_body_generator \
        --enable res_stasis \
        --enable res_stasis_answer \
        --enable res_stasis_device_state \
        --enable res_stasis_mailbox \
        --enable res_stasis_playback \
        --enable res_stasis_recording \
        --enable res_stasis_snoop \
        --enable res_config_odbc \
        --enable res_odbc \
        --enable func_odbc \
        --enable cdr_odbc \
        --enable cel_odbc \
        --enable CORE-SOUNDS-EN-WAV \
        --enable MOH-OPSOUND-WAV \
        menuselect.makeopts \
    && make -j$(nproc) \
    && make install \
    && make samples \
    && make config

# Runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libncurses6 \
    libssl3 \
    libxml2 \
    libsqlite3-0 \
    libuuid1 \
    libjansson4 \
    libedit2 \
    libspeex1 \
    libspeexdsp1 \
    libgsm1 \
    libsrtp2-1 \
    libpq5 \
    unixodbc \
    odbc-postgresql \
    libcurl4 \
    libnewt0.52 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Asterisk from builder
COPY --from=builder /usr/lib/asterisk/ /usr/lib/asterisk/
COPY --from=builder /usr/sbin/asterisk /usr/sbin/asterisk
COPY --from=builder /usr/sbin/safe_asterisk /usr/sbin/safe_asterisk
COPY --from=builder /var/lib/asterisk/ /var/lib/asterisk/
COPY --from=builder /var/spool/asterisk/ /var/spool/asterisk/
COPY --from=builder /etc/asterisk/ /etc/asterisk/

# Create asterisk user and set up directories
RUN groupadd -r asterisk && useradd -r -g asterisk asterisk \
    && mkdir -p /var/lib/asterisk/sounds \
        /var/spool/asterisk \
        /var/log/asterisk \
        /var/run/asterisk \
    && chown -R asterisk:asterisk \
        /var/lib/asterisk \
        /var/spool/asterisk \
        /var/log/asterisk \
        /var/run/asterisk \
        /etc/asterisk \
        /usr/lib/asterisk

# Copy configuration files
COPY config/ /etc/asterisk/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && chown -R asterisk:asterisk /etc/asterisk

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
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD asterisk -rx "core show version" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["asterisk", "-f"]
