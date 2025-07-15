
const admin = require("firebase-admin");
const db = admin.firestore();

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

    const batch = db.batch();

    for (const clientDoc of clientsSnapshot.docs) {
        const client = { id: clientDoc.id, ...clientDoc.data() };
        const timeZone = client.timezone || 'Etc/UTC';
        
        // Get the current time in the client's timezone
        const nowInClientTimezone = new Date(new Date().toLocaleString('en-US', { timeZone }));

        // Check for scheduled announcements for THIS client
        const scheduledAnnouncementsQuery = await db.collection('announcements')
            .where('scope', '==', client.id)
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', nowInClientTimezone.toISOString())
            .get();
        
        scheduledAnnouncementsQuery.forEach(doc => {
            batch.update(doc.ref, { status: 'sent', createdAt: new Date().toISOString() });
            
            const announcement = doc.data();
            if (announcement.audience === 'tenant' && announcement.scope !== 'global') {
                const clientTenants = allTenants.filter(t => t.clientId === announcement.scope && t.email && t.hasAccount);
                const fromName = client.name || announcement.senderName;
                
                clientTenants.forEach(tenant => {
                    const mailRef = db.collection('mail').doc();
                    batch.set(mailRef, {
                        to: [tenant.email],
                        message: {
                            subject: `${fromName}: ${announcement.title}`,
                            html: `<p>${announcement.content}</p>`,
                        },
                    });
                });
            }
        });

        // Continue with other notification checks for this client
        const settings = client.notificationSettings;
        if (!settings || !client.hasAccount) continue;

        const today = getStartOfDayInTimezone(new Date(), timeZone);
        const clientTenants = allTenants.filter(t => t.clientId === client.id && t.status === 'active' && t.hasAccount);

        for (const tenant of clientTenants) {
            // Check contract expiry
            if (settings.daysBeforeContractExpiry > 0 && tenant.contractEndDate) {
                const endDate = getStartOfDayInTimezone(new Date(tenant.contractEndDate), timeZone);
                const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                if (diffDays === settings.daysBeforeContractExpiry) {
                    const message = `Hi ${tenant.name.split(' ')[0]}, this is a reminder from ${client.name} that your contract is expiring in ${diffDays} days on ${endDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })}.`;
                    createNotification(batch, tenant, client, "Contract Expiration Reminder", message);
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
                    createNotification(batch, tenant, client, "Upcoming Due Date Reminder", message);
                }
            }

            // On-due date reminder
            if (settings.notifyOnDueDate && anniversaryThisMonth.getTime() === today.getTime()) {
                const balance = calculateTenantBalance(tenant, allPayments, allDues, today);
                if (balance > 0) {
                    const message = `Hi ${tenant.name.split(' ')[0]}, just a friendly reminder from ${client.name} that you have an outstanding balance of ₱${balance.toFixed(2)}. Please let us know if you have any questions. Thank you!`;
                    createNotification(batch, tenant, client, "Outstanding Balance Reminder", message);
                }
            }
        }
    }

    await batch.commit();
}

function createNotification(batch, tenant, client, title, content) {
    if (!tenant.username) return; // Can't send in-app notification without a username

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

    // Also queue an email
    if (tenant.email) {
        const mailRef = db.collection('mail').doc();
        batch.set(mailRef, {
            to: [tenant.email],
            message: {
                subject: `${client.name}: ${title}`,
                html: `<p>${content}</p>`,
            },
        });
    }
}

module.exports = { runNotificationChecks };
