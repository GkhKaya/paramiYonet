"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRecurringPayments = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
admin.initializeApp();
const db = admin.firestore();
// TransactionType enum'ının bir kopyası,
// çünkü client-side modelleri import edemiyoruz.
const TransactionType = {
    INCOME: "income",
    EXPENSE: "expense",
};
// calculateNextPaymentDate helper function
const calculateNextPaymentDate = (currentDate, frequency) => {
    const next = new Date(currentDate);
    switch (frequency) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;
    }
    return next;
};
exports.processRecurringPayments = (0, scheduler_1.onSchedule)("every day 05:00", async (event) => {
    logger.info("Scheduled recurring payment processing job started.", { event });
    const now = new Date();
    const paymentsRef = db.collection("recurringPayments");
    const q = paymentsRef
        .where("isActive", "==", true)
        .where("autoCreateTransaction", "==", true)
        .where("nextPaymentDate", "<=", now);
    try {
        const querySnapshot = await q.get();
        if (querySnapshot.empty) {
            logger.info("No due payments found.");
            return;
        }
        logger.info(`Found ${querySnapshot.size} due payment(s) to process.`);
        const promises = querySnapshot.docs.map(async (paymentDoc) => {
            var _a;
            const payment = paymentDoc.data();
            const paymentId = paymentDoc.id;
            const batch = db.batch();
            const accountRef = db.collection("accounts").doc(payment.accountId);
            let currentBalance = 0;
            try {
                const accountDoc = await accountRef.get();
                if (!accountDoc.exists) {
                    logger.error(`Account ${payment.accountId} not found for payment ` +
                        `${paymentId}. Skipping.`);
                    return;
                }
                currentBalance = ((_a = accountDoc.data()) === null || _a === void 0 ? void 0 : _a.balance) || 0;
            }
            catch (error) {
                logger.error(`Error fetching account ${payment.accountId} for payment ` +
                    `${paymentId}`, error);
                return;
            }
            const newBalance = currentBalance - payment.amount;
            batch.update(accountRef, { balance: newBalance });
            const transactionRef = db.collection("transactions").doc();
            const newTransaction = {
                userId: payment.userId,
                accountId: payment.accountId,
                type: TransactionType.EXPENSE,
                amount: payment.amount,
                category: payment.category,
                categoryIcon: payment.categoryIcon,
                date: payment.nextPaymentDate,
                description: `Otomatik ödeme: ${payment.name}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            batch.set(transactionRef, newTransaction);
            const newNextPaymentDate = calculateNextPaymentDate(payment.nextPaymentDate.toDate(), payment.frequency);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const paymentUpdate = {
                lastPaymentDate: payment.nextPaymentDate,
                nextPaymentDate: newNextPaymentDate,
                totalPaid: admin.firestore.FieldValue.increment(payment.amount),
                paymentCount: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            const endDate = payment.endDate ? payment.endDate.toDate() : null;
            if (endDate && newNextPaymentDate > endDate) {
                paymentUpdate.isActive = false;
            }
            batch.update(paymentDoc.ref, paymentUpdate);
            await batch.commit();
            logger.info(`Processed payment ID: ${paymentId} for user ${payment.userId}`);
        });
        await Promise.all(promises);
        logger.info("Recurring payment processing job finished successfully.");
    }
    catch (error) {
        logger.error("Error processing recurring payments:", error);
    }
});
//# sourceMappingURL=index.js.map