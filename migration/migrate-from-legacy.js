#!/usr/bin/env node
/**
 * Migration Script: Legacy IDS VoIP System → New Asterisk Management UI
 *
 * This script migrates data from the legacy MySQL databases to the new PostgreSQL schema.
 *
 * Prerequisites:
 * - Node.js 18+
 * - Access to legacy MySQL databases (asterisk, panel, rapports, asteriskcdrdb)
 * - Access to new PostgreSQL database
 *
 * Usage:
 *   node migrate-from-legacy.js --dry-run    # Preview without changes
 *   node migrate-from-legacy.js              # Execute migration
 */

const mysql = require('mysql2/promise');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Configuration - Update these values
const config = {
  legacy: {
    host: 'localhost',
    user: 'root',
    password: 'idsmysqlrootadmin', // From legacy database.yml
  },
  newDb: {
    host: 'localhost',
    port: 5432,
    database: 'asterisk_mgmt',
    user: 'asterisk',
    password: 'your_secure_password',
  },
  dryRun: process.argv.includes('--dry-run'),
};

// Counters for reporting
const stats = {
  extensions: { migrated: 0, skipped: 0, errors: 0 },
  queues: { migrated: 0, skipped: 0, errors: 0 },
  queueMembers: { migrated: 0, skipped: 0, errors: 0 },
  voicemail: { migrated: 0, skipped: 0, errors: 0 },
  cdr: { migrated: 0, skipped: 0, errors: 0 },
  users: { migrated: 0, skipped: 0, errors: 0 },
};

async function main() {
  console.log('='.repeat(60));
  console.log('Legacy IDS → New Asterisk Management UI Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
  console.log('');

  // Connect to databases
  const legacyAsterisk = await mysql.createConnection({
    ...config.legacy,
    database: 'asterisk',
  });
  const legacyPanel = await mysql.createConnection({
    ...config.legacy,
    database: 'panel',
  });
  const legacyCdr = await mysql.createConnection({
    ...config.legacy,
    database: 'asteriskcdrdb',
  });

  const newDb = new Client(config.newDb);
  await newDb.connect();

  try {
    // 1. Migrate Extensions (SIP endpoints)
    await migrateExtensions(legacyAsterisk, legacyPanel, newDb);

    // 2. Migrate Voicemail boxes
    await migrateVoicemail(legacyAsterisk, newDb);

    // 3. Migrate Queues
    await migrateQueues(legacyAsterisk, newDb);

    // 4. Migrate Queue Members
    await migrateQueueMembers(legacyAsterisk, newDb);

    // 5. Migrate CDR (Call Detail Records)
    await migrateCdr(legacyCdr, newDb);

    // 6. Migrate Admin Users
    await migrateUsers(legacyPanel, newDb);

    // Print summary
    printSummary();
  } finally {
    await legacyAsterisk.end();
    await legacyPanel.end();
    await legacyCdr.end();
    await newDb.end();
  }
}

async function migrateExtensions(legacyAsterisk, legacyPanel, newDb) {
  console.log('\n📞 Migrating Extensions...');

  // Get SIP peers from legacy asterisk.sip table
  const [sipPeers] = await legacyAsterisk.query(`
    SELECT name, secret, callerid, context, host, nat, type, qualify
    FROM sip
    WHERE type IN ('peer', 'friend')
    ORDER BY name
  `);

  // Get additional info from panel.people table
  const [people] = await legacyPanel.query(`
    SELECT extension, first_name, last_name, email
    FROM people
    WHERE extension IS NOT NULL
  `);

  const peopleMap = new Map();
  people.forEach(p => {
    peopleMap.set(p.extension, p);
  });

  for (const sip of sipPeers) {
    try {
      // Skip non-numeric extensions (like trunk peers)
      if (!/^\d+$/.test(sip.name)) {
        stats.extensions.skipped++;
        continue;
      }

      const person = peopleMap.get(sip.name) || {};
      const displayName = person.first_name && person.last_name
        ? `${person.first_name} ${person.last_name}`
        : sip.name;

      if (config.dryRun) {
        console.log(`  Would migrate extension ${sip.name}: ${displayName}`);
        stats.extensions.migrated++;
        continue;
      }

      // Insert into ps_endpoints (PJSIP)
      await newDb.query(`
        INSERT INTO ps_endpoints (id, aors, auth, callerid, context, mailboxes)
        VALUES ($1, $1, $1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          callerid = EXCLUDED.callerid,
          context = EXCLUDED.context
      `, [
        sip.name,
        sip.callerid || `"${displayName}" <${sip.name}>`,
        sip.context || 'from-internal',
        `${sip.name}@default`,
      ]);

      // Insert into ps_auths
      await newDb.query(`
        INSERT INTO ps_auths (id, username, password)
        VALUES ($1, $1, $2)
        ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password
      `, [sip.name, sip.secret || 'changeme']);

      // Insert into ps_aors
      await newDb.query(`
        INSERT INTO ps_aors (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
      `, [sip.name]);

      // Insert into extensions (our metadata table)
      await newDb.query(`
        INSERT INTO extensions (id, display_name, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          email = EXCLUDED.email
      `, [sip.name, displayName, person.email]);

      stats.extensions.migrated++;
      console.log(`  ✓ Migrated extension ${sip.name}: ${displayName}`);
    } catch (error) {
      stats.extensions.errors++;
      console.error(`  ✗ Error migrating extension ${sip.name}:`, error.message);
    }
  }
}

async function migrateVoicemail(legacyAsterisk, newDb) {
  console.log('\n📬 Migrating Voicemail boxes...');

  const [voicemails] = await legacyAsterisk.query(`
    SELECT mailbox, context, password, fullname, email, attach
    FROM voicemail
    ORDER BY mailbox
  `);

  for (const vm of voicemails) {
    try {
      if (config.dryRun) {
        console.log(`  Would migrate voicemail ${vm.mailbox}`);
        stats.voicemail.migrated++;
        continue;
      }

      await newDb.query(`
        INSERT INTO voicemail (context, mailbox, password, fullname, email, attach)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (context, mailbox) DO UPDATE SET
          password = EXCLUDED.password,
          fullname = EXCLUDED.fullname,
          email = EXCLUDED.email
      `, [
        vm.context || 'default',
        vm.mailbox,
        vm.password || '1234',
        vm.fullname,
        vm.email,
        vm.attach || 'yes',
      ]);

      stats.voicemail.migrated++;
      console.log(`  ✓ Migrated voicemail ${vm.mailbox}`);
    } catch (error) {
      stats.voicemail.errors++;
      console.error(`  ✗ Error migrating voicemail ${vm.mailbox}:`, error.message);
    }
  }
}

async function migrateQueues(legacyAsterisk, newDb) {
  console.log('\n👥 Migrating Queues...');

  const [queues] = await legacyAsterisk.query(`
    SELECT name, musiconhold, announce, context, timeout,
           strategy, servicelevel, wrapuptime, maxlen
    FROM queues
    ORDER BY name
  `);

  for (const queue of queues) {
    try {
      if (config.dryRun) {
        console.log(`  Would migrate queue ${queue.name}`);
        stats.queues.migrated++;
        continue;
      }

      await newDb.query(`
        INSERT INTO queues (name, musiconhold, announce, context, timeout,
                           strategy, servicelevel, wrapuptime, maxlen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (name) DO UPDATE SET
          musiconhold = EXCLUDED.musiconhold,
          strategy = EXCLUDED.strategy,
          timeout = EXCLUDED.timeout
      `, [
        queue.name,
        queue.musiconhold || 'default',
        queue.announce,
        queue.context,
        queue.timeout || 15,
        queue.strategy || 'ringall',
        queue.servicelevel || 60,
        queue.wrapuptime || 0,
        queue.maxlen || 0,
      ]);

      stats.queues.migrated++;
      console.log(`  ✓ Migrated queue ${queue.name}`);
    } catch (error) {
      stats.queues.errors++;
      console.error(`  ✗ Error migrating queue ${queue.name}:`, error.message);
    }
  }
}

async function migrateQueueMembers(legacyAsterisk, newDb) {
  console.log('\n👤 Migrating Queue Members...');

  const [members] = await legacyAsterisk.query(`
    SELECT queue_name, interface, membername, penalty, paused
    FROM queue_members
    ORDER BY queue_name, interface
  `);

  for (const member of members) {
    try {
      // Convert interface format: SIP/101 -> PJSIP/101
      let interface_ = member.interface;
      if (interface_.startsWith('SIP/')) {
        interface_ = interface_.replace('SIP/', 'PJSIP/');
      }

      if (config.dryRun) {
        console.log(`  Would migrate member ${interface_} in queue ${member.queue_name}`);
        stats.queueMembers.migrated++;
        continue;
      }

      await newDb.query(`
        INSERT INTO queue_members (queue_name, interface, membername, penalty, paused)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (queue_name, interface) DO UPDATE SET
          membername = EXCLUDED.membername,
          penalty = EXCLUDED.penalty
      `, [
        member.queue_name,
        interface_,
        member.membername,
        member.penalty || 0,
        member.paused || 0,
      ]);

      stats.queueMembers.migrated++;
      console.log(`  ✓ Migrated member ${interface_} → ${member.queue_name}`);
    } catch (error) {
      stats.queueMembers.errors++;
      console.error(`  ✗ Error migrating member:`, error.message);
    }
  }
}

async function migrateCdr(legacyCdr, newDb) {
  console.log('\n📊 Migrating CDR (Call Detail Records)...');
  console.log('  This may take a while for large datasets...');

  // Get count first
  const [[{ count }]] = await legacyCdr.query('SELECT COUNT(*) as count FROM cdr');
  console.log(`  Found ${count} CDR records`);

  if (config.dryRun) {
    console.log(`  Would migrate ${count} CDR records`);
    stats.cdr.migrated = parseInt(count);
    return;
  }

  // Migrate in batches
  const batchSize = 1000;
  let offset = 0;

  while (offset < count) {
    const [records] = await legacyCdr.query(`
      SELECT calldate, clid, src, dst, dcontext, channel, dstchannel,
             lastapp, lastdata, duration, billsec, disposition,
             amaflags, accountcode, uniqueid, userfield, linkedid
      FROM cdr
      ORDER BY calldate
      LIMIT ${batchSize} OFFSET ${offset}
    `);

    for (const record of records) {
      try {
        await newDb.query(`
          INSERT INTO cdr (calldate, clid, src, dst, dcontext, channel, dstchannel,
                          lastapp, lastdata, duration, billsec, disposition,
                          amaflags, accountcode, uniqueid, userfield, linkedid)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          record.calldate,
          record.clid,
          record.src,
          record.dst,
          record.dcontext,
          record.channel,
          record.dstchannel,
          record.lastapp,
          record.lastdata,
          record.duration,
          record.billsec,
          record.disposition,
          record.amaflags,
          record.accountcode,
          record.uniqueid,
          record.userfield,
          record.linkedid,
        ]);
        stats.cdr.migrated++;
      } catch (error) {
        stats.cdr.errors++;
      }
    }

    offset += batchSize;
    process.stdout.write(`\r  Progress: ${Math.min(offset, count)}/${count} records`);
  }
  console.log('');
}

async function migrateUsers(legacyPanel, newDb) {
  console.log('\n🔐 Migrating Admin Users...');

  // Get users from panel.users
  const [users] = await legacyPanel.query(`
    SELECT login, email, crypted_password, is_admin
    FROM users
    WHERE login IS NOT NULL
  `);

  for (const user of users) {
    try {
      // Generate new password hash (legacy uses SHA, we use bcrypt)
      // Users will need to reset their passwords
      const tempPassword = await bcrypt.hash('changeme', 10);

      if (config.dryRun) {
        console.log(`  Would migrate user ${user.login}`);
        stats.users.migrated++;
        continue;
      }

      await newDb.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO UPDATE SET
          email = EXCLUDED.email
      `, [
        user.login,
        user.email,
        tempPassword,
        user.is_admin ? 'admin' : 'user',
      ]);

      stats.users.migrated++;
      console.log(`  ✓ Migrated user ${user.login} (password reset required)`);
    } catch (error) {
      stats.users.errors++;
      console.error(`  ✗ Error migrating user ${user.login}:`, error.message);
    }
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));

  const categories = ['extensions', 'voicemail', 'queues', 'queueMembers', 'cdr', 'users'];

  for (const cat of categories) {
    const s = stats[cat];
    console.log(`${cat.padEnd(15)} Migrated: ${s.migrated}, Skipped: ${s.skipped}, Errors: ${s.errors}`);
  }

  console.log('');
  if (config.dryRun) {
    console.log('⚠️  This was a DRY RUN. No changes were made.');
    console.log('    Run without --dry-run to execute the migration.');
  } else {
    console.log('✅ Migration complete!');
    console.log('');
    console.log('⚠️  IMPORTANT: All migrated users have password "changeme"');
    console.log('    Users must change their passwords after migration.');
  }
}

main().catch(console.error);
