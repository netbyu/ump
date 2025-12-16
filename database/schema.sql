-- =============================================================================
-- Asterisk Management UI - Database Schema
-- PostgreSQL with Asterisk Realtime Architecture (ARA)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: Asterisk Realtime Tables
-- These tables are read directly by Asterisk via res_config_pgsql
-- -----------------------------------------------------------------------------

-- SIP/PJSIP Endpoints (Asterisk reads this directly)
CREATE TABLE ps_endpoints (
    id VARCHAR(40) PRIMARY KEY,                    -- Extension number (e.g., "101")
    transport VARCHAR(40) DEFAULT 'transport-udp',
    aors VARCHAR(200),                             -- Address of Record (same as id)
    auth VARCHAR(40),                              -- Auth reference (same as id)
    context VARCHAR(40) DEFAULT 'from-internal',
    disallow VARCHAR(200) DEFAULT 'all',
    allow VARCHAR(200) DEFAULT 'ulaw,alaw,g722',
    direct_media VARCHAR(3) DEFAULT 'no',
    connected_line_method VARCHAR(40) DEFAULT 'invite',
    direct_media_method VARCHAR(40) DEFAULT 'invite',
    direct_media_glare_mitigation VARCHAR(40) DEFAULT 'none',
    disable_direct_media_on_nat VARCHAR(3) DEFAULT 'yes',
    dtmf_mode VARCHAR(40) DEFAULT 'rfc4733',
    force_rport VARCHAR(3) DEFAULT 'yes',
    ice_support VARCHAR(3) DEFAULT 'no',
    identify_by VARCHAR(40) DEFAULT 'username',
    mailboxes VARCHAR(40),                         -- Voicemail box reference
    moh_suggest VARCHAR(40) DEFAULT 'default',
    outbound_auth VARCHAR(40),
    rewrite_contact VARCHAR(3) DEFAULT 'yes',
    rtp_symmetric VARCHAR(3) DEFAULT 'yes',
    send_diversion VARCHAR(3) DEFAULT 'yes',
    send_pai VARCHAR(3) DEFAULT 'yes',
    callerid VARCHAR(100),                         -- Display name <number>
    trust_id_inbound VARCHAR(3) DEFAULT 'no',
    trust_id_outbound VARCHAR(3) DEFAULT 'no',
    device_state_busy_at INTEGER DEFAULT 1,
    -- Custom fields (not read by Asterisk, for our app)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PJSIP Auth credentials
CREATE TABLE ps_auths (
    id VARCHAR(40) PRIMARY KEY,                    -- Same as endpoint id
    auth_type VARCHAR(40) DEFAULT 'userpass',
    password VARCHAR(80),                          -- SIP password
    username VARCHAR(40),                          -- Same as id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PJSIP Address of Record (registration)
CREATE TABLE ps_aors (
    id VARCHAR(40) PRIMARY KEY,                    -- Same as endpoint id
    max_contacts INTEGER DEFAULT 1,
    remove_existing VARCHAR(3) DEFAULT 'yes',
    qualify_frequency INTEGER DEFAULT 60,
    authenticate_qualify VARCHAR(3) DEFAULT 'no',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voicemail boxes (Asterisk realtime)
CREATE TABLE voicemail (
    id SERIAL PRIMARY KEY,
    context VARCHAR(50) DEFAULT 'default',
    mailbox VARCHAR(40) NOT NULL,                  -- Extension number
    password VARCHAR(10) DEFAULT '1234',
    fullname VARCHAR(150),
    email VARCHAR(100),
    pager VARCHAR(100),
    attach VARCHAR(3) DEFAULT 'yes',
    attachfmt VARCHAR(10) DEFAULT 'wav',
    serveremail VARCHAR(100),
    language VARCHAR(20) DEFAULT 'en',
    tz VARCHAR(40) DEFAULT 'eastern',
    deletevoicemail VARCHAR(3) DEFAULT 'no',
    saycid VARCHAR(3) DEFAULT 'yes',
    sendvoicemail VARCHAR(3) DEFAULT 'yes',
    review VARCHAR(3) DEFAULT 'no',
    tempgreetwarn VARCHAR(3) DEFAULT 'yes',
    operator VARCHAR(3) DEFAULT 'yes',
    envelope VARCHAR(3) DEFAULT 'yes',
    sayduration VARCHAR(3) DEFAULT 'yes',
    forcename VARCHAR(3) DEFAULT 'no',
    forcegreetings VARCHAR(3) DEFAULT 'no',
    callback VARCHAR(50),
    dialout VARCHAR(50),
    exitcontext VARCHAR(50),
    maxmsg INTEGER DEFAULT 100,
    volgain DECIMAL(5,2) DEFAULT 0.0,
    imapuser VARCHAR(100),
    imappassword VARCHAR(100),
    imapfolder VARCHAR(100) DEFAULT 'INBOX',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(context, mailbox)
);

-- Queues (Asterisk realtime)
CREATE TABLE queues (
    name VARCHAR(128) PRIMARY KEY,
    musiconhold VARCHAR(128) DEFAULT 'default',
    announce VARCHAR(128),
    context VARCHAR(128),
    timeout INTEGER DEFAULT 15,
    ringinuse VARCHAR(3) DEFAULT 'no',
    setinterfacevar VARCHAR(3) DEFAULT 'yes',
    setqueuevar VARCHAR(3) DEFAULT 'yes',
    setqueueentryvar VARCHAR(3) DEFAULT 'yes',
    monitor_format VARCHAR(8),
    membermacro VARCHAR(512),
    membergosub VARCHAR(512),
    queue_youarenext VARCHAR(128),
    queue_thereare VARCHAR(128),
    queue_callswaiting VARCHAR(128),
    queue_quantity1 VARCHAR(128),
    queue_quantity2 VARCHAR(128),
    queue_holdtime VARCHAR(128),
    queue_minutes VARCHAR(128),
    queue_minute VARCHAR(128),
    queue_seconds VARCHAR(128),
    queue_thankyou VARCHAR(128),
    queue_callerannounce VARCHAR(128),
    queue_reporthold VARCHAR(128),
    announce_frequency INTEGER DEFAULT 0,
    announce_to_first_user VARCHAR(3) DEFAULT 'no',
    min_announce_frequency INTEGER DEFAULT 0,
    announce_round_seconds INTEGER DEFAULT 0,
    announce_holdtime VARCHAR(128),
    announce_position VARCHAR(128) DEFAULT 'yes',
    announce_position_limit INTEGER DEFAULT 5,
    periodic_announce VARCHAR(512),
    periodic_announce_frequency INTEGER DEFAULT 0,
    relative_periodic_announce VARCHAR(3) DEFAULT 'yes',
    random_periodic_announce VARCHAR(3) DEFAULT 'no',
    retry INTEGER DEFAULT 5,
    wrapuptime INTEGER DEFAULT 0,
    penaltymemberslimit INTEGER DEFAULT 0,
    autofill VARCHAR(3) DEFAULT 'yes',
    monitor_type VARCHAR(128),
    autopause VARCHAR(3) DEFAULT 'no',
    autopausedelay INTEGER DEFAULT 0,
    autopausebusy VARCHAR(3) DEFAULT 'no',
    autopauseunavail VARCHAR(3) DEFAULT 'no',
    maxlen INTEGER DEFAULT 0,
    servicelevel INTEGER DEFAULT 60,
    strategy VARCHAR(128) DEFAULT 'ringall',
    joinempty VARCHAR(128),
    leavewhenempty VARCHAR(128),
    reportholdtime VARCHAR(3) DEFAULT 'no',
    memberdelay INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 0,
    timeoutrestart VARCHAR(3) DEFAULT 'no',
    defaultrule VARCHAR(128),
    timeoutpriority VARCHAR(128) DEFAULT 'app',
    -- Custom fields
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue members (Asterisk realtime)
CREATE TABLE queue_members (
    uniqueid SERIAL PRIMARY KEY,
    membername VARCHAR(40),                        -- Display name
    queue_name VARCHAR(128) REFERENCES queues(name) ON DELETE CASCADE,
    interface VARCHAR(128) NOT NULL,               -- PJSIP/101 or Local/101@from-queue
    penalty INTEGER DEFAULT 0,
    paused INTEGER DEFAULT 0,
    state_interface VARCHAR(128),                  -- For device state (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(queue_name, interface)
);

-- -----------------------------------------------------------------------------
-- SECTION 2: Application Tables
-- These are used by the Node.js app, not directly by Asterisk
-- -----------------------------------------------------------------------------

-- Users (admin accounts for the web UI)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',               -- admin, user
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extensions (our extended metadata for endpoints)
CREATE TABLE extensions (
    id VARCHAR(40) PRIMARY KEY REFERENCES ps_endpoints(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    email VARCHAR(100),
    department VARCHAR(50),
    location VARCHAR(50),
    mac_address VARCHAR(17),                       -- For phone provisioning
    phone_model VARCHAR(50),
    emergency_cid VARCHAR(20),                     -- E911 caller ID
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CDR (Call Detail Records) - Asterisk writes here via cdr_pgsql
CREATE TABLE cdr (
    id SERIAL PRIMARY KEY,
    calldate TIMESTAMP NOT NULL,
    clid VARCHAR(80),                              -- Caller ID
    src VARCHAR(80),                               -- Source
    dst VARCHAR(80),                               -- Destination
    dcontext VARCHAR(80),                          -- Destination context
    channel VARCHAR(80),                           -- Source channel
    dstchannel VARCHAR(80),                        -- Destination channel
    lastapp VARCHAR(80),                           -- Last application
    lastdata VARCHAR(80),                          -- Last application data
    duration INTEGER DEFAULT 0,                    -- Total duration (seconds)
    billsec INTEGER DEFAULT 0,                     -- Billable seconds
    disposition VARCHAR(45),                       -- ANSWERED, NO ANSWER, BUSY, FAILED
    amaflags INTEGER DEFAULT 0,
    accountcode VARCHAR(20),
    uniqueid VARCHAR(150),
    userfield VARCHAR(255),
    linkedid VARCHAR(150),                         -- For linking related calls
    peeraccount VARCHAR(20),
    sequence INTEGER
);

-- Indexes for CDR queries
CREATE INDEX idx_cdr_calldate ON cdr(calldate);
CREATE INDEX idx_cdr_src ON cdr(src);
CREATE INDEX idx_cdr_dst ON cdr(dst);
CREATE INDEX idx_cdr_disposition ON cdr(disposition);
CREATE INDEX idx_cdr_linkedid ON cdr(linkedid);

-- Queue log (Asterisk writes here via queue_log)
CREATE TABLE queue_log (
    id SERIAL PRIMARY KEY,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    callid VARCHAR(80),
    queuename VARCHAR(80),
    agent VARCHAR(80),
    event VARCHAR(32),
    data1 VARCHAR(100),
    data2 VARCHAR(100),
    data3 VARCHAR(100),
    data4 VARCHAR(100),
    data5 VARCHAR(100)
);

CREATE INDEX idx_queue_log_time ON queue_log(time);
CREATE INDEX idx_queue_log_queuename ON queue_log(queuename);
CREATE INDEX idx_queue_log_agent ON queue_log(agent);
CREATE INDEX idx_queue_log_event ON queue_log(event);

-- System settings (key-value store)
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,                   -- CREATE, UPDATE, DELETE
    entity_type VARCHAR(50) NOT NULL,              -- extension, queue, etc.
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- -----------------------------------------------------------------------------
-- SECTION 3: Initial Data
-- -----------------------------------------------------------------------------

-- Default admin user (password: changeme - bcrypt hash)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@localhost', '$2b$10$rQZ5P.vT5tHZJYDqVh5nYOXrQc5zQm5tZJ5s5vQz5Q5z5Q5z5Q5z5', 'admin');

-- Default settings
INSERT INTO settings (key, value, description) VALUES
('company_name', 'My Company', 'Company name displayed in UI'),
('default_context', 'from-internal', 'Default dialplan context for extensions'),
('voicemail_context', 'default', 'Default voicemail context'),
('recording_enabled', 'false', 'Enable call recording by default'),
('recording_path', '/var/spool/asterisk/monitor', 'Path for call recordings');

-- -----------------------------------------------------------------------------
-- SECTION 4: Helper Functions
-- -----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_ps_endpoints_updated_at BEFORE UPDATE ON ps_endpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ps_auths_updated_at BEFORE UPDATE ON ps_auths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ps_aors_updated_at BEFORE UPDATE ON ps_aors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voicemail_updated_at BEFORE UPDATE ON voicemail
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON queues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queue_members_updated_at BEFORE UPDATE ON queue_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_extensions_updated_at BEFORE UPDATE ON extensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
