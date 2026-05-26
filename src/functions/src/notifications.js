
const admin = require("firebase-admin");
const db = admin.firestore();
const fetch = require("node-fetch").default;
const { sendEmail, announcementEmail } = require("./email");


// Helper to get start of day in a specific timezone
const getStartOfDayInTimezone = (date, timeZone) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone, hour12: false };
    const dateParts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
    const parts = dateParts.reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
};

// Helper to calculate balance
const calculateTenantBalance = (tenant, allPayments, allDues, upToDate) => {
    const boundaryDate = new Date(Date.UTC(upToDate.getUTCFullYear(), upToDate.getUTCMonth(), upToDate.getUTCDate() + 1));
    const joinDate = new Date(tenant.joinDate);
    const dueDay = tenant.monthlyDueDay || joinDate.getUTCDate();

    const totalCredits = allPayments
        .filter(p => p.tenantId === tenant.id && new Date(p.date) < boundaryDate && p.paymentMethod !== 'Security Deposit' && p.paymentMethod !== 'From Credit')
        .reduce((sum, p) => sum + (p.amount || 0) + (p.discountApplied || 0), 0);
    
    let totalLiability = 0;
    if (joinDate < boundaryDate) {
        if (tenant.rent_history && tenant.rent_history.length > 0) {
            let chargeDate = new Date(joinDate);
            while (chargeDate < boundaryDate) {
                const activeRentEntry = [...tenant.rent_history]
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .find(entry => new Date(chargeDate) >= new Date(entry.startDate) && (!entry.endDate || new Date(chargeDate) < new Date(entry.endDate)));
                if (activeRentEntry) {
                    totalLiability += activeRentEntry.rate;
                }
                const currentMonth = chargeDate.getUTCMonth();
                const currentYear = chargeDate.getUTCFullYear();
                let nextMonth = currentMonth + 1;
                let nextYear = currentYear;
                if (nextMonth > 11) {
                    nextMonth = 0;
                    nextYear++;
                }
                const lastDayOfNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
                const nextDueDayInMonth = Math.min(dueDay, lastDayOfNextMonth);
                chargeDate = new Date(Date.UTC(nextYear, nextMonth, nextDueDayInMonth));
            }
        }
    }
    
    allDues.filter(d => d.tenantId === tenant.id && new Date(d.dueDate) < boundaryDate).forEach(due => {
        totalLiability += due.amount;
    });

    return totalLiability - totalCredits;
};


// Main function to check and send notifications
async function runNotificationChecks() {
    const clientsSnapshot = await db.collection('clients').get();
    if (clientsSnapshot.empty) {
        console.log("No clients found.");
        return;
    }

    const allPayments = (await db.collection('payments').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const allDues = (await db.collection('additionalDues').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const allTenants = (await db.collection('tenants').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const now = new Date();

    // Separate batch for scheduled announcements to avoid interfering with reminder logic
    const announcementBatch = db.batch();
    const scheduledAnnouncementsQuery = await db.collection('announcements')
        .where('status', '==', 'scheduled')
        .where('scheduledAt', '<=', now.toISOString())
        .get();
        
    for (const docSnap of scheduledAnnouncementsQuery.docs) {
        announcementBatch.update(docSnap.ref, { status: 'sent', createdAt: new Date().toISOString() });
        const announcement = docSnap.data();
        if (announcement.audience === 'tenant' && announcement.scope !== 'global') {
            const clientTenants = allTenants.filter(t => t.clientId === announcement.scope && t.email && t.hasAccount);
            const client = clientsSnapshot.docs.find(c => c.id === announcement.scope)?.data();
            const fromName = client?.name || announcement.senderName;
            const { subject, html } = announcementEmail({
                fromName,
                title: announcement.title,
                content: announcement.content,
            });
            for (const tenant of clientTenants) {
                await sendEmail({ to: tenant.email, subject, html });
            }
        }
    }
    await announcementBatch.commit();


    // Process reminders for each client
    for (const clientDoc of clientsSnapshot.docs) {
        const client = { id: clientDoc.id, ...clientDoc.data() };
        const settings = client.notificationSettings;
        if (!settings) continue;

        const today = getStartOfDayInTimezone(new Date(), client.timezone || 'Etc/UTC');
        const clientTenants = allTenants.filter(t => t.clientId === client.id && t.status === 'active' && t.hasAccount);

        for (const tenant of clientTenants) {
            const batch = db.batch(); // Create a new batch for each tenant's notifications
            
            let notificationCreated = false;

            // Check contract expiry
            if (settings.daysBeforeContractExpiry > 0 && tenant.contractEndDate) {
                const endDate = getStartOfDayInTimezone(new Date(tenant.contractEndDate), client.timezone || 'Etc/UTC');
                const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                if (diffDays === settings.daysBeforeContractExpiry) {
                    const message = `Hi ${tenant.name.split(' ')[0]}, this is a reminder from ${client.name} that your contract is expiring in ${diffDays} days on ${endDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })}.`;
                    await createNotification(batch, tenant, client, "Contract Expiration Reminder", message);
                    notificationCreated = true;
                }
            }
            
            // Rent due checks
            const getAnniversaryForMonth = (t, refDate) => {
                const joinDate = new Date(t.joinDate);
                const dueDay = t.monthlyDueDay || joinDate.getUTCDate();
                const refYear = refDate.getUTCFullYear();
                const refMonth = refDate.getUTCMonth();
                const lastDayInMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();
                const anniversaryDay = Math.min(dueDay, lastDayInMonth);
                return new Date(Date.UTC(refYear, refMonth, anniversaryDay));
            };
            
            const anniversaryThisMonth = getAnniversaryForMonth(tenant, today);
            let nextDueDate;
            if (anniversaryThisMonth > today) {
                nextDueDate = anniversaryThisMonth;
            } else {
                const nextMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
                nextDueDate = getAnniversaryForMonth(tenant, nextMonthDate);
            }
            
            // Pre-due date reminder
            if (settings.daysBeforeDueDate > 0) {
                const diffDays = Math.round((nextDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                if (diffDays === settings.daysBeforeDueDate) {
                    const message = `Hi ${tenant.name.split(' ')[0]}, this is a friendly reminder from ${client.name} that your next rent payment is due on ${nextDueDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' })}. Thank you!`;
                    await createNotification(batch, tenant, client, "Upcoming Due Date Reminder", message);
                    notificationCreated = true;
                }
            }

            // On-due date reminder
            if (settings.notifyOnDueDate && anniversaryThisMonth.getTime() === today.getTime()) {
                const balance = calculateTenantBalance(tenant, allPayments, allDues, today);
                if (balance > 0) {
                    const message = `Hi ${tenant.name.split(' ')[0]}, just a friendly reminder from ${client.name} that you have an outstanding balance of ₱${balance.toFixed(2)}. Please let us know if you have any questions. Thank you!`;
                    await createNotification(batch, tenant, client, "Outstanding Balance Reminder", message);
                    notificationCreated = true;
                }
            }
            
            if (notificationCreated) {
                await batch.commit(); // Commit the batch for this tenant
            }
        }
    }
}

// Helper to format PH numbers to the required 10-digit format
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length === 10) return digitsOnly; // Already correct
    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) return digitsOnly.substring(1); // Remove leading 0
    if (digitsOnly.length === 12 && digitsOnly.startsWith('63')) return digitsOnly.substring(2); // Remove country code
    return null; // Invalid format
}

async function createNotification(batch, tenant, client, title, content) {
    // In-app notification
    if (tenant.username) {
        const announcementRef = db.collection('announcements').doc();
        const announcementData = {
            title: title,
            content: content,
            scope: client.id,
            audience: 'tenant',
            senderId: 'system',
            senderName: 'RentPilot System',
            recipientId: tenant.id,
            recipientUsername: tenant.username,
            createdAt: new Date().toISOString(),
            readBy: [],
            status: 'sent',
            isScheduled: false,
            scheduledAt: new Date().toISOString(),
        };
        batch.set(announcementRef, announcementData);
    }

    // Email notification (Resend)
    if (tenant.email) {
        const { subject, html } = announcementEmail({
            fromName: client.name,
            title,
            content,
        });
        await sendEmail({ to: tenant.email, subject, html });
    }

    // SMS notification
    const phoneNumber = formatPhoneNumber(tenant.phone);
    if (phoneNumber) {
        const smsApiUrl = 'https://free-sms-api.svxtract.workers.dev/';
        const smsMessage = encodeURIComponent(content);
        const fullUrl = `${smsApiUrl}?number=${phoneNumber}&message=${smsMessage}`;

        try {
            const response = await fetch(fullUrl);
            const data = await response.json();
            console.log(`SMS API response for ${phoneNumber}:`, data);
        } catch (err) {
            console.error(`Failed to send SMS to ${phoneNumber}:`, err);
        }
    }
}

module.exports = { runNotificationChecks };

    